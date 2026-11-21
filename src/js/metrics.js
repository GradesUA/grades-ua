const RESIT = "Recurso";
const IMPROVEMENT = "Melhoria";

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
