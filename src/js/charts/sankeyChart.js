import { tooltip, escapeHtml, formatPercent } from "./tooltip.js";

const MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };
const NODE_COLORS = {
    "Total Enrolled": "#102A43",
    "Attended / Evaluated": "#2563EB",
    "Unassessed / Dropouts": "#94A3B8",
    "Pass Normal": "#16A34A",
    "Resit": "#F59E0B",
    "Pass Resit": "#22C55E",
    "Final Failure": "#DC2626",
};
const DEFAULT_COLOR = "#102A43";

export function createSankeyChart(container) {
    const root = d3.select(container);
    const svg = root.append("svg").attr("class", "chart-svg");
    const linksGroup = svg.append("g").attr("fill", "none");
    const nodesGroup = svg.append("g");
    const labelsGroup = svg.append("g").attr("pointer-events", "none");
    const emptyMessage = svg.append("text")
        .attr("class", "empty-message")
        .attr("text-anchor", "middle")
        .text("No data available for the selected filters");

    let currentData = { nodes: [], links: [] };

    function render() {
        tooltip.hide();
        const width = Math.max(container.clientWidth, 320);
        const height = Math.max(container.clientHeight, 260);
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const hasData = currentData.nodes.length > 0 && currentData.links.length > 0;
        emptyMessage
            .attr("x", width / 2)
            .attr("y", height / 2)
            .style("display", hasData ? "none" : null);

        if (!hasData) {
            linksGroup.selectAll("*").remove();
            nodesGroup.selectAll("*").remove();
            labelsGroup.selectAll("*").remove();
            return;
        }

        const graph = {
            nodes: currentData.nodes.map(d => ({ ...d })),
            links: currentData.links.map(d => ({ ...d })),
        };

        const sankey = d3.sankey()
            .nodeWidth(14)
            .nodePadding(14)
            .extent([[MARGIN.left, MARGIN.top], [width - MARGIN.right, height - MARGIN.bottom]]);

        const { nodes, links } = sankey(graph);
        const totalEnrolled = d3.sum(nodes.filter(n => n.targetLinks.length === 0), n => n.value) || 1;

        linksGroup.selectAll("path")
            .data(links, d => `${d.source.name}-${d.target.name}`)
            .join("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => NODE_COLORS[d.target.name] || DEFAULT_COLOR)
            .attr("stroke-opacity", 0.3)
            .attr("stroke-width", d => Math.max(1, d.width))
            .on("mouseenter", function (event, d) {
                d3.select(this).attr("stroke-opacity", 0.65);
                const share = d.value / d.source.value;
                tooltip.show(
                    `<strong>${escapeHtml(d.source.name)} → ${escapeHtml(d.target.name)}</strong>
                     <div>Enrolments: <b>${d.value}</b></div>
                     <div>Share of source: <b>${formatPercent(share)}</b></div>`,
                    event
                );
            })
            .on("mousemove", event => tooltip.move(event))
            .on("mouseleave", function () {
                d3.select(this).attr("stroke-opacity", 0.3);
                tooltip.hide();
            });

        nodesGroup.selectAll("rect")
            .data(nodes, d => d.name)
            .join("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => Math.max(2, d.y1 - d.y0))
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => NODE_COLORS[d.name] || DEFAULT_COLOR)
            .attr("rx", 2)
            .on("mouseenter", (event, d) => {
                tooltip.show(
                    `<strong>${escapeHtml(d.name)}</strong>
                     <div>Enrolments: <b>${d.value}</b></div>
                     <div>Total share: <b>${formatPercent(d.value / totalEnrolled)}</b></div>`,
                    event
                );
            })
            .on("mousemove", event => tooltip.move(event))
            .on("mouseleave", () => tooltip.hide());

        labelsGroup.selectAll("text")
            .data(nodes, d => d.name)
            .join("text")
            .attr("class", "point-label")
            .attr("x", d => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => (d.x0 < width / 2 ? "start" : "end"))
            .text(d => `${d.name} (${d.value})`);
    }

    new ResizeObserver(() => render()).observe(container);

    return {
        update(data) {
            currentData = data;
            render();
        },
    };
}