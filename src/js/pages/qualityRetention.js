import { loadDepartmentIndex, loadDepartment } from "../dataLoader.js";
import { createStore } from "../state.js";
import { computeSankeyFlow } from "../metrics.js";
import { createSankeyChart } from "../charts/sankeyChart.js";

const DEFAULT_DEPARTMENT = "deti";

export function initQualityRetention() {
    const $ = id => document.getElementById(id);
    const elements = {
        department: $("filter-department"),
        year: $("filter-year"),
        reset: $("btn-reset"),
        sankeyBox: $("sankey-chart"),
    };

    const store = createStore({
        department: DEFAULT_DEPARTMENT,
        year: "",
    });

    const sankey = createSankeyChart(elements.sankeyBox);

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
        const flowData = computeSankeyFlow(rows);
        sankey.update(flowData);
    }

    elements.department.addEventListener("change", () => {
        changeDepartment(elements.department.value, { keepFilters: true });
    });

    elements.year.addEventListener("change", () => {
        store.set({ year: elements.year.value });
        refresh();
    });

    elements.reset.addEventListener("click", () => {
        changeDepartment(DEFAULT_DEPARTMENT, { keepFilters: false });
    });

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
    };
}