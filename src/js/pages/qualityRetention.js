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
    };

    const store = createStore({
        department: DEFAULT_DEPARTMENT,
        year: "",
        metric: DEFAULT_METRIC,
    });

    const sankey = createSankeyChart(elements.sankeyBox);
    const diverging = createDivergingBarChart(elements.divergingBox);

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

            store.set({ department: departmentId, year });
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

        const flowData = computeSankeyFlow(rows);
        sankey.update(flowData);

        const equityData = computeDivergingEquity(rows, metric);
        diverging.update(equityData);

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
        store.set({ metric: elements.metric.value });
        refresh();
    });

    elements.reset.addEventListener("click", () => {
        setOptions(elements.metric, METRIC_OPTIONS, DEFAULT_METRIC);
        store.set({ metric: DEFAULT_METRIC });
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