import { tooltip, escapeHtml } from "./tooltip.js";

const MARGIN = { top: 28, right: 24, bottom: 24, left: 310 };
const COLOR_LEFT = "#e03030";  // Fail / Unassessed
const COLOR_RIGHT = "#22C55E"; // Approved

function halfRoundedBarPath(x, y, width, height, radius, side) {
    if (width <= 0) return "";
    const r = Math.min(radius, width, height / 2);

    if (side === "left") {
        return `
            M ${x + r},${y}
            H ${x + width}
            V ${y + height}
            H ${x + r}
            Q ${x},${y + height} ${x},${y + height - r}
            V ${y + r}
            Q ${x},${y} ${x + r},${y}
            Z
        `;
    }

    return `
        M ${x},${y}
        H ${x + width - r}
        Q ${x + width},${y} ${x + width},${y + r}
        V ${y + height - r}
        Q ${x + width},${y + height} ${x + width - r},${y + height}
        H ${x}
        Z
    `;
}

export function createDivergingBarChart(container, { onSelect } = {}) {
    let currentData = [];
    let selectedLabel = null;

    const svg = d3.select(container)
        .append("svg")
        .attr("class", "chart-svg");

    const observer = new ResizeObserver(() => render());
    observer.observe(container);

    function render() {
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        if (width <= 0 || height <= 0) return;

        svg.selectAll("*").remove();

        if (!currentData || currentData.length === 0) {
            svg.append("text")
                .attr("class", "empty-message")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("No data available for this selection");
            return;
        }

        const leftMargin = Math.min(MARGIN.left, Math.max(130, width * 0.36));
        const innerW = Math.max(120, width - leftMargin - MARGIN.right);
        const innerH = height - MARGIN.top - MARGIN.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${leftMargin},${MARGIN.top})`);

        const x = d3.scaleLinear()
            .domain([-125, 115])
            .range([0, innerW]);

        const y = d3.scaleBand()
            .domain(currentData.map(d => d.label))
            .range([0, innerH])
            .padding(0.32);

        const barHeight = Math.min(y.bandwidth(), 32);
        const yOffset = (y.bandwidth() - barHeight) / 2;
        const centerX = x(0);

        g.append("text")
            .attr("x", centerX - 8)
            .attr("y", -10)
            .attr("text-anchor", "end")
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .attr("fill", COLOR_LEFT)
            .text("← FAIL / UNASSESSED");

        g.append("text")
            .attr("x", centerX + 8)
            .attr("y", -10)
            .attr("text-anchor", "start")
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .attr("fill", COLOR_RIGHT)
            .text("APPROVED →");

        [-50, 50].forEach(tick => {
            g.append("line")
                .attr("x1", x(tick))
                .attr("x2", x(tick))
                .attr("y1", 0)
                .attr("y2", innerH)
                .attr("stroke", "#EEF2F6")
                .attr("stroke-dasharray", "3 3");
        });

        const hasSelection = selectedLabel !== null;
        const rows = g.selectAll("g.div-row")
            .data(currentData)
            .join("g")
            .attr("class", "div-row")
            .attr("transform", d => `translate(0, ${y(d.label)})`)
            .style("opacity", d => (!hasSelection || d.label === selectedLabel) ? 1 : 0.35);

        rows.filter(d => d.label === selectedLabel)
            .append("rect")
            .attr("x", -leftMargin + 2)
            .attr("y", 2)
            .attr("width", width - 4)
            .attr("height", y.bandwidth() - 4)
            .attr("rx", 6)
            .attr("fill", "#EFF6FF")
            .attr("stroke", "#93C5FD");

        // caption
        const maxLabelWidth = leftMargin - 22;
        rows.append("text")
            .attr("x", -16)
            .attr("y", yOffset + barHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .attr("font-size", "10.5px")
            .attr("font-weight", d => d.label === selectedLabel ? "700" : "600")
            .attr("fill", "#102A43")
            .each(function(d) {
                const textEl = d3.select(this);
                const suffix = ` (${d.total})`;
                let label = d.label;

                textEl.text(label + suffix);
                while (this.getComputedTextLength() > maxLabelWidth && label.length > 3) {
                    label = label.slice(0, -1).trimEnd();
                    textEl.text(`${label}…${suffix}`);
                }
            });

        // left bar
        rows.append("path")
            .attr("d", d => {
                const bx = x(-d.failPct);
                const bw = Math.max(0, centerX - bx);
                return halfRoundedBarPath(bx, yOffset, bw, barHeight, 4, "left");
            })
            .attr("fill", COLOR_LEFT)
            .attr("fill-opacity", 0.9);

        // right bar
        rows.append("path")
            .attr("d", d => {
                const bw = Math.max(0, x(d.passPct) - centerX);
                return halfRoundedBarPath(centerX, yOffset, bw, barHeight, 4, "right");
            })
            .attr("fill", COLOR_RIGHT)
            .attr("fill-opacity", 0.9);

        // left %
        rows.append("text")
            .attr("x", d => x(-d.failPct) - 5)
            .attr("y", yOffset + barHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .attr("fill", COLOR_LEFT)
            .text(d => d.failPct > 0 ? `${Math.round(d.failPct)}%` : "");

        // right %
        rows.append("text")
            .attr("x", d => x(d.passPct) + 5)
            .attr("y", yOffset + barHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .attr("fill", COLOR_RIGHT)
            .text(d => d.passPct > 0 ? `${Math.round(d.passPct)}%` : "");

        // central axis
        g.append("line")
            .attr("x1", centerX)
            .attr("x2", centerX)
            .attr("y1", -4)
            .attr("y2", innerH)
            .attr("stroke", "#102A43")
            .attr("stroke-width", 2);

        // tooltip
        rows.append("rect")
            .attr("x", -leftMargin)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", y.bandwidth())
            .attr("fill", "transparent")
            .style("cursor", onSelect ? "pointer" : "default")
            .on("click", (_, d) => {
                if (!onSelect) return;
                onSelect(selectedLabel === d.label ? null : d.label);
            })
            .on("mouseenter", (event, d) => {
                tooltip.show(
                    `<strong>${escapeHtml(d.label)}</strong>
                    Approved: <b>${d.passPct.toFixed(1)}%</b> (${d.passed})<br>
                    Fail / Unassessed: <b>${d.failPct.toFixed(1)}%</b> (${d.failed})<br>
                    <span class="muted">Total enrolments: ${d.total}${onSelect ? " · Click to filter" : ""}</span>`,
                    event
                );
            })
            .on("mousemove", event => tooltip.move(event))
            .on("mouseleave", () => tooltip.hide());
    }

    return {
        update(data, activeLabel = null) {
            currentData = data;
            selectedLabel = activeLabel;
            render();
        },
        destroy() {
            observer.disconnect();
            tooltip.hide();
        },
    };
}