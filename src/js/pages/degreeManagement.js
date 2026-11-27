import { loadDepartmentIndex, loadDepartment } from "../dataLoader.js";
import { createStore } from "../state.js";
import { computeCourseStats, computeYearlySeries, computeOverall } from "../metrics.js";
import { createScatterPlot } from "../charts/scatterPlot.js";
import { createLineChart } from "../charts/lineChart.js";
import { escapeHtml, formatPercent } from "../charts/tooltip.js";

const DEFAULT_DEPARTMENT = "deti";
const DEFAULT_DEGREE_PATTERN = /^LICENCIATURA EM ENGENHARIA INFORMÁTICA/;
const MIN_ENROLLED = 5;
const CALLOUT_HINT = "Search or click course bubbles to compare their historical trends against the degree average.";
const SERIES_COLORS = ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac"];
const MAX_COURSES = SERIES_COLORS.length;
const NO_COURSES = [];
const fold = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const CYCLE_LABELS = { L1: "1st cycle (Bachelor)", M2: "2nd cycle (Master)" };
const DEFAULT_PHASE = "all";
const PHASE_OPTIONS = [
    { value: "all", label: "Any period (final result)" },
    { value: "resit", label: "Normal + Resit" },
    { value: "normal", label: "Normal only" },
];
const PHASE_SHORT = { all: "any period", resit: "normal + resit", normal: "normal only" };

