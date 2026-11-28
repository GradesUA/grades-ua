const STORAGE_KEY = "grades-ua-lang";
export const LANGUAGES = ["pt", "en"];
const LOCALES = { pt: "pt-PT", en: "en-GB" };

const STRINGS = {
    // shell
    "app.subtitle": { en: "Academic Performance Analysis", pt: "Análise de Desempenho Académico" },
    "nav.menu": { en: "Open menu", pt: "Abrir menu" },
    "nav.home": { en: "Home", pt: "Início" },
    "nav.dm.eyebrow": { en: "DEGREE MANAGEMENT", pt: "GESTÃO DE CURSO" },
    "nav.dm.title": { en: "Curricular Bottlenecks", pt: "Problemas Curriculares" },
    "nav.qr.eyebrow": { en: "QUALITY & RETENTION", pt: "QUALIDADE E RETENÇÃO" },
    "nav.qr.title": { en: "Institutional & Equity", pt: "Institucional e Equidade" },
    "nav.cr.eyebrow": { en: "COURSE REGENCE", pt: "REGÊNCIA DE UC" },
    "nav.cr.title": { en: "Exam Diagnostics", pt: "Diagnóstico de Exames" },
    "settings.language": { en: "Language", pt: "Idioma" },
    "settings.toDark": { en: "Switch to dark mode", pt: "Mudar para modo escuro" },
    "settings.toLight": { en: "Switch to light mode", pt: "Mudar para modo claro" },

    // landing page
    "home.intro": {
        en: "GRADES UA turns ten years of exam records into three interactive views.<br>Explore University of Aveiro records to spot course bottlenecks, track student retention, and compare exam outcomes across degrees.",
        pt: "O GRADES UA transforma dez anos de registos de exames em três visualizações interativas.<br>Explore os registos da Universidade de Aveiro para identificar problemas curriculares, acompanhar a retenção de estudantes e comparar resultados de exames entre cursos.",
    },
    "home.dm.desc": {
        en: "Which course units hold students back? Plot failure rate against volume for a degree, choose which exam phases count as a pass, and compare a unit's trend with the degree average.",
        pt: "Que unidades curriculares travam os estudantes? Compare a taxa de reprovação com o volume de inscrições de um curso, escolha que épocas contam como aprovação e compare a evolução de uma UC com a média do curso.",
    },
    "home.qr.desc": {
        en: "Follow enrolments from attendance to a pass or failure, separating dropouts from real exam failure, and compare outcomes across admission profiles.",
        pt: "Acompanhe as inscrições desde a presença até à aprovação ou reprovação, separando desistências de reprovações reais, e compare resultados entre perfis de acesso.",
    },
    "home.cr.desc": {
        en: "Compare one course unit across the degrees that take it, and see how much the resit and later exam periods recover each year.",
        pt: "Compare uma unidade curricular entre os cursos que a frequentam e veja quanto o recurso e as épocas posteriores recuperam em cada ano.",
    },
    "home.open": { en: "Open view", pt: "Abrir vista" },

    // shared
    "common.department": { en: "Department", pt: "Departamento" },
    "common.academicYear": { en: "Academic Year", pt: "Ano letivo" },
    "common.reset": { en: "Reset view", pt: "Repor vista" },
    "common.allYears": { en: "All academic years", pt: "Todos os anos letivos" },
    "common.allDepartments": { en: "All departments", pt: "Todos os departamentos" },
    "common.unknown": { en: "Unknown", pt: "Desconhecido" },
    "common.noData": { en: "No data available for the selected filters", pt: "Sem dados para os filtros selecionados" },
    "common.noSelectionData": { en: "No data available for this selection", pt: "Sem dados para esta seleção" },
    "common.loading": { en: "Loading…", pt: "A carregar…" },
    "common.clear": { en: "Clear", pt: "Limpar" },
    "chart.failRate": { en: "Failure rate", pt: "Taxa de reprovação" },
    "chart.passRate": { en: "Pass rate", pt: "Taxa de aprovação" },
    "chart.enrolments": { en: "Enrolments", pt: "Inscrições" },

    // curricular bottlenecks
    "dm.degree": { en: "Degree", pt: "Curso" },
    "dm.cycle": { en: "Cycle", pt: "Ciclo" },
    "dm.cycleHelp": {
        en: "The dataset has no curricular-year column, so students are grouped by study cycle instead.",
        pt: "O conjunto de dados não tem coluna de ano curricular, por isso os estudantes são agrupados por ciclo de estudos.",
    },
    "dm.years": { en: "Academic Years Range", pt: "Intervalo de anos letivos" },
    "dm.yearFrom": { en: "From academic year", pt: "Ano letivo inicial" },
    "dm.yearTo": { en: "To academic year", pt: "Ano letivo final" },
    "dm.phase": { en: "Passed By", pt: "Aprovação em" },
    "dm.phaseHelp": {
        en: "Which exam phases count as a pass. The rate always uses all enrolments.",
        pt: "Que épocas de exame contam como aprovação. A taxa usa sempre todas as inscrições.",
    },
    "dm.phase.all": { en: "Any period (final result)", pt: "Qualquer época (resultado final)" },
    "dm.phase.resit": { en: "Normal + Resit", pt: "Normal + Recurso" },
    "dm.phase.normal": { en: "Normal only", pt: "Apenas Normal" },
    "dm.phaseShort.all": { en: "any period", pt: "qualquer época" },
    "dm.phaseShort.resit": { en: "normal + resit", pt: "normal + recurso" },
    "dm.phaseShort.normal": { en: "normal only", pt: "apenas normal" },
    "dm.allDegrees": { en: "All degrees", pt: "Todos os cursos" },
    "dm.allCycles": { en: "All cycles", pt: "Todos os ciclos" },
    "dm.cycle.L1": { en: "1st cycle (Bachelor)", pt: "1.º ciclo (Licenciatura)" },
    "dm.cycle.M2": { en: "2nd cycle (Master)", pt: "2.º ciclo (Mestrado)" },
    "dm.scatterTitle": { en: "Course Failure Rate vs. Student Volume", pt: "Taxa de Reprovação vs. Volume de Inscrições" },
    "dm.loadingDepartment": { en: "Loading department data…", pt: "A carregar dados do departamento…" },
    "dm.loadError": {
        en: "Could not load this department's data. Is the dataset in data/departments/?",
        pt: "Não foi possível carregar os dados deste departamento. O conjunto de dados está em data/departments/?",
    },
    "dm.indexError": {
        en: "Could not load the department index. Run `python clean.py` first.",
        pt: "Não foi possível carregar o índice de departamentos. Execute primeiro `python clean.py`.",
    },
    "dm.badge": { en: "{n} COURSE UNITS", pt: "{n} UNIDADES CURRICULARES" },
    "dm.footer": {
        en: "{n} course units · passed by {phase} · {critical} critical · median volume {median} enrolments · units with fewer than {min} enrolments hidden",
        pt: "{n} unidades curriculares · aprovação em {phase} · {critical} críticas · volume mediano {median} inscrições · UC com menos de {min} inscrições ocultas",
    },
    "dm.lineTitle": { en: "Longitudinal Pass Rate", pt: "Taxa de Aprovação ao Longo do Tempo" },
    "dm.lineTitleRange": { en: "Longitudinal Pass Rate ({from}-{to}, {phase})", pt: "Taxa de Aprovação ao Longo do Tempo ({from}-{to}, {phase})" },
    "dm.searchPlaceholder": { en: "Search course units to compare...", pt: "Pesquisar unidades curriculares para comparar..." },
    "dm.searchLabel": { en: "Search course units to add to the trend chart", pt: "Pesquisar unidades curriculares para adicionar ao gráfico de evolução" },
    "dm.hint": {
        en: "Search or click course bubbles to compare their historical trends against the degree average.",
        pt: "Pesquise ou clique nas bolhas das UC para comparar a sua evolução com a média do curso.",
    },
    "dm.degreeAverage": { en: "Degree average", pt: "Média do curso" },
    "dm.departmentAverage": { en: "Department average", pt: "Média do departamento" },
    "dm.noRange": { en: "No data in the selected range", pt: "Sem dados no intervalo selecionado" },
    "dm.calloutRow": {
        en: "{course}: {fail} failure across {n} enrolments, <b>{delta} pts {direction}</b> the {average}",
        pt: "{course}: {fail} de reprovação em {n} inscrições, <b>{delta} p.p. {direction}</b> {average}",
    },
    "dm.below": { en: "below", pt: "abaixo da" },
    "dm.above": { en: "above", pt: "acima da" },
    "dm.averageNote": { en: "{average} pass rate: {rate}", pt: "Taxa de aprovação da {averageLower}: {rate}" },
    "dm.capNote": { en: "Up to {max} courses, remove one to add another", pt: "Até {max} UC, remova uma para adicionar outra" },
    "dm.noMatch": { en: "No course units match", pt: "Nenhuma unidade curricular encontrada" },
    "dm.optionMeta": { en: "{fail} fail · {n}", pt: "{fail} reprov. · {n}" },
    "dm.removeCourse": { en: "Remove {course}", pt: "Remover {course}" },
    "scatter.critical": { en: "CRITICAL BOTTLENECKS", pt: "PROBLEMAS CRÍTICOS" },
    "scatter.xTitle": { en: "Enrolments (student-years)", pt: "Inscrições (estudante-ano)" },
    "scatter.empty": { en: "No course units match the current filters", pt: "Nenhuma unidade curricular corresponde aos filtros" },
    "scatter.clickAdd": { en: "Click to add to the trend chart", pt: "Clique para adicionar ao gráfico de evolução" },
    "scatter.clickRemove": { en: "Click to remove from the trend chart", pt: "Clique para remover do gráfico de evolução" },
    "line.noData": { en: "no data", pt: "sem dados" },
    "line.enrolled": { en: "({n} enrolled)", pt: "({n} inscrições)" },

    // institutional & equity
    "qr.metric": { en: "Grouping Metric", pt: "Agrupar por" },
    "qr.metric.regime": { en: "Study Regime", pt: "Regime de estudo" },
    "qr.metric.accessType": { en: "Access Type", pt: "Tipo de acesso" },
    "qr.sankeyTitle": { en: "Student Equity & Outcome Flow", pt: "Fluxo de Resultados dos Estudantes" },
    "qr.divergingTitle": { en: "Equity Gap by Demographic", pt: "Diferenças de Equidade por Perfil" },
    "qr.passVsFail": { en: "PASS vs FAIL", pt: "APROVAÇÃO vs REPROVAÇÃO" },
    "qr.allEnrolments": { en: "ALL ENROLMENTS", pt: "TODAS AS INSCRIÇÕES" },
    "qr.footerGroup": {
        en: "{shown} of {all} enrolments ({group}) · click the group again to show everyone",
        pt: "{shown} de {all} inscrições ({group}) · clique novamente no grupo para mostrar todos",
    },
    "qr.footerAll": {
        en: "{all} enrolments · click a group in the equity chart to see its flow",
        pt: "{all} inscrições · clique num grupo do gráfico de equidade para ver o seu fluxo",
    },
    "qr.divergingFooter": { en: "Comparing {n} groups by {metric}", pt: "A comparar {n} grupos por {metric}" },
    "sankey.Total Enrolled": { en: "Total Enrolled", pt: "Total de Inscrições" },
    "sankey.Attended / Evaluated": { en: "Attended / Evaluated", pt: "Presentes / Avaliados" },
    "sankey.Unassessed / Dropouts": { en: "Unassessed / Dropouts", pt: "Não Avaliados / Desistências" },
    "sankey.Pass Normal": { en: "Pass Normal", pt: "Aprovado na Normal" },
    "sankey.Resit": { en: "Resit", pt: "Recurso" },
    "sankey.Pass Resit": { en: "Pass Resit", pt: "Aprovado no Recurso" },
    "sankey.Final Failure": { en: "Final Failure", pt: "Reprovação Final" },
    "sankey.shareOfSource": { en: "Share of source", pt: "Percentagem da origem" },
    "sankey.shareOfTotal": { en: "Total share", pt: "Percentagem do total" },
    "diverging.fail": { en: "← FAIL / UNASSESSED", pt: "← REPROVADO / NÃO AVALIADO" },
    "diverging.pass": { en: "APPROVED →", pt: "APROVADO →" },
    "diverging.approved": { en: "Approved", pt: "Aprovados" },
    "diverging.failed": { en: "Fail / Unassessed", pt: "Reprovados / Não avaliados" },
    "diverging.total": { en: "Total enrolments", pt: "Total de inscrições" },
    "diverging.clickToFilter": { en: "Click to filter", pt: "Clique para filtrar" },

    // exam diagnostics
    "cr.course": { en: "Course", pt: "Unidade curricular" },
    "cr.placeholderAll": { en: "All courses (type to search)...", pt: "Todas as UC (escreva para pesquisar)..." },
    "cr.placeholderLoading": { en: "Loading courses...", pt: "A carregar UC..." },
    "cr.placeholderReady": { en: "Select a course (type to search)...", pt: "Selecione uma UC (escreva para pesquisar)..." },
    "cr.placeholderError": { en: "Error loading courses", pt: "Erro ao carregar UC" },
    "cr.noCourses": { en: "No courses found", pt: "Nenhuma UC encontrada" },
    "cr.divergingTitle": { en: "Course Performance by Degree", pt: "Desempenho da UC por Curso" },
    "cr.stackedTitle": { en: "Exam Season Breakdown", pt: "Resultados por Época de Exame" },
    "cr.degrees": { en: "{n} DEGREES", pt: "{n} CURSOS" },
    "cr.degree": { en: "{n} DEGREE", pt: "{n} CURSO" },
    "cr.noCourse": { en: "NO COURSE", pt: "SEM UC" },
    "cr.allDegrees": { en: "ALL DEGREES", pt: "TODOS OS CURSOS" },
    "cr.footerEmpty": {
        en: "Select a course unit above to inspect performance across degrees.",
        pt: "Selecione uma unidade curricular acima para analisar o desempenho entre cursos.",
    },
    "cr.stackedFooterEmpty": {
        en: "Click a degree bar on the left to filter this breakdown.",
        pt: "Clique na barra de um curso à esquerda para filtrar estes resultados.",
    },
    "cr.filteredBy": { en: "Filtered by: {degree} (click again to clear)", pt: "Filtrado por: {degree} (clique novamente para limpar)" },
    "cr.clickDegree": {
        en: "Click a degree bar to isolate its exam season results on the right.",
        pt: "Clique na barra de um curso para isolar os seus resultados por época à direita.",
    },
    "cr.stackedFooterDegree": { en: "Showing exam outcomes exclusively for {degree}.", pt: "Resultados de exame apenas para {degree}." },
    "cr.stackedFooterAll": { en: "Aggregated exam outcomes across all {n} degrees.", pt: "Resultados de exame agregados dos {n} cursos." },
    "stacked.empty": { en: "Select a course unit to view exam season results", pt: "Selecione uma unidade curricular para ver os resultados por época" },
    "stacked.segment": {
        en: "<b>{n} enrolments</b>, {share} of the {total} enrolments that year",
        pt: "<b>{n} inscrições</b>, {share} das {total} inscrições desse ano",
    },
    "stacked.rowTotal": { en: "{label}, all selected years: {n}", pt: "{label}, todos os anos selecionados: {n}" },
    "outcome.Pass Normal": { en: "Pass Normal", pt: "Aprovado na Normal" },
    "outcome.Pass Resit": { en: "Pass Resit", pt: "Aprovado no Recurso" },
    "outcome.Pass Later Period": { en: "Pass Later Period", pt: "Aprovado em Época Posterior" },
    "outcome.Failed": { en: "Failed", pt: "Reprovado" },
    "outcome.Never Assessed": { en: "Never Assessed", pt: "Nunca Avaliado" },
};

const stored = localStorage.getItem(STORAGE_KEY);
let language = LANGUAGES.includes(stored) ? stored : "pt";
const listeners = new Set();

export const getLanguage = () => language;

export function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat(LOCALES[language], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export const formatPercent = value => `${formatNumber(value * 100, 1)}%`;

export function t(key, params = {}) {
    const text = STRINGS[key]?.[language] ?? STRINGS[key]?.en ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => {
        const value = params[name];
        return typeof value === "number" ? formatNumber(value) : value ?? "";
    });
}

// static markup declares its strings with data-i18n attributes
export function translateDom(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}

export function setLanguage(next) {
    if (!LANGUAGES.includes(next) || next === language) return;
    language = next;
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    listeners.forEach(listener => listener(next));
}

export function onLanguageChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

document.documentElement.lang = language;
