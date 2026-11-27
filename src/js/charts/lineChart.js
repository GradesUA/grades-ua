import { tooltip, escapeHtml, formatPercent } from "./tooltip.js";

const MARGIN = { top: 12, right: 24, bottom: 32, left: 48 };
const DEGREE_COLOR = "#102A43";

// logic for the line chart is in src/js/metrics.js, this file is only for rendering
export function createLineChart(container) {
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
        const t = svg.transition().duration(400);

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
            g.select("path").attr("stroke", d.color)
                .attr("stroke-dasharray", d.dashed ? "6 4" : null)
                .transition(t).attr("d", line(d.points));
            g.selectAll("circle").data(d.points.filter(p => p.passRate !== null), p => p.year).join("circle")
                .attr("r", 3.5).attr("fill", d.color).attr("cx", p => x(p.year)).attr("cy", p => y(p.passRate));
        }).order();

        overlay.attr("x", MARGIN.left).attr("y", MARGIN.top)
            .attr("width", width - MARGIN.left - MARGIN.right).attr("height", height - MARGIN.top - MARGIN.bottom)
            .on("mousemove", event => {
                const [pointerX] = d3.pointer(event);
                const year = Math.min(toYear, Math.max(fromYear, Math.round(x.invert(pointerX))));
                crosshair.style("display", null).attr("x1", x(year)).attr("x2", x(year))
                    .attr("y1", MARGIN.top).attr("y2", height - MARGIN.bottom);

                const rows = seriesList().map(series => ({ series, point: series.points.find(p => p.year === year) }));
                focusGroup.selectAll("circle").data(rows.filter(r => r.point && r.point.passRate !== null), r => r.series.key)
                    .join("circle").attr("r", 6).attr("fill", "#fff").attr("stroke-width", 2.5)
                    .attr("stroke", r => r.series.color).attr("cx", x(year)).attr("cy", r => y(r.point.passRate));

                tooltip.show(`<strong>${year}</strong>` + rows.map(({ series, point }) => `
                    <div><span class="swatch" style="background:${series.color}"></span>${escapeHtml(series.label)}:
                    <b>${point && point.passRate !== null ? formatPercent(point.passRate) : "no data"}</b>
                    ${point && point.enrolled ? `<span class="muted">(${point.enrolled} enrolled)</span>` : ""}</div>`).join(""), event);
            })
            .on("mouseleave", () => {
                crosshair.style("display", "none");
                focusGroup.selectAll("circle").remove();
                tooltip.hide();
            });
    }

    new ResizeObserver(() => render()).observe(container);

    return {
        update(data) {
            current = data;
            render();
        },
    };
}