export function initDegreeManagement() {
    const $ = id => document.getElementById(id);
    const elements = {
        department: $("filter-department"), degree: $("filter-degree"), cycle: $("filter-cycle"),
        yearFrom: $("filter-year-from"), yearTo: $("filter-year-to"), phase: $("filter-phase"), reset: $("btn-reset"),
        scatterBox: $("scatter-chart"), lineBox: $("line-chart"),
        courseBadge: $("course-count-badge"), scatterFooter: $("scatter-footer"),
        lineTitle: $("line-title"), kpiValue: $("kpi-value"), kpiLabel: $("kpi-label"), callout: $("trend-callout"),
        scatterStatus: $("scatter-status"),
        search: $("course-search"), searchInput: $("course-search-input"), searchOptions: $("course-search-options"),
        chips: $("course-chips"),
    };

    const store = createStore({
        department: DEFAULT_DEPARTMENT, degree: "", cycle: "", yearFrom: null, yearTo: null, selectedCourses: NO_COURSES,
        phase: DEFAULT_PHASE,
    });

    const scatter = createScatterPlot(elements.scatterBox, {
        onSelect: course => toggleCourse(course),
        onHover: course => setHover(course),
    });
    const line = createLineChart(elements.lineBox, { onHover: course => setHover(course) });

    let departments = [];
    let departmentRows = [];
    let latestRequest = 0;
    let currentStats = [];
    let activeOption = -1;
    let hoveredCourse = null;

    // one hovered course is highlighted in the scatter, the lines, the tags and the callout at once
    function setHover(course, force = false) {
        const next = store.get().selectedCourses.some(s => s.course === course) ? course : null;
        if (next === hoveredCourse && !force) return; // the line chart reports on every mousemove
        hoveredCourse = next;
        scatter.highlight(hoveredCourse);
        line.highlight(hoveredCourse);
        const dim = d => hoveredCourse !== null && d.course !== hoveredCourse;
        d3.select(elements.chips).selectAll(".course-chip").classed("dimmed", dim);
        d3.select(elements.callout).selectAll(".callout-row").classed("dimmed", dim);
    }

    // selection keeps each course's color until it is removed, so survivors never repaint
    function toggleCourse(course) {
        const selected = store.get().selectedCourses;
        if (selected.some(s => s.course === course)) {
            store.set({ selectedCourses: selected.filter(s => s.course !== course) });
        } else if (selected.length < MAX_COURSES) {
            const used = new Set(selected.map(s => s.color));
            const color = SERIES_COLORS.find(c => !used.has(c));
            store.set({ selectedCourses: [...selected, { course, color }] });
        }
    }

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
            store.set({ department: departmentId, cycle: "", degree, selectedCourses: NO_COURSES, ...range });
            refresh();
        } catch (error) {
            if (requestId !== latestRequest) return;
            console.error(error);
            elements.scatterStatus.textContent = "Could not load this department's data. Is the dataset in data/departments/?";
        }
    }

    function filteredRows() {
        const { degree, cycle, yearFrom, yearTo } = store.get();
        return departmentRows.filter(r => (!degree || r.degree === degree)
            && (!cycle || r.cycle === cycle) && r.year >= yearFrom && r.year <= yearTo);
    }

    function refresh() {
        if (departmentRows.length === 0) return;
        const state = store.get();
        const rows = filteredRows();
        const stats = computeCourseStats(rows, state.phase).filter(s => s.enrolled >= MIN_ENROLLED);

        currentStats = stats;

        const visible = new Set(stats.map(s => s.course));
        if (state.selectedCourses.some(s => !visible.has(s.course))) {
            store.set({ selectedCourses: state.selectedCourses.filter(s => visible.has(s.course)) });
            return; // the store update triggers refresh again
        }

        const median = d3.median(stats, s => s.enrolled) ?? 0;
        const critical = stats.filter(s => s.failRate >= 0.5 && s.enrolled >= median).length;
        elements.courseBadge.textContent = `${stats.length} COURSE UNITS`;
        elements.scatterFooter.textContent = `${stats.length} course units · passed by ${PHASE_SHORT[state.phase]} · ${critical} critical · median volume ${Math.round(median)} enrolments · units with fewer than ${MIN_ENROLLED} enrolments hidden`;
        scatter.update(stats, new Map(state.selectedCourses.map(s => [s.course, s.color])));

        renderChips(state.selectedCourses);
        renderOptions();
        renderTrend(rows, stats, state);
        setHover(hoveredCourse, true);
    }

    function renderTrend(rows, stats, state) {
        const { yearFrom, yearTo, selectedCourses, degree, phase } = state;
        const degreeLabel = degree ? "Degree average" : "Department average";
        const degreePoints = computeYearlySeries(rows, yearFrom, yearTo, phase);
        const courses = selectedCourses.map(({ course, color }) => ({
            label: course, color,
            points: computeYearlySeries(rows.filter(r => r.course === course), yearFrom, yearTo, phase),
        }));

        elements.lineTitle.textContent = `Longitudinal Pass Rate (${yearFrom}-${yearTo}, ${PHASE_SHORT[phase]})`;
        line.update({ fromYear: yearFrom, toYear: yearTo, degree: { label: degreeLabel, points: degreePoints }, courses });

        // kpi follows the most recently added course, or the average when nothing is selected
        const focus = courses.at(-1);
        const shown = focus ? focus.points : degreePoints;
        const latest = [...shown].reverse().find(p => p.passRate !== null);
        elements.kpiValue.textContent = latest ? `${Math.round(latest.passRate * 100)}%` : "-";
        elements.kpiLabel.textContent = latest
            ? `${focus?.label ?? degreeLabel} · ${latest.year}` : "No data in the selected range";

        const overall = computeOverall(rows, phase);
        if (courses.length === 0) {
            elements.callout.className = "callout";
            elements.callout.textContent = CALLOUT_HINT;
            return;
        }
        elements.callout.className = "callout active";
        elements.callout.innerHTML = selectedCourses.map(({ course, color }) => {
            const stat = stats.find(s => s.course === course);
            const delta = (stat.passRate - overall.passRate) * 100;
            return `<div class="callout-row"><span class="swatch" style="background:${color}"></span>
                <strong>${escapeHtml(course)}</strong>: ${formatPercent(stat.failRate)} failure across ${stat.enrolled} enrolments,
                <b>${Math.abs(delta).toFixed(1)} pts ${delta < 0 ? "below" : "above"}</b> the ${degreeLabel.toLowerCase()}</div>`;
        }).join("") + `<div class="callout-note">${degreeLabel} pass rate: ${formatPercent(overall.passRate)}</div>`;
        d3.select(elements.callout).selectAll(".callout-row").data(selectedCourses)
            .on("mouseenter", (_, d) => setHover(d.course))
            .on("mouseleave", () => setHover(null));
    }

    function renderChips(selected) {
        const chips = d3.select(elements.chips).selectAll("span.course-chip").data(selected, d => d.course).join(enter => {
            const chip = enter.append("span").attr("class", "course-chip");
            chip.append("span").attr("class", "swatch");
            chip.append("span").attr("class", "course-chip-label");
            chip.append("button").attr("type", "button").attr("class", "course-chip-remove")
                .html('<i class="fi fi-br-cross-small"></i>');
            return chip;
        });
        chips.select(".swatch").style("background", d => d.color);
        chips.select(".course-chip-label").text(d => d.course).attr("title", d => d.course);
        chips.on("mouseenter", (_, d) => setHover(d.course)).on("mouseleave", () => setHover(null));
        chips.select(".course-chip-remove").attr("aria-label", d => `Remove ${d.course}`)
            .on("click", (_, d) => toggleCourse(d.course));
        elements.searchInput.disabled = currentStats.length === 0;
    }

    function matchingStats() {
        const query = fold(elements.searchInput.value.trim());
        return currentStats.filter(s => !query || fold(s.course).includes(query))
            .sort((a, b) => d3.ascending(a.course, b.course));
    }

    function renderOptions() {
        const open = elements.search.classList.contains("open");
        elements.searchInput.setAttribute("aria-expanded", String(open));
        if (!open) return;
        const selected = new Map(store.get().selectedCourses.map(s => [s.course, s.color]));
        const full = selected.size >= MAX_COURSES;
        const matches = matchingStats();
        activeOption = Math.min(activeOption, matches.length - 1);

        const box = d3.select(elements.searchOptions);
        box.selectAll("div.course-empty").data(matches.length ? [] : ["No course units match"]).join("div")
            .attr("class", "course-empty").text(d => d);
        box.selectAll("div.course-note").data(full ? [`Up to ${MAX_COURSES} courses, remove one to add another`] : [])
            .join("div").attr("class", "course-note").text(d => d);

        const options = box.selectAll("div.course-option").data(matches, d => d.course).join(enter => {
            const option = enter.append("div").attr("class", "course-option").attr("role", "option");
            option.append("span").attr("class", "swatch");
            option.append("span").attr("class", "course-option-name");
            option.append("span").attr("class", "course-option-meta");
            return option;
        }).order();
        options
            .classed("active", (_, i) => i === activeOption)
            .classed("selected", d => selected.has(d.course))
            .classed("disabled", d => full && !selected.has(d.course))
            .attr("aria-selected", d => selected.has(d.course))
            // mousedown keeps the input focused, so the list stays open for picking several courses
            .on("mousedown", (event, d) => { event.preventDefault(); toggleCourse(d.course); });
        options.select(".swatch").style("background", d => selected.get(d.course) ?? "transparent");
        options.select(".course-option-name").text(d => d.course);
        options.select(".course-option-meta").text(d => `${formatPercent(d.failRate)} fail · ${d.enrolled}`);
        box.selectAll("div.course-note").lower();
    }

    function setSearchOpen(open) {
        elements.search.classList.toggle("open", open);
        if (!open) activeOption = -1;
        renderOptions();
    }

    elements.searchInput.addEventListener("focus", () => setSearchOpen(true));
    elements.searchInput.addEventListener("blur", () => setSearchOpen(false));
    elements.searchInput.addEventListener("input", () => { activeOption = 0; setSearchOpen(true); });
    elements.searchInput.addEventListener("keydown", event => {
        const matches = matchingStats();
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            activeOption = Math.max(0, Math.min(matches.length - 1, activeOption + step));
            setSearchOpen(true);
            elements.searchOptions.querySelector(".course-option.active")?.scrollIntoView({ block: "nearest" });
        } else if (event.key === "Enter" && matches[activeOption]) {
            event.preventDefault();
            toggleCourse(matches[activeOption].course);
        } else if (event.key === "Escape") {
            elements.searchInput.blur();
        }
    });

    elements.department.addEventListener("change", () => changeDepartment(elements.department.value, { keepRange: true }));

    elements.cycle.addEventListener("change", () => {
        store.set({ cycle: elements.cycle.value });
        const degree = populateDegrees(store.get().degree);
        store.set({ degree, selectedCourses: NO_COURSES });
        refresh();
    });

    elements.degree.addEventListener("change", () => {
        store.set({ degree: elements.degree.value, selectedCourses: NO_COURSES });
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
    elements.phase.addEventListener("change", () => {
        store.set({ phase: elements.phase.value });
        refresh();
    });

    elements.yearFrom.addEventListener("change", () => onYearChange("from"));
    elements.yearTo.addEventListener("change", () => onYearChange("to"));

    elements.reset.addEventListener("click", () => {
        setOptions(elements.phase, PHASE_OPTIONS, DEFAULT_PHASE);
        elements.searchInput.value = "";
        store.set({ selectedCourses: NO_COURSES, phase: DEFAULT_PHASE });
        changeDepartment(DEFAULT_DEPARTMENT, { keepRange: false });
    });

    // Selection is the only state change that does not go through a filter handler.
    const unsubscribe = store.subscribe((state, changed) => {
        if (changed.length === 1 && changed[0] === "selectedCourses") refresh();
    });

    // Bootstrap

    setOptions(elements.phase, PHASE_OPTIONS, DEFAULT_PHASE);
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
