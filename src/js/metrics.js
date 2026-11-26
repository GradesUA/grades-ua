const RESIT = "Recurso";
const IMPROVEMENT = "Melhoria";
const NORMAL = "Normal";
const SPECIAL = "Especial";

function createTally() {
    return { enrolled: 0, passed: 0 };
}

function addRow(tally, row) {
    if (row.examType === IMPROVEMENT) return;
    if (row.examType !== RESIT) tally.enrolled += 1;
    if (row.passed) tally.passed += 1;
}

function finalize(tally) {
    const passed = Math.min(tally.passed, tally.enrolled);
    const passRate = tally.enrolled > 0 ? passed / tally.enrolled : null;
    return {
        enrolled: tally.enrolled,
        passed,
        failed: tally.enrolled - passed,
        passRate,
        failRate: passRate === null ? null : 1 - passRate,
    };
}

// computes statistics for each course in a set of rows
export function computeCourseStats(rows) {
    const tallies = new Map();
    for (const row of rows) {
        if (!tallies.has(row.course)) tallies.set(row.course, createTally());
        addRow(tallies.get(row.course), row);
    }
    return Array.from(tallies, ([course, tally]) => ({ course, ...finalize(tally) }))
        .filter(stat => stat.enrolled > 0);
}

// computes a time series of pass/fail statistics for a range of academic years
export function computeYearlySeries(rows, fromYear, toYear) {
    const tallies = new Map();
    for (let year = fromYear; year <= toYear; year++) tallies.set(year, createTally());
    for (const row of rows) {
        const tally = tallies.get(row.year);
        if (tally) addRow(tally, row);
    }
    return Array.from(tallies, ([year, tally]) => ({ year, ...finalize(tally) }));
}

// overall statistics for a set of rows (e.g., all courses in a department)
export function computeOverall(rows) {
    const tally = createTally();
    rows.forEach(row => addRow(tally, row));
    return finalize(tally);
}


// Quality & Retention

export function computeSankeyFlow(rows) {
    const enrolments = new Map();

    for (const r of rows) {
        if (r.examType === SPECIAL) continue;

        const key = `${r.studentId}|${r.course}|${r.year}`;
        if (!enrolments.has(key)) {
            enrolments.set(key, {
                anyEvaluated: false,
                passedNormal: false,
                passedResit: false,
            });
        }

        const state = enrolments.get(key);

        if (r.evaluated) {
            state.anyEvaluated = true;
        }

        if (r.examType === RESIT) {
            if (r.passed) state.passedResit = true;
        } else if (r.examType === NORMAL) {
            if (r.approved) state.passedNormal = true;
        }
    }

    if (enrolments.size === 0) return { nodes: [], links: [] };

    let attended = 0;
    let dropout = 0;
    let passNormal = 0;
    let recurso = 0;
    let passRecurso = 0;
    let finalFailure = 0;

    for (const state of enrolments.values()) {
        if (!state.anyEvaluated) {
            dropout++;
        } else {
            attended++;

            if (state.passedNormal) {
                passNormal++;
            } else {
                recurso++;

                if (state.passedResit) {
                    passRecurso++;
                } else {
                    finalFailure++;
                }
            }
        }
    }

    const nodes = [
        { name: "Total Enrolled" },        // 0
        { name: "Attended / Evaluated" },  // 1
        { name: "Unassessed / Dropouts" }, // 2
        { name: "Pass Normal" },           // 3
        { name: "Resit" },               // 4
        { name: "Pass Resit" },          // 5
        { name: "Final Failure" },         // 6
    ];

    const rawLinks = [
        { source: 0, target: 1, value: attended },
        { source: 0, target: 2, value: dropout },
        { source: 1, target: 3, value: passNormal },
        { source: 1, target: 4, value: recurso },
        { source: 4, target: 5, value: passRecurso },
        { source: 4, target: 6, value: finalFailure },
    ];

    return {
        nodes,
        links: rawLinks.filter(l => l.value > 0),
    };
}

// Course Regence
export function computeDivergingEquity(rows, groupField = "regime") {
    const enrolments = new Map();

    for (const r of rows) {
        if (r.examType === SPECIAL) continue;

        const key = `${r.studentId}|${r.course}|${r.year}`;
        if (!enrolments.has(key)) {
            enrolments.set(key, {
                group: r[groupField] || "Unknown",
                passed: false,
            });
        }
        if (r.approved) {
            enrolments.get(key).passed = true;
        }
    }

    const groups = new Map();
    for (const item of enrolments.values()) {
        if (!groups.has(item.group)) {
            groups.set(item.group, { label: item.group, total: 0, passed: 0 });
        }
        const g = groups.get(item.group);
        g.total += 1;
        if (item.passed) g.passed += 1;
    }

    return Array.from(groups.values())
        .filter(g => g.total > 0)
        .map(g => {
            const passPct = (g.passed / g.total) * 100;
            return {
                label: g.label,
                total: g.total,
                passed: g.passed,
                failed: g.total - g.passed,
                passPct,
                failPct: 100 - passPct,
            };
        })
        .sort((a, b) => b.total - a.total);
}

export function computeExamOutcomesByYear(rows, selectedYears) {
    const years = (selectedYears && selectedYears.length > 0
        ? [...selectedYears]
        : Array.from(new Set(rows.map(r => r.year)))
    ).sort(d3.ascending);

    const yearKeys = years.map(String);
    const enrolments = new Map();

    for (const r of rows) {
        if (r.examType === SPECIAL) continue;
        const yKey = String(r.year);
        if (!yearKeys.includes(yKey)) continue;

        const key = `${r.studentId}|${r.course}|${r.year}`;
        if (!enrolments.has(key)) {
            enrolments.set(key, {
                year: yKey,
                passedNormal: false,
                passedResit: false,
            });
        }

        const state = enrolments.get(key);
        if (r.examType === RESIT) {
            if (r.passed) state.passedResit = true;
        } else if (r.examType === NORMAL) {
            if (r.approved) state.passedNormal = true;
        }
    }

    const createRow = label => {
        const obj = { label, total: 0 };
        yearKeys.forEach(k => { obj[k] = 0; });
        return obj;
    };

    const categories = {
        normal: createRow("Pass Normal"),
        resit: createRow("Pass Resit"),
        failed: createRow("Failed / Unassessed"),
    };

    for (const state of enrolments.values()) {
        let bucket = categories.failed;
        if (state.passedNormal) {
            bucket = categories.normal;
        } else if (state.passedResit) {
            bucket = categories.resit;
        }

        bucket[state.year] += 1;
        bucket.total += 1;
    }

    return {
        data: [categories.normal, categories.resit, categories.failed],
        keys: yearKeys,
    };
}