import { tooltip, escapeHtml } from "./tooltip.js";

const MARGIN = { right: 36, bottom: 28, left: 145 };
const RAMP = d3.interpolateLab("#84b9f3", "#0e3d7e");
const FADED = 0.25;

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

        const legendStartX = 12;
        const itemWidth = 86;
        const availableLegendW = Math.max(itemWidth, width - legendStartX - 12);
        const itemsPerRow = Math.max(1, Math.floor(availableLegendW / itemWidth));
        const legendRows = Math.ceil(keys.length / itemsPerRow);
        const topMargin = 20 + legendRows * 18;

        const innerW = Math.max(80, width - MARGIN.left - MARGIN.right);
        const innerH = Math.max(60, height - topMargin - MARGIN.bottom);

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${topMargin})`);

        const stackedSeries = d3.stack().keys(keys)(data);

        const maxTotal = d3.max(data, d => d.total) || 0;
        const x = d3.scaleLinear()
            .domain([0, Math.max(1, maxTotal) * 1.12])
            .nice()
            .range([0, innerW]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerH])
            .padding(0.36);

        const color = d3.scaleOrdinal()
            .domain(keys)
            .range(keys.map((_, i) => RAMP(keys.length === 1 ? 0.6 : i / (keys.length - 1))));
        const yearTotals = Object.fromEntries(keys.map(k => [k, d3.sum(data, d => d[k])]));
        const highlightYear = key => {
            g.selectAll("rect.segment").attr("opacity", s => key === null || s.key === key ? 1 : FADED);
            legend.selectAll("g.legend-item").attr("opacity", k => key === null || k === key ? 1 : FADED);
        };

        const legend = svg.append("g")
            .attr("transform", `translate(${legendStartX}, 10)`);

        keys.forEach((k, idx) => {
            const col = idx % itemsPerRow;
            const row = Math.floor(idx / itemsPerRow);
            const labelText = `${k}/${+k + 1}`;

            const item = legend.append("g")
                .datum(k)
                .attr("class", "legend-item")
                .attr("transform", `translate(${col * itemWidth}, ${row * 18})`);

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
        });

        const tickCount = Math.min(5, Math.max(1, maxTotal));

        // vertical grid e x axis
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisBottom(x).ticks(tickCount).tickSize(innerH).tickFormat(""))
            .call(sel => sel.select(".domain").remove());

        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0, ${innerH})`)
            .call(d3.axisBottom(x).ticks(tickCount).tickFormat(d3.format("d")));

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

        // stacked bars
        const layers = g.selectAll("g.layer")
            .data(stackedSeries)
            .join("g")
            .attr("class", "layer")
            .attr("fill", d => color(d.key));

        layers.selectAll("rect")
            .data(layer => layer.map(seg => ({ ...seg, key: layer.key })))
            .join("rect")
            .attr("class", "segment")
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
                const yearTotal = yearTotals[d.key];
                const yearShare = yearTotal > 0 ? ((segValue / yearTotal) * 100).toFixed(1) : "0.0";

                highlightYear(d.key);
                tooltip.show(
                    `<strong>${escapeHtml(d.data.label)} · ${yearLabel}</strong>
                    <b>${segValue} enrolments</b>, ${yearShare}% of the ${yearTotal} enrolments that year
                    <br><span class="muted">${escapeHtml(d.data.label)}, all selected years: ${d.data.total}</span>`,
                    event
                );
            })
            .on("mousemove", event => tooltip.move(event))
            .on("mouseleave", () => {
                highlightYear(null);
                tooltip.hide();
            });

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