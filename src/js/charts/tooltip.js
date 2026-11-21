// single tooltip element shared by every chart

let element = null;

function ensureElement() {
    if (!element) {
        element = document.createElement("div");
        element.className = "chart-tooltip";
        document.body.appendChild(element);
    }
    return element;
}

export const tooltip = {
    show(html, event) {
        const el = ensureElement();
        el.innerHTML = html;
        el.style.opacity = "1";
        this.move(event);
    },
    move(event) {
        const el = ensureElement();
        const margin = 14;
        let x = event.clientX + margin;
        let y = event.clientY + margin;
        if (x + el.offsetWidth > window.innerWidth) x = event.clientX - el.offsetWidth - margin;
        if (y + el.offsetHeight > window.innerHeight) y = event.clientY - el.offsetHeight - margin;
        el.style.transform = `translate(${x}px, ${y}px)`;
    },
    hide() {
        if (element) element.style.opacity = "0";
    },
};

export const escapeHtml = text => String(text).replace(/[&<>"']/g,
    char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export const formatPercent = value => `${(value * 100).toFixed(1)}%`;
