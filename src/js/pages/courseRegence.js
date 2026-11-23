import { loadDepartmentIndex, loadAllDepartments } from "../dataLoader.js";
import { createStore } from "../state.js";

const normalizeText = str =>
    String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

export function initCourseRegence() {
    const $ = id => document.getElementById(id);
    const elements = {
        courseBox: $("filter-course-box"),
        courseInput: $("filter-course-input"),
        clearCourseBtn: $("btn-clear-course"),
        courseOptions: $("filter-course-options"),
        department: $("filter-department"),
        yearsContainer: $("filter-years"),
        yearsBtn: $("btn-years-dropdown"),
        yearsOptions: $("filter-years-options"),
        reset: $("btn-reset"),
    };

    const store = createStore({
        course: "",
        department: "",
        selectedYears: [], // array de anos selecionados
    });

    let departmentsMap = new Map(); // id -> nome completo
    let allRows = [];               // todos os registos de todos os departamentos
    let availableCourses = [];
    let availableYearsForCourse = [];
    let latestRequest = 0;

    // --- Helpers ---

    const setOptions = (select, options, value) => {
        d3.select(select)
            .selectAll("option")
            .data(options, d => d.value)
            .join("option")
            .attr("value", d => d.value)
            .text(d => d.label);
        select.value = value;
    };

    // --- 1. Course Searchable Dropdown ---

    function renderCourseDropdown(query = "") {
        const cleanQuery = normalizeText(query.trim());
        const filtered = cleanQuery
            ? availableCourses.filter(c => normalizeText(c).startsWith(cleanQuery))
            : availableCourses;

        const container = d3.select(elements.courseOptions);
        container.selectAll("*").remove();

        if (!cleanQuery) {
            container.append("div")
                .attr("class", `course-option${store.get().course === "" ? " active" : ""}`)
                .text("All courses (UCs)")
                .on("mousedown", () => selectCourse(""));
        }

        if (filtered.length === 0) {
            container.append("div")
                .attr("class", "course-empty")
                .text("No courses found");
            return;
        }

        container.selectAll("div.course-item")
            .data(filtered, d => d)
            .join("div")
            .attr("class", d => `course-option course-item${store.get().course === d ? " active" : ""}`)
            .text(d => d)
            .on("mousedown", (_, courseName) => selectCourse(courseName));
    }

    function selectCourse(courseName) {
        elements.courseInput.value = courseName;
        elements.clearCourseBtn.hidden = !courseName;
        elements.courseBox.classList.remove("open");

        if (!courseName) {
            // Nenhuma UC selecionada -> bloqueia Department e Academic Year
            lockSecondaryFilters();
            store.set({ course: "", department: "", selectedYears: [] });
            refresh();
            return;
        }

        // UC selecionada -> desbloqueia e popula apenas com dados desta UC
        const courseRows = allRows.filter(r => r.course === courseName);
        const dept = populateDepartmentsForCourse(courseRows, store.get().department);
        const years = populateYearsForCourse(courseRows, dept);

        store.set({ course: courseName, department: dept, selectedYears: years });
        refresh();
    }

    // --- 2. Secondary Filters (Department & Academic Years) ---

    function lockSecondaryFilters() {
        // Bloqueia Department
        setOptions(elements.department, [{ value: "", label: "All departments" }], "");
        elements.department.disabled = true;

        // Bloqueia Academic Years
        availableYearsForCourse = [];
        elements.yearsOptions.innerHTML = "";
        elements.yearsContainer.classList.remove("open");
        elements.yearsBtn.disabled = true;
        elements.yearsBtn.querySelector("span").textContent = "All academic years";
    }

    function populateDepartmentsForCourse(courseRows, preferredDept = "") {
        const deptIds = Array.from(new Set(courseRows.map(r => r.departmentId).filter(Boolean)))
            .sort(d3.ascending);

        const options = [
            { value: "", label: "All departments" },
            ...deptIds.map(id => ({
                value: id,
                label: departmentsMap.has(id) ? `${id.toUpperCase()} - ${departmentsMap.get(id)}` : id.toUpperCase(),
            })),
        ];

        const selectedDept = deptIds.includes(preferredDept) ? preferredDept : "";
        setOptions(elements.department, options, selectedDept);
        elements.department.disabled = false;
        return selectedDept;
    }

    function updateYearsButtonLabel(selectedYears) {
        const span = elements.yearsBtn.querySelector("span");
        const allSelected = availableYearsForCourse.length > 0 &&
            selectedYears.length === availableYearsForCourse.length;

        if (allSelected || selectedYears.length === 0) {
            span.textContent = "All academic years";
        } else {
            span.textContent = [...selectedYears]
                .sort(d3.ascending)
                .map(y => `${y}/${y + 1}`)
                .join(", ");
        }
    }

    function populateYearsForCourse(courseRows, departmentId = "") {
        const scopedRows = departmentId
            ? courseRows.filter(r => r.departmentId === departmentId)
            : courseRows;

        availableYearsForCourse = Array.from(new Set(scopedRows.map(r => r.year)))
            .sort(d3.descending);

        // Por defeito, quando escolhe uma UC, todos os anos vêm selecionados
        const selectedYears = [...availableYearsForCourse];

        const container = d3.select(elements.yearsOptions);
        container.selectAll("*").remove();

        // Checkbox "All academic years" no topo
        container.append("label")
            .attr("class", "select-all-option")
            .html(`<input type="checkbox" id="chk-all-years" checked> All academic years`);

        // Checkboxes individuais por ano
        container.selectAll("label.year-item")
            .data(availableYearsForCourse, d => d)
            .join("label")
            .attr("class", "year-item")
            .html(y => `<input type="checkbox" class="chk-year" value="${y}" checked> ${y}/${y + 1}`);

        elements.yearsBtn.disabled = false;
        updateYearsButtonLabel(selectedYears);
        return selectedYears;
    }

    // --- 3. Rendering ---

    function filteredRows() {
        const { course, department, selectedYears } = store.get();
        return allRows.filter(r => {
            if (course && r.course !== course) return false;
            if (department && r.departmentId !== department) return false;
            if (course && selectedYears.length > 0 && !selectedYears.includes(r.year)) return false;
            return true;
        });
    }

    function refresh() {
        if (allRows.length === 0) return;
        const { course, selectedYears } = store.get();

        // Se uma UC está selecionada mas o utilizador desmarcou TODOS os anos, passa array vazio
        const rows = (course && selectedYears.length === 0) ? [] : filteredRows();
        console.log("Course Regence filtered rows:", rows.length);
    }

    // --- 4. Events ---

    elements.courseInput.addEventListener("focus", () => {
        renderCourseDropdown(elements.courseInput.value);
        elements.courseBox.classList.add("open");
    });

    elements.courseInput.addEventListener("input", () => {
        const val = elements.courseInput.value;
        elements.clearCourseBtn.hidden = !val;
        renderCourseDropdown(val);
        elements.courseBox.classList.add("open");

        if (val === "" && store.get().course !== "") {
            selectCourse("");
        }
    });

    elements.clearCourseBtn.addEventListener("click", () => {
        selectCourse("");
        elements.courseInput.focus();
    });

    const onDocumentClick = e => {
        if (!e.target.closest("#filter-course-box")) {
            elements.courseBox.classList.remove("open");
            elements.courseInput.value = store.get().course;
            elements.clearCourseBtn.hidden = !store.get().course;
        }
    };
    document.addEventListener("click", onDocumentClick);

    // Mudança de Departamento (dentro da UC selecionada)
    elements.department.addEventListener("change", () => {
        const dept = elements.department.value;
        const courseRows = allRows.filter(r => r.course === store.get().course);
        const years = populateYearsForCourse(courseRows, dept);

        store.set({ department: dept, selectedYears: years });
        refresh();
    });

    // Mudança nas checkboxes de Academic Year ("All academic years" vs anos individuais)
    elements.yearsOptions.addEventListener("change", e => {
        const target = e.target;
        const allCheckbox = elements.yearsOptions.querySelector("#chk-all-years");
        const yearCheckboxes = Array.from(elements.yearsOptions.querySelectorAll(".chk-year"));

        if (target.id === "chk-all-years") {
            // Clicou em "All academic years": marca ou desmarca todos os anos
            yearCheckboxes.forEach(cb => { cb.checked = target.checked; });
        } else if (target.classList.contains("chk-year")) {
            // Clicou num ano individual: atualiza o estado de "All academic years"
            allCheckbox.checked = yearCheckboxes.every(cb => cb.checked);
        }

        const checkedYears = yearCheckboxes
            .filter(cb => cb.checked)
            .map(cb => +cb.value);

        updateYearsButtonLabel(checkedYears);
        store.set({ selectedYears: checkedYears });
        refresh();
    });

    elements.reset.addEventListener("click", () => {
        selectCourse("");
    });

    // --- 5. Bootstrap ---

    lockSecondaryFilters();

    const requestId = ++latestRequest;
    Promise.all([loadDepartmentIndex(), loadAllDepartments()])
        .then(([index, rows]) => {
            if (requestId !== latestRequest) return;

            departmentsMap = new Map(index.map(d => [d.id, d.name]));
            allRows = rows;
            availableCourses = Array.from(new Set(allRows.map(r => r.course).filter(Boolean)))
                .sort(d3.ascending);

            renderCourseDropdown("");
            refresh();
        })
        .catch(error => console.error(error));

    return () => {
        latestRequest++;
        document.removeEventListener("click", onDocumentClick);
    };
}