let showSideBar = false;

const buttonSidebar = document.getElementById("btn-sidebar");
const sidebar = document.getElementById("sidebar");

const pageButtons = document.querySelectorAll(".btn-sidebar");

buttonSidebar.addEventListener("click", () => {
    showSideBar = !showSideBar;

    sidebar.classList.toggle("active", showSideBar);
});

async function loadPage(page) {
    const response = await fetch(`pages/${page}.html`);

    if (!response.ok) {
        throw new Error(`Failed to load ${page}`);
    }

    const html = await response.text();

    document.getElementById("page-content").innerHTML = html;

    pageButtons.forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.page === page
        );
    });
}

loadPage("degree_management");

pageButtons.forEach(button => {
    button.addEventListener("click", () => {
        loadPage(button.dataset.page);

        // Fecha a sidebar ao clicar numa opção
        showSideBar = false;
        sidebar.classList.remove("active");
    });
});




pageButtons.forEach(button => {
    button.addEventListener("click", () => {
        loadPage(button.dataset.page);
    });
});



const pageContent = document.getElementById("page-content");

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

pageContent.addEventListener("change", (e) => {
    if (e.target.matches('.dropdown-options input[type="checkbox"]')) {
        const multiSelect = e.target.closest(".multi-select");
        const btn = multiSelect.querySelector(".dropdown-btn");
        const checked = Array.from(
            multiSelect.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const labelText = checked.length > 0 
            ? checked.join(", ") 
            : "Select academic years...";

        btn.innerHTML = `<span>${labelText}</span> <i class="fi fi-br-angle-small-down"></i>`;
    }
});