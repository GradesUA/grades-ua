import { tooltip, escapeHtml } from "./tooltip.js";

const MARGIN = { top: 38, right: 36, bottom: 28, left: 145 };
const PALETTE = ["#2563EB", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#64748B"];

export function createStackedBarChart(container) {
    let current = { data: [], keys: [] };

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

        const { data, keys } = current;
        if (!data || data.length === 0 || keys.length === 0) {
            svg.append("text")
                .attr("class", "empty-message")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("Select a course unit to view exam season results");
            return;
        }

        const innerW = width - MARGIN.left - MARGIN.right;
        const innerH = height - MARGIN.top - MARGIN.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const stackedSeries = d3.stack().keys(keys)(data);

        const maxTotal = d3.max(data, d => d.total) || 1;
        const x = d3.scaleLinear()
            .domain([0, maxTotal * 1.1])
            .nice()
            .range([0, innerW]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerH])
            .padding(0.36);

        const color = d3.scaleOrdinal()
            .domain(keys)
            .range(PALETTE);

        // Legenda dos anos letivos no topo
        const legend = svg.append("g")
            .attr("transform", `translate(${MARGIN.left}, 14)`);

        let legendX = 0;
        keys.forEach(k => {
            const labelText = `${k}/${+k + 1}`;
            const item = legend.append("g")
                .attr("transform", `translate(${legendX}, 0)`);

            item.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("rx", 2)
                .attr("fill", color(k));

            item.append("text")
                .attr("x", 15)
                .attr("y", 9)
                .attr("font-size", "11px")
                .attr("font-weight", "600")
                .attr("fill", "#102A43")
                .text(labelText);

            legendX += labelText.length * 6.8 + 26;
        });

        // Grelha vertical e Eixo X
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisBottom(x).ticks(5).tickSize(innerH).tickFormat(""))
            .call(sel => sel.select(".domain").remove());

        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0, ${innerH})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

        // Rótulos à esquerda (Pass Normal, Pass Resit, Failed / Unassessed)
        g.selectAll("text.cat-label")
            .data(data)
            .join("text")
            .attr("class", "cat-label")
            .attr("x", -12)
            .attr("y", d => y(d.label) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("fill", "#102A43")
            .text(d => d.label);

        const barHeight = Math.min(y.bandwidth(), 38);
        const yOffset = (y.bandwidth() - barHeight) / 2;

        // Barras empilhadas por ano
        const layers = g.selectAll("g.layer")
            .data(stackedSeries)
            .join("g")
            .attr("class", "layer")
            .attr("fill", d => color(d.key));

        layers.selectAll("rect")
            .data(layer => layer.map(seg => ({ ...seg, key: layer.key })))
            .join("rect")
            .attr("x", d => x(d[0]))
            .attr("y", d => y(d.data.label) + yOffset)
            .attr("width", d => Math.max(0, x(d[1]) - x(d[0])))
            .attr("height", barHeight)
            .attr("stroke", "#fff")
            .attr("stroke-width", keys.length > 1 ? 1.5 : 0)
            .style("cursor", "pointer")
            .on("mouseenter", (event, d) => {
                const yearLabel = `${d.key}/${+d.key + 1}`;
                const segValue = d.data[d.key];
                const sharePct = d.data.total > 0 ? ((segValue / d.data.total) * 100).toFixed(1) : 0;

                const breakdown = keys.length > 1
                    ? `<hr style="border:0;border-top:1px solid rgba(255,255,255,0.2);margin:4px 0">` +
                      keys.map(k => `<span class="swatch" style="background:${color(k)}"></span>${k}/${+k + 1}: <b>${d.data[k]}</b>`).join("<br>")
                    : "";

                tooltip.show(
                    `<strong>${escapeHtml(d.data.label)}</strong>
                    ${yearLabel}: <b>${segValue} students</b>${keys.length > 1 ? ` (${sharePct}%)` : ""}
                    ${breakdown}
                    <br><span class="muted">Total in category: ${d.data.total}</span>`,
                    event
                );
            })
            .on("mousemove", event => tooltip.move(event))
            .on("mouseleave", () => tooltip.hide());

        // Total à direita de cada barra
        g.selectAll("text.total-label")
            .data(data)
            .join("text")
            .attr("class", "total-label")
            .attr("x", d => x(d.total) + 8)
            .attr("y", d => y(d.label) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("font-size", "11.5px")
            .attr("font-weight", "700")
            .attr("fill", "#475569")
            .text(d => d.total);
    }

    return {
        update(payload) {
            current = payload;
            render();
        },
        destroy() {
            observer.disconnect();
            tooltip.hide();
        },
    };
}