import { loadDepartmentIndex, loadDepartment } from "../dataLoader.js";
import { createStore } from "../state.js";
import { computeSankeyFlow, computeDivergingEquity } from "../metrics.js";
import { createSankeyChart } from "../charts/sankeyChart.js";
import { createDivergingBarChart } from "../charts/divergingBarChart.js";

const DEFAULT_DEPARTMENT = "deti";
const DEFAULT_METRIC = "regime";

const METRIC_OPTIONS = [
    { value: "regime", label: "Study Regime" },
    { value: "accessType", label: "Access Type" },
];

export function initQualityRetention() {
    const $ = id => document.getElementById(id);
    const elements = {
        department: $("filter-department"),
        year: $("filter-year"),
        metric: $("filter-metric"),
        reset: $("btn-reset"),
        sankeyBox: $("sankey-chart"),
        divergingBox: $("diverging-chart"),
        divergingFooter: $("diverging-footer"),
        sankeyBadge: $("sankey-badge"),
        sankeyFooter: $("sankey-footer"),
    };

    const store = createStore({
        department: DEFAULT_DEPARTMENT,
        year: "",
        metric: DEFAULT_METRIC,
        selectedGroup: null,
    });

    const sankey = createSankeyChart(elements.sankeyBox);
    // clicking a group bar narrows the outcome flow to that group's enrolments
    const diverging = createDivergingBarChart(elements.divergingBox, {
        onSelect: label => {
            store.set({ selectedGroup: label });
            refresh();
        },
    });

    let departmentRows = [];
    let latestRequest = 0;

    const setOptions = (select, options, value) => {
        d3.select(select)
            .selectAll("option")
            .data(options, d => d.value)
            .join("option")
            .attr("value", d => d.value)
            .text(d => d.label);
        select.value = value;
    };

    function populateYears(preferredYear) {
        const years = Array.from(new Set(departmentRows.map(r => r.year)))
            .sort(d3.descending);

        const options = [
            { value: "", label: "All academic years" },
            ...years.map(y => ({ value: String(y), label: `${y}/${y + 1}` })),
        ];

        const year = years.map(String).includes(preferredYear) ? preferredYear : "";
        setOptions(elements.year, options, year);
        return year;
    }

    async function changeDepartment(departmentId, { keepFilters = true } = {}) {
        const requestId = ++latestRequest;
        try {
            const rows = await loadDepartment(departmentId);
            if (requestId !== latestRequest) return;

            departmentRows = rows;
            elements.department.value = departmentId;
            const year = populateYears(keepFilters ? store.get().year : "");

            store.set({ department: departmentId, year, selectedGroup: null });
            refresh();
        } catch (error) {
            if (requestId !== latestRequest) return;
            console.error(error);
        }
    }

    function filteredRows() {
        const { year } = store.get();
        return departmentRows.filter(r => !year || String(r.year) === year);
    }

    function refresh() {
        if (departmentRows.length === 0) return;
        const rows = filteredRows();
        const { metric } = store.get();

        const equityData = computeDivergingEquity(rows, metric);
        // a group can disappear when the year changes
        let { selectedGroup } = store.get();
        if (selectedGroup && !equityData.some(d => d.label === selectedGroup)) {
            selectedGroup = null;
            store.set({ selectedGroup });
        }
        diverging.update(equityData, selectedGroup);

        const flowData = computeSankeyFlow(rows, selectedGroup ? { field: metric, label: selectedGroup } : null);
        sankey.update(flowData);

        const shown = d3.sum(flowData.links.filter(l => l.source === 0), l => l.value);
        const all = d3.sum(equityData, d => d.total);
        elements.sankeyBadge.textContent = selectedGroup ? selectedGroup.toUpperCase() : "ALL ENROLMENTS";
        elements.sankeyBadge.title = selectedGroup ?? "";
        elements.sankeyFooter.textContent = selectedGroup
            ? `${shown} of ${all} enrolments (${selectedGroup}) · click the group again to show everyone`
            : `${all} enrolments · click a group in the equity chart to see its flow`;

        if (elements.divergingFooter) {
            const metricLabel = METRIC_OPTIONS.find(m => m.value === metric)?.label ?? metric;
            elements.divergingFooter.textContent = `Comparing ${equityData.length} groups by ${metricLabel}`;
        }
    }

    // Events
    elements.department.addEventListener("change", () => {
        changeDepartment(elements.department.value, { keepFilters: true });
    });

    elements.year.addEventListener("change", () => {
        store.set({ year: elements.year.value });
        refresh();
    });

    elements.metric.addEventListener("change", () => {
        store.set({ metric: elements.metric.value, selectedGroup: null });
        refresh();
    });

    elements.reset.addEventListener("click", () => {
        setOptions(elements.metric, METRIC_OPTIONS, DEFAULT_METRIC);
        store.set({ metric: DEFAULT_METRIC, selectedGroup: null });
        changeDepartment(DEFAULT_DEPARTMENT, { keepFilters: false });
    });

    // Bootstrap
    setOptions(elements.metric, METRIC_OPTIONS, DEFAULT_METRIC);

    loadDepartmentIndex()
        .then(index => {
            setOptions(
                elements.department,
                index.map(d => ({ value: d.id, label: `${d.id.toUpperCase()} - ${d.name}` })),
                DEFAULT_DEPARTMENT
            );
            return changeDepartment(DEFAULT_DEPARTMENT, { keepFilters: false });
        })
        .catch(error => console.error(error));

    return () => {
        latestRequest++;
        diverging.destroy();
    };
}