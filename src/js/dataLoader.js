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

        // Colunas para Quality & Retention:
        studentId: row.id_estudante,
        approved: row.aprovado === "1",
        evaluated: row.avaliado === "1",
        regime: row.nome_regime,
        accessType: row.nome_tipoacesso,
        
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

let allDepartmentsPromise = null;

export function loadAllDepartments() {
    if (!allDepartmentsPromise) {
        allDepartmentsPromise = loadDepartmentIndex()
            .then(index =>
                Promise.all(
                    index.map(async dept => {
                        const rows = await loadDepartment(dept.id);
                        for (let i = 0; i < rows.length; i++) {
                            rows[i].departmentId = dept.id;
                        }
                        return rows;
                    })
                )
            )
            .then(lists => lists.flat())
            .catch(error => {
                allDepartmentsPromise = null;
                throw error;
            });
    }
    return allDepartmentsPromise;
}