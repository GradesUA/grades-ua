// import { loadDepartmentIndex, loadAllDepartments } from "../dataLoader.js";
import { loadDepartmentIndex, loadDepartment } from "../dataLoader.js";
import { createStore } from "../state.js";
import { computeDivergingEquity, computeExamOutcomesByYear } from "../metrics.js";
import { createDivergingBarChart } from "../charts/divergingBarChart.js";
import { createStackedBarChart } from "../charts/stackedBarChart.js";
import { t } from "../i18n.js";
import { onSettingsChange } from "../settings.js";

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
        divergingBox: $("course-diverging-chart"),
        degreesBadge: $("degrees-badge"),
        divergingFooter: $("course-diverging-footer"),
        stackedBox: $("exam-stacked-chart"),
        stackedTitle: $("exam-stacked-title"),
        scopeBadge: $("exam-scope-badge"),
        stackedFooter: $("exam-stacked-footer"),
    };

    const store = createStore({
        course: "",
        department: "",
        selectedYears: [],
        selectedDegree: null,
    });

    const divergingChart = createDivergingBarChart(elements.divergingBox, {
        onSelect: degree => store.set({ selectedDegree: degree }),
    });
    const stackedChart = createStackedBarChart(elements.stackedBox);

    let departmentsMap = new Map();
    let allRows = [];
    let availableCourses = [];
    let availableYearsForCourse = [];
    let latestRequest = 0;

    const setOptions = (select, options, value) => {
        d3.select(select)
            .selectAll("option")
            .data(options, d => d.value)
            .join("option")
            .attr("value", d => d.value)
            .text(d => d.label);
        select.value = value;
    };

    function renderCourseDropdown(query = "") {
        const cleanQuery = normalizeText(query.trim());
        const filtered = cleanQuery
            ? availableCourses.filter(c => normalizeText(c).startsWith(cleanQuery))
            : availableCourses;

        const container = d3.select(elements.courseOptions);
        container.selectAll("*").remove();

        if (filtered.length === 0) {
            container.append("div")
                .attr("class", "course-empty")
                .text(t("cr.noCourses"));
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
            lockSecondaryFilters();
            store.set({ course: "", department: "", selectedYears: [], selectedDegree: null });
            refresh();
            return;
        }

        const courseRows = allRows.filter(r => r.course === courseName);
        const dept = populateDepartmentsForCourse(courseRows, store.get().department);
        const years = populateYearsForCourse(courseRows, dept);

        store.set({ course: courseName, department: dept, selectedYears: years, selectedDegree: null });
        refresh();
    }

    function lockSecondaryFilters() {
        setOptions(elements.department, [{ value: "", label: t("common.allDepartments") }], "");
        elements.department.disabled = true;

        availableYearsForCourse = [];
        elements.yearsOptions.innerHTML = "";
        elements.yearsContainer.classList.remove("open");
        elements.yearsBtn.disabled = true;
        elements.yearsBtn.querySelector("span").textContent = t("common.allYears");
    }

    function populateDepartmentsForCourse(courseRows, preferredDept = "") {
        const deptIds = Array.from(new Set(courseRows.map(r => r.departmentId).filter(Boolean)))
            .sort(d3.ascending);

        const options = [
            { value: "", label: t("common.allDepartments") },
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
            span.textContent = t("common.allYears");
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

        const selectedYears = [...availableYearsForCourse];

        const container = d3.select(elements.yearsOptions);
        container.selectAll("*").remove();

        container.append("label")
            .attr("class", "select-all-option")
            .html(`<input type="checkbox" id="chk-all-years" checked> <span>${t("common.allYears")}</span>`);

        container.selectAll("label.year-item")
            .data(availableYearsForCourse, d => d)
            .join("label")
            .attr("class", "year-item")
            .html(y => `<input type="checkbox" class="chk-year" value="${y}" checked> ${y}/${y + 1}`);

        elements.yearsBtn.disabled = false;
        updateYearsButtonLabel(selectedYears);
        return selectedYears;
    }

    function refresh() {
        const { course, department, selectedYears, selectedDegree } = store.get();

        if (!course || selectedYears.length === 0) {
            divergingChart.update([], null);
            stackedChart.update({ data: [], keys: [] });
            elements.degreesBadge.textContent = t("cr.degrees", { n: 0 });
            elements.scopeBadge.textContent = t("cr.noCourse");
            elements.divergingFooter.textContent = t("cr.footerEmpty");
            elements.stackedFooter.textContent = t("cr.stackedFooterEmpty");
            return;
        }

        const scopedRows = allRows.filter(r =>
            r.course === course &&
            (!department || r.departmentId === department) &&
            selectedYears.includes(r.year)
        );

        const degreeEquity = computeDivergingEquity(scopedRows, "degree");

        if (selectedDegree && !degreeEquity.some(d => d.label === selectedDegree)) {
            store.set({ selectedDegree: null });
            return;
        }

        elements.degreesBadge.textContent = t(degreeEquity.length === 1 ? "cr.degree" : "cr.degrees", { n: degreeEquity.length });
        elements.divergingFooter.textContent = selectedDegree
            ? t("cr.filteredBy", { degree: selectedDegree })
            : t("cr.clickDegree");
        divergingChart.update(degreeEquity, selectedDegree);

        const outcomeRows = selectedDegree
            ? scopedRows.filter(r => r.degree === selectedDegree)
            : scopedRows;

        const stackedData = computeExamOutcomesByYear(outcomeRows, selectedYears);
        stackedChart.update(stackedData);

        elements.scopeBadge.textContent = selectedDegree ? selectedDegree : t("cr.allDegrees");
        elements.stackedFooter.textContent = selectedDegree
            ? t("cr.stackedFooterDegree", { degree: selectedDegree })
            : t("cr.stackedFooterAll", { n: degreeEquity.length });
    }

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

    elements.department.addEventListener("change", () => {
        const dept = elements.department.value;
        const courseRows = allRows.filter(r => r.course === store.get().course);
        const years = populateYearsForCourse(courseRows, dept);

        store.set({ department: dept, selectedYears: years, selectedDegree: null });
        refresh();
    });

    elements.yearsOptions.addEventListener("change", e => {
        const target = e.target;
        const allCheckbox = elements.yearsOptions.querySelector("#chk-all-years");
        const yearCheckboxes = Array.from(elements.yearsOptions.querySelectorAll(".chk-year"));

        if (target.id === "chk-all-years") {
            yearCheckboxes.forEach(cb => { cb.checked = target.checked; });
        } else if (target.classList.contains("chk-year")) {
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

    const unsubscribe = store.subscribe((_, changed) => {
        if (changed.length === 1 && changed[0] === "selectedDegree") refresh();
    });

    // the course input placeholder depends on the loading state, so it is kept as a key
    let placeholderKey = "cr.placeholderLoading";
    const setPlaceholder = key => {
        placeholderKey = key;
        elements.courseInput.placeholder = t(key);
    };

    // option labels and chart strings follow the language, chart colors the theme
    const offSettings = onSettingsChange(() => {
        elements.courseInput.placeholder = t(placeholderKey);
        const allDepartments = elements.department.querySelector('option[value=""]');
        if (allDepartments) allDepartments.textContent = t("common.allDepartments");
        const allYears = elements.yearsOptions.querySelector(".select-all-option span");
        if (allYears) allYears.textContent = t("common.allYears");
        updateYearsButtonLabel(store.get().selectedYears);
        if (elements.courseBox.classList.contains("open")) renderCourseDropdown(elements.courseInput.value);
        refresh();
    });

    lockSecondaryFilters();
    setPlaceholder("cr.placeholderLoading");

    const requestId = ++latestRequest;
    const coursesSet = new Set();

    loadDepartmentIndex()
        .then(index => {
            if (requestId !== latestRequest) return;
            departmentsMap = new Map(index.map(d => [d.id, d.name]));

            const deptTasks = index.map(async dept => {
                const rows = await loadDepartment(dept.id);
                if (requestId !== latestRequest) return [];

                let addedNew = false;
                for (let i = 0; i < rows.length; i++) {
                    rows[i].departmentId = dept.id;
                    const c = rows[i].course;
                    if (c && !coursesSet.has(c)) {
                        coursesSet.add(c);
                        addedNew = true;
                    }
                }

                if (addedNew) {
                    availableCourses = Array.from(coursesSet).sort(d3.ascending);
                    setPlaceholder("cr.placeholderReady");
                    if (elements.courseBox.classList.contains("open")) {
                        renderCourseDropdown(elements.courseInput.value);
                    }
                }

                return rows;
            });

            return Promise.all(deptTasks);
        })
        .then(lists => {
            if (!lists || requestId !== latestRequest) return;
            allRows = lists.flat();
            setPlaceholder("cr.placeholderReady");
            renderCourseDropdown(elements.courseInput.value);
            refresh();
        })
        .catch(error => {
            console.error(error);
            setPlaceholder("cr.placeholderError");
        });

    return () => {
        latestRequest++;
        unsubscribe();
        offSettings();
        document.removeEventListener("click", onDocumentClick);
        divergingChart.destroy();
        stackedChart.destroy();
    };

}