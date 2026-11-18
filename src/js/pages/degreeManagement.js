import { loadDepartmentIndex, loadDepartment } from "../dataLoader.js";
import { createStore } from "../state.js";
import { computeCourseStats, computeYearlySeries, computeOverall } from "../metrics.js";
import { createScatterPlot } from "../charts/scatterPlot.js";
import { createLineChart } from "../charts/lineChart.js";
import { escapeHtml, formatPercent } from "../charts/tooltip.js";

const DEFAULT_DEPARTMENT = "deti";
const DEFAULT_DEGREE_PATTERN = /^LICENCIATURA EM ENGENHARIA INFORMÁTICA/;
const MIN_ENROLLED = 5;
const CALLOUT_HINT = "Select a course bubble to compare its historical trend against the degree average.";
const CYCLE_LABELS = { L1: "1st cycle (Bachelor)", M2: "2nd cycle (Master)" };

export function initDegreeManagement() {
    const $ = id => document.getElementById(id);
    const elements = {
        department: $("filter-department"), degree: $("filter-degree"), cycle: $("filter-cycle"),
        yearFrom: $("filter-year-from"), yearTo: $("filter-year-to"), reset: $("btn-reset"),
        scatterBox: $("scatter-chart"), lineBox: $("line-chart"),
        courseBadge: $("course-count-badge"), scatterFooter: $("scatter-footer"),
        lineTitle: $("line-title"), kpiValue: $("kpi-value"), kpiLabel: $("kpi-label"), callout: $("trend-callout"),
        scatterStatus: $("scatter-status"),
    };

    const store = createStore({
        department: DEFAULT_DEPARTMENT, degree: "", cycle: "", yearFrom: null, yearTo: null, selectedCourse: null,
    });

    const scatter = createScatterPlot(elements.scatterBox, {
        onSelect: course => store.set({ selectedCourse: course }),
    });
    const line = createLineChart(elements.lineBox);

    let departments = [];
    let departmentRows = [];
    let latestRequest = 0;

    // Filter population

    const setOptions = (select, options, value) => {
        d3.select(select).selectAll("option").data(options, d => d.value).join("option")
            .attr("value", d => d.value).text(d => d.label);
        select.value = value;
    };

    function populateDegrees(preferred) {
        const { cycle } = store.get();
        const counts = d3.rollup(departmentRows.filter(r => !cycle || r.cycle === cycle), v => v.length, r => r.degree);
        const degrees = Array.from(counts.keys()).sort(d3.ascending);
        const options = [{ value: "", label: "All degrees" }, ...degrees.map(d => ({ value: d, label: d }))];
        const fallback = degrees.find(d => DEFAULT_DEGREE_PATTERN.test(d))
            ?? d3.greatest(degrees, d => counts.get(d)) ?? "";
        const degree = degrees.includes(preferred) ? preferred : fallback;
        setOptions(elements.degree, options, degree);
        return degree;
    }

    function populateCycles() {
        const cycles = Array.from(new Set(departmentRows.map(r => r.cycle))).sort(d3.ascending);
        setOptions(elements.cycle, [{ value: "", label: "All cycles" },
            ...cycles.map(c => ({ value: c, label: CYCLE_LABELS[c] ?? c }))], "");
    }

    function populateYears(preferredFrom, preferredTo) {
        const [minYear, maxYear] = d3.extent(departmentRows, r => r.year);
        const years = d3.range(minYear, maxYear + 1).map(y => ({ value: String(y), label: String(y) }));
        const from = preferredFrom >= minYear && preferredFrom <= maxYear ? preferredFrom : minYear;
        const to = preferredTo >= minYear && preferredTo <= maxYear ? preferredTo : maxYear;
        setOptions(elements.yearFrom, years, String(from));
        setOptions(elements.yearTo, years, String(to));
        return { yearFrom: from, yearTo: to };
    }

    async function changeDepartment(departmentId, { keepRange = true } = {}) {
        const requestId = ++latestRequest;
        elements.scatterStatus.textContent = "Loading department data…";
        elements.scatterStatus.hidden = false;
        try {
            const rows = await loadDepartment(departmentId);
            if (requestId !== latestRequest) return; // a newer request superseded this one
            departmentRows = rows;
            elements.department.value = departmentId;
            populateCycles();
            const degree = populateDegrees(keepRange ? store.get().degree : "");
            const range = populateYears(keepRange ? store.get().yearFrom : null, keepRange ? store.get().yearTo : null);
            elements.scatterStatus.hidden = true;
            store.set({ department: departmentId, cycle: "", degree, selectedCourse: null, ...range });
            refresh();
        } catch (error) {
            if (requestId !== latestRequest) return;
            console.error(error);
            elements.scatterStatus.textContent = "Could not load this department's data. Is the dataset in data/departments/?";
        }
    }

    // Rendering

    function filteredRows() {
        const { degree, cycle, yearFrom, yearTo } = store.get();
        return departmentRows.filter(r => (!degree || r.degree === degree)
            && (!cycle || r.cycle === cycle) && r.year >= yearFrom && r.year <= yearTo);
    }

    function refresh() {
        if (departmentRows.length === 0) return;
        const state = store.get();
        const rows = filteredRows();
        const stats = computeCourseStats(rows).filter(s => s.enrolled >= MIN_ENROLLED);

        if (state.selectedCourse && !stats.some(s => s.course === state.selectedCourse)) {
            store.set({ selectedCourse: null });
            return; // the store update triggers refresh again
        }

        const median = d3.median(stats, s => s.enrolled) ?? 0;
        const critical = stats.filter(s => s.failRate >= 0.5 && s.enrolled >= median).length;
        elements.courseBadge.textContent = `${stats.length} COURSE UNITS`;
        elements.scatterFooter.textContent = `${stats.length} course units · ${critical} critical · median volume ${Math.round(median)} students · units with fewer than ${MIN_ENROLLED} enrolments hidden`;
        scatter.update(stats, state.selectedCourse);

        renderTrend(rows, stats, state);
    }

    function renderTrend(rows, stats, state) {
        const { yearFrom, yearTo, selectedCourse, degree } = state;
        const degreeLabel = degree ? "Degree average" : "Department average";
        const degreePoints = computeYearlySeries(rows, yearFrom, yearTo);
        const coursePoints = selectedCourse
            ? computeYearlySeries(rows.filter(r => r.course === selectedCourse), yearFrom, yearTo) : null;

        elements.lineTitle.textContent = `Longitudinal Pass Rate (${yearFrom}-${yearTo})`;
        line.update({
            fromYear: yearFrom, toYear: yearTo,
            degree: { label: degreeLabel, points: degreePoints },
            course: coursePoints ? { label: selectedCourse, points: coursePoints } : null,
        });

        const shown = coursePoints ?? degreePoints;
        const latest = [...shown].reverse().find(p => p.passRate !== null);
        elements.kpiValue.textContent = latest ? `${Math.round(latest.passRate * 100)}%` : "-";
        elements.kpiLabel.textContent = latest
            ? `${selectedCourse ?? degreeLabel} · ${latest.year}` : "No data in the selected range";

        const overall = computeOverall(rows);
        if (selectedCourse) {
            const stat = stats.find(s => s.course === selectedCourse);
            const delta = (stat.passRate - overall.passRate) * 100;
            elements.callout.className = "callout active";
            elements.callout.innerHTML = `<strong>${escapeHtml(selectedCourse)}</strong>: ${formatPercent(stat.failRate)} failure rate across
                ${stat.enrolled} enrolments, <b>${Math.abs(delta).toFixed(1)} pts ${delta < 0 ? "below" : "above"}</b> the
                ${degreeLabel.toLowerCase()} pass rate (${formatPercent(overall.passRate)}).`;
        } else {
            elements.callout.className = "callout";
            elements.callout.textContent = CALLOUT_HINT;
        }
    }

    // Events

    elements.department.addEventListener("change", () => changeDepartment(elements.department.value, { keepRange: true }));

    elements.cycle.addEventListener("change", () => {
        store.set({ cycle: elements.cycle.value });
        const degree = populateDegrees(store.get().degree);
        store.set({ degree, selectedCourse: null });
        refresh();
    });

    elements.degree.addEventListener("change", () => {
        store.set({ degree: elements.degree.value, selectedCourse: null });
        refresh();
    });

    function onYearChange(changed) {
        let from = +elements.yearFrom.value;
        let to = +elements.yearTo.value;
        if (from > to) { // keep the range valid by moving the other end
            if (changed === "from") to = from; else from = to;
            elements.yearFrom.value = String(from);
            elements.yearTo.value = String(to);
        }
        store.set({ yearFrom: from, yearTo: to });
        refresh();
    }
    elements.yearFrom.addEventListener("change", () => onYearChange("from"));
    elements.yearTo.addEventListener("change", () => onYearChange("to"));

    elements.reset.addEventListener("click", () => {
        store.set({ selectedCourse: null });
        changeDepartment(DEFAULT_DEPARTMENT, { keepRange: false });
    });

    // Selection is the only state change that does not go through a filter handler.
    const unsubscribe = store.subscribe((state, changed) => {
        if (changed.length === 1 && changed[0] === "selectedCourse") refresh();
    });

    // Bootstrap

    loadDepartmentIndex().then(index => {
        departments = index;
        setOptions(elements.department,
            departments.map(d => ({ value: d.id, label: `${d.id.toUpperCase()} - ${d.name}` })), DEFAULT_DEPARTMENT);
        return changeDepartment(DEFAULT_DEPARTMENT, { keepRange: false });
    }).catch(error => {
        console.error(error);
        elements.scatterStatus.textContent = "Could not load the department index. Run `python clean.py` first.";
        elements.scatterStatus.hidden = false;
    });

    return () => { unsubscribe(); latestRequest++; };
}
