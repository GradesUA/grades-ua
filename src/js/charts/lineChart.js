import { tooltip, escapeHtml, formatPercent } from "./tooltip.js";
import { t } from "../i18n.js";

const MARGIN = { top: 12, right: 24, bottom: 32, left: 48 };
const DEGREE_COLOR = "var(--blue)";
const HOVER_DISTANCE = 14;

// logic for the line chart is in src/js/metrics.js, this file is only for rendering
export function createLineChart(container, { onHover = () => {} } = {}) {
    const root = d3.select(container);
    const svg = root.append("svg").attr("class", "chart-svg");
    const gridGroup = svg.append("g").attr("class", "grid");
    const xAxisGroup = svg.append("g").attr("class", "axis");
    const yAxisGroup = svg.append("g").attr("class", "axis");
    const seriesGroup = svg.append("g");
    const crosshair = svg.append("line").attr("class", "crosshair").style("display", "none");
    const focusGroup = svg.append("g").attr("pointer-events", "none");
    const overlay = svg.append("rect").attr("fill", "transparent");

    let current = null;
    let currentHover = null;

    // fade every line except the hovered course
    function applyHover() {
        seriesGroup.classed("is-hovering", currentHover !== null);
        seriesGroup.selectAll("g.series").classed("hovered", d => d.key === currentHover);
        seriesGroup.selectAll("g.series.hovered").raise();
    }

    // course line closest to the pointer
    function nearestCourse(x, y, pointerX, pointerY) {
        const at = x.invert(pointerX);
        let best = null;
        for (const series of seriesList().slice(1)) {
            const before = series.points.find(p => p.year === Math.floor(at));
            const after = series.points.find(p => p.year === Math.ceil(at));
            if (!before || !after || before.passRate === null || after.passRate === null) continue;
            const rate = before.passRate + (after.passRate - before.passRate) * (at - Math.floor(at));
            const distance = Math.abs(y(rate) - pointerY);
            if (distance <= HOVER_DISTANCE && (!best || distance < best.distance)) best = { key: series.key, distance };
        }
        return best?.key ?? null;
    }

    // the average is drawn first so the course lines sit on top of it
    function seriesList() {
        const courses = current.courses ?? [];
        return [
            { key: "__average", color: DEGREE_COLOR, dashed: courses.length > 0, ...current.degree },
            ...courses.map(c => ({ key: c.label, dashed: false, ...c })),
        ];
    }

    function render() {
        if (!current) return;
        const width = Math.max(container.clientWidth, 260);
        const height = Math.max(container.clientHeight, 180);
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const { fromYear, toYear } = current;
        const xDomain = fromYear === toYear ? [fromYear - 0.5, toYear + 0.5] : [fromYear, toYear];
        const x = d3.scaleLinear().domain(xDomain).range([MARGIN.left, width - MARGIN.right]);
        const y = d3.scaleLinear().domain([0, 1]).range([height - MARGIN.bottom, MARGIN.top]);
        const years = d3.range(fromYear, toYear + 1);
        const transition = svg.transition().duration(400);

        gridGroup.selectAll("line").data(y.ticks(5)).join("line")
            .attr("x1", MARGIN.left).attr("x2", width - MARGIN.right)
            .attr("y1", d => y(d)).attr("y2", d => y(d));
        xAxisGroup.attr("transform", `translate(0,${height - MARGIN.bottom})`)
            .call(d3.axisBottom(x).tickValues(years.length > 12 ? years.filter((_, i) => i % 2 === 0) : years)
                .tickFormat(d3.format("d")).tickSizeOuter(0));
        yAxisGroup.attr("transform", `translate(${MARGIN.left},0)`)
            .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")).tickSizeOuter(0));

        const line = d3.line().defined(d => d.passRate !== null).x(d => x(d.year)).y(d => y(d.passRate));
        seriesGroup.selectAll("g.series").data(seriesList(), d => d.key).join(
            enter => {
                const g = enter.append("g").attr("class", "series");
                g.append("path").attr("class", "series-line").attr("fill", "none").attr("stroke-width", 2.5);
                return g;
            },
            update => update,
            exit => exit.remove(),
        ).each(function (d) {
            const g = d3.select(this);
            g.select("path").style("stroke", d.color)
                .attr("stroke-dasharray", d.dashed ? "6 4" : null)
                .transition(transition).attr("d", line(d.points));
            g.selectAll("circle").data(d.points.filter(p => p.passRate !== null), p => p.year).join("circle")
                .attr("r", 3.5).style("fill", d.color).attr("cx", p => x(p.year)).attr("cy", p => y(p.passRate));
        }).order();
        applyHover();

        overlay.attr("x", MARGIN.left).attr("y", MARGIN.top)
            .attr("width", width - MARGIN.left - MARGIN.right).attr("height", height - MARGIN.top - MARGIN.bottom)
            .on("mousemove", event => {
                const [pointerX, pointerY] = d3.pointer(event);
                onHover(nearestCourse(x, y, pointerX, pointerY));
                const year = Math.min(toYear, Math.max(fromYear, Math.round(x.invert(pointerX))));
                crosshair.style("display", null).attr("x1", x(year)).attr("x2", x(year))
                    .attr("y1", MARGIN.top).attr("y2", height - MARGIN.bottom);

                const rows = seriesList().map(series => ({ series, point: series.points.find(p => p.year === year) }));
                focusGroup.selectAll("circle").data(rows.filter(r => r.point && r.point.passRate !== null), r => r.series.key)
                    .join("circle").attr("r", 6).style("fill", "var(--white)").attr("stroke-width", 2.5)
                    .style("stroke", r => r.series.color).attr("cx", x(year)).attr("cy", r => y(r.point.passRate));

                tooltip.show(`<strong>${year}</strong>` + rows.map(({ series, point }) => `
                    <div class="${series.key === currentHover ? "tooltip-hovered" : ""}"><span class="swatch" style="background:${series.color}"></span>${escapeHtml(series.label)}:
                    <b>${point && point.passRate !== null ? formatPercent(point.passRate) : t("line.noData")}</b>
                    ${point && point.enrolled ? `<span class="muted">${t("line.enrolled", { n: point.enrolled })}</span>` : ""}</div>`).join(""), event);
            })
            .on("mouseleave", () => {
                crosshair.style("display", "none");
                focusGroup.selectAll("circle").remove();
                tooltip.hide();
                onHover(null);
            });
    }

    new ResizeObserver(() => render()).observe(container);

    return {
        update(data) {
            current = data;
            render();
        },
        highlight(course) {
            currentHover = course;
            applyHover();
        },
    };
}
