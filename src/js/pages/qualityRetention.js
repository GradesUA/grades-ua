import { loadDepartmentIndex, loadDepartment } from "../dataLoader.js";
import { createStore } from "../state.js";
import { computeSankeyFlow, computeDivergingEquity } from "../metrics.js";
import { createSankeyChart } from "../charts/sankeyChart.js";
import { createDivergingBarChart } from "../charts/divergingBarChart.js";
import { t } from "../i18n.js";
import { onSettingsChange } from "../settings.js";

const DEFAULT_DEPARTMENT = "deti";
const DEFAULT_METRIC = "regime";

const METRICS = ["regime", "accessType"];
const metricOptions = () => METRICS.map(value => ({ value, label: t(`qr.metric.${value}`) }));
const groupLabel = label => label === "Unknown" ? t("common.unknown") : label;

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
            { value: "", label: t("common.allYears") },
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
        elements.sankeyBadge.textContent = selectedGroup ? groupLabel(selectedGroup).toUpperCase() : t("qr.allEnrolments");
        elements.sankeyBadge.title = selectedGroup ? groupLabel(selectedGroup) : "";
        elements.sankeyFooter.textContent = selectedGroup
            ? t("qr.footerGroup", { shown, all, group: groupLabel(selectedGroup) })
            : t("qr.footerAll", { all });

        if (elements.divergingFooter) {
            elements.divergingFooter.textContent = t("qr.divergingFooter", { n: equityData.length, metric: t(`qr.metric.${metric}`) });
        }
    }

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
        setOptions(elements.metric, metricOptions(), DEFAULT_METRIC);
        store.set({ metric: DEFAULT_METRIC, selectedGroup: null });
        changeDepartment(DEFAULT_DEPARTMENT, { keepFilters: false });
    });

    // option labels and chart strings follow the language, chart colors the theme
    const offSettings = onSettingsChange(() => {
        setOptions(elements.metric, metricOptions(), store.get().metric);
        if (departmentRows.length === 0) return;
        populateYears(store.get().year);
        refresh();
    });

    elements.sankeyBadge.textContent = t("qr.allEnrolments");
    setOptions(elements.metric, metricOptions(), DEFAULT_METRIC);

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
        offSettings();
        diverging.destroy();
    };
}