import { initCourseRegence } from "./js/pages/courseRegence.js";
import { initDegreeManagement } from "./js/pages/degreeManagement.js";
import { initQualityRetention } from "./js/pages/qualityRetention.js";

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
    "": { page: "home", title: "Home", init: null },
    "home": { page: "home", title: "Home", init: null },
    "degree-management": { page: "degree_management", title: "Curricular Bottlenecks", init: initDegreeManagement },
    "quality-retention": { page: "quality_retention", title: "Institutional & Equity", init: initQualityRetention },
    "course-regence": { page: "course_regence", title: "Exam Diagnostics", init: initCourseRegence },
};

let latestNavigation = 0;

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
    cleanupPage = route.init ? route.init() : null;
    // the landing page is full screen, without top bar or sidebar
    document.body.classList.toggle("landing", route.page === "home");
    closeSidebar();
    document.title = `${route.title} | GRADES UA`;
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

// the hash does not change when clicking the current page, so close the sidebar here too
pageButtons.forEach(button => button.addEventListener("click", closeSidebar));

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