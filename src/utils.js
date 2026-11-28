import { initCourseRegence } from "./js/pages/courseRegence.js";
import { initDegreeManagement } from "./js/pages/degreeManagement.js";
import { initQualityRetention } from "./js/pages/qualityRetention.js";
import { t, translateDom, getLanguage, setLanguage, onLanguageChange } from "./js/i18n.js";
import { getTheme, setTheme, onThemeChange } from "./js/theme.js";

let showSideBar = false;
let cleanupPage = null;

const buttonSidebar = document.getElementById("btn-sidebar");
const sidebar = document.getElementById("sidebar");

const pageButtons = document.querySelectorAll(".btn-sidebar");

function closeSidebar() {
    showSideBar = false;
    sidebar.classList.remove("active");
}

buttonSidebar.addEventListener("click", () => {
    showSideBar = !showSideBar;

    sidebar.classList.toggle("active", showSideBar);
});

// url hash -> page file and its init (home has no charts)
const ROUTES = {
    "": { page: "home", title: "nav.home", init: null },
    "home": { page: "home", title: "nav.home", init: null },
    "degree-management": { page: "degree_management", title: "nav.dm.title", init: initDegreeManagement },
    "quality-retention": { page: "quality_retention", title: "nav.qr.title", init: initQualityRetention },
    "course-regence": { page: "course_regence", title: "nav.cr.title", init: initCourseRegence },
};

let latestNavigation = 0;
let currentRoute = null;

async function loadPage(route) {
    const navigation = ++latestNavigation;
    const response = await fetch(`pages/${route.page}.html`);

    if (!response.ok) {
        throw new Error(`Failed to load ${route.page}`);
    }

    const html = await response.text();

    // a newer navigation started while this one was loading
    if (navigation !== latestNavigation) return;

    if (cleanupPage) {
        cleanupPage();
        cleanupPage = null;
    }

    document.getElementById("page-content").innerHTML = html;
    translateDom(document.getElementById("page-content"));
    currentRoute = route;
    cleanupPage = route.init ? route.init() : null;
    // the landing page is full screen, without top bar or sidebar
    document.body.classList.toggle("landing", route.page === "home");
    closeSidebar();
    document.title = `${t(route.title)} | GRADES UA`;
    window.scrollTo(0, 0);

    pageButtons.forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.page === route.page
        );
    });
}

function routeFromHash() {
    const slug = location.hash.replace(/^#\/?/, "");

    // unknown links fall back to the home page
    if (!(slug in ROUTES)) {
        history.replaceState(null, "", "#/home");
        return ROUTES[""];
    }

    return ROUTES[slug];
}

window.addEventListener("hashchange", () => {
    loadPage(routeFromHash());
    closeSidebar();
});
pageButtons.forEach(button => button.addEventListener("click", closeSidebar));

// language and theme controls, visible on every page including the landing page
const themeButton = document.getElementById("btn-theme");
const languageButtons = document.querySelectorAll(".lang-switch button");

function renderSettings() {
    const dark = getTheme() === "dark";
    themeButton.querySelector("i").className = `fi ${dark ? "fi-br-sun" : "fi-br-moon"}`;
    themeButton.setAttribute("aria-label", t(dark ? "settings.toLight" : "settings.toDark"));
    themeButton.title = themeButton.getAttribute("aria-label");
    languageButtons.forEach(button => {
        const active = button.dataset.lang === getLanguage();
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

themeButton.addEventListener("click", () => setTheme(getTheme() === "dark" ? "light" : "dark"));
languageButtons.forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.lang)));
onThemeChange(renderSettings);
onLanguageChange(() => {
    translateDom(document);
    if (currentRoute) document.title = `${t(currentRoute.title)} | GRADES UA`;
    renderSettings();
});

translateDom(document);
renderSettings();
loadPage(routeFromHash());

const pageContent = document.getElementById("page-content");

// clicking outside the sidebar closes it
document.addEventListener("click", (e) => {
    if (showSideBar && !e.target.closest("#sidebar, #btn-sidebar")) {
        closeSidebar();
    }
});

document.addEventListener("click", (e) => {
    const dropdownBtn = e.target.closest(".dropdown-btn");
    const multiSelect = e.target.closest(".multi-select");

    if (dropdownBtn && multiSelect) {
        multiSelect.classList.toggle("open");
        return;
    }

    if (!multiSelect) {
        document.querySelectorAll(".multi-select.open").forEach(el => {
            el.classList.remove("open");
        });
    }
});