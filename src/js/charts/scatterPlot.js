import { tooltip, escapeHtml, formatPercent } from "./tooltip.js";

const MARGIN = { top: 16, right: 24, bottom: 44, left: 52 };
const POINT_COLOR = "#2563EB";
const FAIL_THRESHOLD = 0.5;
const MAX_LABELS = 8;
const LABEL_MAX_CHARS = 28;
const CHAR_WIDTH = 5.8;

// bubble chart of course units, with failure rate on the y-axis and enrolments on the x-axis
export function createScatterPlot(container, { onSelect, onHover = () => {} }) {
    const root = d3.select(container);
    const svg = root.append("svg").attr("class", "chart-svg");
    const quadrant = svg.append("rect").attr("class", "quadrant-critical");
    const quadrantLabel = svg.append("text").attr("class", "quadrant-label").text("CRITICAL BOTTLENECKS");
    const xAxisGroup = svg.append("g").attr("class", "axis");
    const yAxisGroup = svg.append("g").attr("class", "axis");
    const gridGroup = svg.append("g").attr("class", "grid");
    const medianLine = svg.append("line").attr("class", "guide-line");
    const thresholdLine = svg.append("line").attr("class", "guide-line");
    const xTitle = svg.append("text").attr("class", "axis-title").text("Enrolments (student-years)");
    const yTitle = svg.append("text").attr("class", "axis-title").attr("text-anchor", "middle").text("Failure rate");
    const pointsGroup = svg.append("g");
    const labelsGroup = svg.append("g").attr("pointer-events", "none");
    const emptyMessage = svg.append("text").attr("class", "empty-message").attr("text-anchor", "middle")
        .text("No course units match the current filters");

    let currentStats = [];
    let currentSelection = new Map();
    let currentHover = null;

    function applyHover() {
        pointsGroup.classed("is-hovering", currentHover !== null);
        pointsGroup.selectAll("g.point").classed("hovered", d => d.course === currentHover);
        pointsGroup.selectAll("g.point.hovered").raise();
    }

    function render() {
        tooltip.hide(); // points are re-joined on every render, so mouseleave may never fire
        const width = Math.max(container.clientWidth, 280);
        const height = Math.max(container.clientHeight, 240);
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const innerWidth = width - MARGIN.left - MARGIN.right;
        const innerHeight = height - MARGIN.top - MARGIN.bottom;
        const maxVolume = d3.max(currentStats, stat => stat.enrolled) || 1;
        const medianVolume = d3.median(currentStats, stat => stat.enrolled) || 0;

        const x = d3.scaleLinear().domain([0, maxVolume * 1.08]).nice().range([MARGIN.left, MARGIN.left + innerWidth]);
        const y = d3.scaleLinear().domain([0, 1]).range([MARGIN.top + innerHeight, MARGIN.top]);
        const radius = d3.scaleSqrt().domain([0, maxVolume]).range([5, 11]);

        const t = svg.transition().duration(400);

        xAxisGroup.attr("transform", `translate(0,${MARGIN.top + innerHeight})`)
            .transition(t).call(d3.axisBottom(x).ticks(Math.max(width / 90, 3)).tickSizeOuter(0));
        yAxisGroup.attr("transform", `translate(${MARGIN.left},0)`)
            .transition(t).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")).tickSizeOuter(0));
        gridGroup.selectAll("line").data(y.ticks(5)).join("line")
            .attr("x1", MARGIN.left).attr("x2", MARGIN.left + innerWidth)
            .attr("y1", d => y(d)).attr("y2", d => y(d));

        xTitle.attr("x", MARGIN.left + innerWidth / 2).attr("text-anchor", "middle").attr("y", height - 8);
        yTitle.attr("transform", `translate(14,${MARGIN.top + innerHeight / 2}) rotate(-90)`);

        const hasData = currentStats.length > 0;
        emptyMessage.attr("x", MARGIN.left + innerWidth / 2).attr("y", MARGIN.top + innerHeight / 2)
            .style("display", hasData ? "none" : null);
        [quadrant, quadrantLabel, medianLine, thresholdLine].forEach(node => node.style("display", hasData ? null : "none"));

        // critical quadrant: above the failure threshold and right of the median volume
        quadrant.attr("x", x(medianVolume)).attr("y", y(1))
            .attr("width", Math.max(x.range()[1] - x(medianVolume), 0)).attr("height", y(FAIL_THRESHOLD) - y(1));
        quadrantLabel.attr("x", x.range()[1] - 8).attr("y", y(1) + 16).attr("text-anchor", "end");
        medianLine.attr("x1", x(medianVolume)).attr("x2", x(medianVolume)).attr("y1", y(0)).attr("y2", y(1));
        thresholdLine.attr("x1", x.range()[0]).attr("x2", x.range()[1]).attr("y1", y(FAIL_THRESHOLD)).attr("y2", y(FAIL_THRESHOLD));

        const hasSelection = currentSelection.size > 0;
        const sorted = [...currentStats].sort((a, b) => b.enrolled - a.enrolled);

        pointsGroup.selectAll("g.point").data(sorted, d => d.course).join(
            enter => {
                const g = enter.append("g").attr("class", "point")
                    .attr("transform", d => `translate(${x(d.enrolled)},${y(d.failRate)})`)
                    .style("opacity", 0);
                g.append("circle").attr("class", "ring").attr("fill", "none");
                g.append("circle").attr("class", "dot").attr("fill", POINT_COLOR);
                return g;
            },
            update => update,
            exit => exit.transition(t).style("opacity", 0).remove(),
        )
            .on("click", (event, d) => onSelect(d.course))
            .on("mouseenter", (event, d) => {
                onHover(currentSelection.has(d.course) ? d.course : null);
                tooltip.show(
                    `<strong>${escapeHtml(d.course)}</strong>
                     <div>Failure rate: <b>${formatPercent(d.failRate)}</b></div>
                     <div>Pass rate: <b>${formatPercent(d.passRate)}</b></div>
                     <div>Enrolments: <b>${d.enrolled}</b></div>
                     <div class="muted">${currentSelection.has(d.course) ? "Click to remove from" : "Click to add to"} the trend chart</div>`, event);
            })
            .on("mousemove", event => tooltip.move(event))
            .on("mouseleave", () => { tooltip.hide(); onHover(null); })
            .each(function (d) {
                const color = currentSelection.get(d.course);
                const g = d3.select(this);
                g.classed("selected", !!color);
                g.select(".dot").attr("r", radius(d.enrolled)).attr("fill", color ?? POINT_COLOR)
                    .attr("fill-opacity", color ? 0.9 : hasSelection ? 0.18 : 0.75);
                g.select(".ring").attr("r", radius(d.enrolled) + 4).style("stroke", color ?? null)
                    .style("display", color ? null : "none");
            })
            .transition(t)
            .attr("transform", d => `translate(${x(d.enrolled)},${y(d.failRate)})`)
            .style("opacity", 1);

        pointsGroup.selectAll("g.point.selected").raise();
        applyHover();
        renderLabels(x, y, radius, medianVolume, width, height);
    }

    function renderLabels(x, y, radius, medianVolume, width, height) {
        const priority = currentStats
            .filter(stat => currentSelection.has(stat.course)
                || (stat.failRate >= FAIL_THRESHOLD && stat.enrolled >= medianVolume))
            .sort((a, b) => currentSelection.has(b.course) - currentSelection.has(a.course)
                || b.failRate * b.enrolled - a.failRate * a.enrolled);

        const occupied = currentStats.map(stat => ({
            x0: x(stat.enrolled) - radius(stat.enrolled), x1: x(stat.enrolled) + radius(stat.enrolled),
            y0: y(stat.failRate) - radius(stat.enrolled), y1: y(stat.failRate) + radius(stat.enrolled),
            course: stat.course,
        }));
        const overlaps = (box, ownCourse) => occupied.some(other => other.course !== ownCourse
            && box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0);

        const placed = [];
        for (const stat of priority) {
            if (placed.length >= MAX_LABELS && !currentSelection.has(stat.course)) break;
            const text = stat.course.length > LABEL_MAX_CHARS ? `${stat.course.slice(0, LABEL_MAX_CHARS - 1)}…` : stat.course;
            const w = text.length * CHAR_WIDTH;
            const r = radius(stat.enrolled);
            const px = x(stat.enrolled);
            const py = y(stat.failRate);
            const candidates = [
                { ax: px + r + 4, anchor: "start", cx0: px + r + 4, cy: py },
                { ax: px - r - 4, anchor: "end", cx0: px - r - 4 - w, cy: py },
                { ax: px, anchor: "middle", cx0: px - w / 2, cy: py - r - 8 },
                { ax: px, anchor: "middle", cx0: px - w / 2, cy: py + r + 12 },
            ];
            for (const c of candidates) {
                const box = { x0: c.cx0, x1: c.cx0 + w, y0: c.cy - 7, y1: c.cy + 5 };
                const inside = box.x0 >= MARGIN.left && box.x1 <= width - 4 && box.y0 >= 4 && box.y1 <= height - MARGIN.bottom;
                if (inside && !overlaps(box, stat.course)) {
                    occupied.push({ ...box, course: null });
                    placed.push({ text, x: c.ax, y: c.cy + 3, anchor: c.anchor, course: stat.course });
                    break;
                }
            }
        }

        labelsGroup.selectAll("text").data(placed, d => d.course).join("text")
            .attr("class", d => `point-label${currentSelection.has(d.course) ? " active" : ""}`)
            .attr("x", d => d.x).attr("y", d => d.y).attr("text-anchor", d => d.anchor)
            .text(d => d.text);
    }

    new ResizeObserver(() => render()).observe(container);

    return {
        update(stats, selection = new Map()) {
            currentStats = stats;
            currentSelection = selection;
            render();
        },
        highlight(course) {
            currentHover = course;
            applyHover();
        },
        medianVolume: () => d3.median(currentStats, stat => stat.enrolled) || 0,
    };
}
