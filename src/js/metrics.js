const NORMAL = "Normal";
const RESIT = "Recurso";
const IMPROVEMENT = "Melhoria";
const PHASE_RANK = { [NORMAL]: 0, [RESIT]: 1, [IMPROVEMENT]: 1 };
const LATER_RANK = 2;

export const PASSED_IN = { NORMAL: "normal", RESIT: "resit", LATER: "later" };

// cumulative pass scopes: which phases count as passed (denominator is always all enrolments)
export const PASS_SCOPES = {
    normal: [PASSED_IN.NORMAL],
    resit: [PASSED_IN.NORMAL, PASSED_IN.RESIT],
    all: [PASSED_IN.NORMAL, PASSED_IN.RESIT, PASSED_IN.LATER],
};

function phaseOf(examType) {
    if (examType === NORMAL) return PASSED_IN.NORMAL;
    if (examType === RESIT || examType === IMPROVEMENT) return PASSED_IN.RESIT;
    return PASSED_IN.LATER;
}

// groups exam attempts into enrolments with their outcome
export function buildEnrolments(rows) {
    const enrolments = new Map();
    for (const row of rows) {
        const key = `${row.studentId}|${row.degree}|${row.course}|${row.year}`;
        let e = enrolments.get(key);
        if (!e) {
            e = {
                studentId: row.studentId, degree: row.degree, course: row.course, year: row.year,
                cycle: row.cycle, regime: row.regime, accessType: row.accessType, departmentId: row.departmentId,
                evaluated: false, satResit: false, finalGrade: 0, passRank: Infinity, passedIn: null,
            };
            enrolments.set(key, e);
        }
        e.finalGrade = Math.max(e.finalGrade, row.grade);
        if (row.evaluated) e.evaluated = true;
        if (row.examType === RESIT) e.satResit = true;
        if (row.approved) {
            const rank = PHASE_RANK[row.examType] ?? LATER_RANK;
            if (rank < e.passRank) {
                e.passRank = rank;
                e.passedIn = phaseOf(row.examType);
            }
        }
    }
    const result = [...enrolments.values()];
    for (const e of result) e.passed = e.passedIn !== null;
    return result;
}

function summarize(enrolments, scope = "all") {
    const phases = PASS_SCOPES[scope];
    const enrolled = enrolments.length;
    const passed = enrolments.reduce((n, e) => n + (phases.includes(e.passedIn) ? 1 : 0), 0);
    const passRate = enrolled > 0 ? passed / enrolled : null;
    return {
        enrolled,
        passed,
        failed: enrolled - passed,
        passRate,
        failRate: passRate === null ? null : 1 - passRate,
    };
}

// pass/fail statistics for each course in a set of rows
export function computeCourseStats(rows, scope = "all") {
    const byCourse = d3.group(buildEnrolments(rows), e => e.course);
    return Array.from(byCourse, ([course, list]) => ({ course, ...summarize(list, scope) }));
}

// yearly pass/fail statistics for a range of academic years
export function computeYearlySeries(rows, fromYear, toYear, scope = "all") {
    const byYear = d3.group(buildEnrolments(rows), e => e.year);
    return d3.range(fromYear, toYear + 1).map(year => ({ year, ...summarize(byYear.get(year) ?? [], scope) }));
}

// overall statistics for a set of rows (e.g., all courses in a degree)
export function computeOverall(rows, scope = "all") {
    return summarize(buildEnrolments(rows), scope);
}


// quality & retention
export function computeSankeyFlow(rows, group = null) {
    const all = buildEnrolments(rows);
    const enrolments = group ? all.filter(e => (e[group.field] || "Unknown") === group.label) : all;
    if (enrolments.length === 0) return { nodes: [], links: [] };

    let assessed = 0, neverAssessed = 0, passNormal = 0, notNormal = 0;
    let passResit = 0, finalFailure = 0;
    for (const e of enrolments) {
        if (!e.evaluated) { neverAssessed++; continue; }
        assessed++;
        if (e.passedIn === PASSED_IN.NORMAL) { passNormal++; continue; }
        notNormal++;
        if (e.passedIn === PASSED_IN.RESIT) passResit++;
        else finalFailure++; // passes in later periods (dezembro, especial, semestral) land here
    }

    const nodes = [
        { name: "Total Enrolled" }, // 0
        { name: "Attended / Evaluated" }, // 1
        { name: "Unassessed / Dropouts" }, // 2
        { name: "Pass Normal" }, // 3
        { name: "Resit" }, // 4
        { name: "Pass Resit" }, // 5
        { name: "Final Failure" }, // 6
    ];
    const links = [
        { source: 0, target: 1, value: assessed },
        { source: 0, target: 2, value: neverAssessed },
        { source: 1, target: 3, value: passNormal },
        { source: 1, target: 4, value: notNormal },
        { source: 4, target: 5, value: passResit },
        { source: 4, target: 6, value: finalFailure },
    ];
    return { nodes, links: links.filter(l => l.value > 0) };
}

// pass rate per group (e.g., regime, access type, degree)
export function computeDivergingEquity(rows, groupField = "regime") {
    const groups = d3.group(buildEnrolments(rows), e => e[groupField] || "Unknown");
    return Array.from(groups, ([label, list]) => {
        const { enrolled, passed, failed } = summarize(list);
        const passPct = (passed / enrolled) * 100;
        return { label, total: enrolled, passed, failed, passPct, failPct: 100 - passPct };
    }).sort((a, b) => b.total - a.total);
}

// course regence
const OUTCOMES = [
    { label: "Pass Normal", test: e => e.passedIn === PASSED_IN.NORMAL },
    { label: "Pass Resit", test: e => e.passedIn === PASSED_IN.RESIT },
    { label: "Pass Later Period", test: e => e.passedIn === PASSED_IN.LATER },
    { label: "Failed", test: e => e.evaluated && !e.passed },
    { label: "Never Assessed", test: e => !e.evaluated },
];

export function computeExamOutcomesByYear(rows, selectedYears) {
    const enrolments = buildEnrolments(rows);
    const years = (selectedYears && selectedYears.length > 0
        ? [...selectedYears]
        : Array.from(new Set(enrolments.map(e => e.year)))
    ).sort(d3.ascending);
    const yearKeys = years.map(String);
    const yearSet = new Set(yearKeys);

    const data = OUTCOMES.map(({ label }) => {
        const row = { label, total: 0 };
        yearKeys.forEach(k => { row[k] = 0; });
        return row;
    });

    for (const e of enrolments) {
        const yKey = String(e.year);
        if (!yearSet.has(yKey)) continue;
        const bucket = data[OUTCOMES.findIndex(o => o.test(e))];
        bucket[yKey] += 1;
        bucket.total += 1;
    }

    return { data, keys: yearKeys };
}
