const DEPARTMENTS_DIR = "../data/departments";

const departmentCache = new Map();
let departmentIndexPromise = null;

export function loadDepartmentIndex() {
    if (!departmentIndexPromise) {
        departmentIndexPromise = d3.json(`${DEPARTMENTS_DIR}/index.json`);
    }
    return departmentIndexPromise;
}

function parseRow(row) {
    return {
        year: +row.ianolectivo,
        cycle: row.sigla_grau,
        degree: row.nome_curso,
        course: row.nome_disciplina,
        examType: row.nvctipoexame,
        passed: row.notafinal === "Sim",
    };
}

export function loadDepartment(departmentId) {
    if (!departmentCache.has(departmentId)) {
        const request = d3.csv(`${DEPARTMENTS_DIR}/${departmentId}.csv`, parseRow)
            .catch(error => {
                departmentCache.delete(departmentId);
                throw error;
            });
        departmentCache.set(departmentId, request);
    }
    return departmentCache.get(departmentId);
}
