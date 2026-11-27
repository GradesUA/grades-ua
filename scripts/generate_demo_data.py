import argparse
import csv
import json
import math
import os
import random
from collections import Counter

YEARS = range(2012, 2023)

COLUMNS = [
    "ianolectivo", "id_estudante", "nome_tipoacesso", "nome_regime", "deslocado", "tempoparcial",
    "regime_frequencia", "mobilidade", "sigla_grau", "dep_sigla_oficial", "nomedepartamento",
    "nvcepocaexame", "nvctipoexame", "nota", "notafinal", "aprovado", "avaliado", "nome_curso",
    "nome_disciplina",
]

# grade points subtracted per course, high values are intended bottlenecks
DEFAULT_DIFFICULTY = 0.0
DIFFICULTY = {
    "CÁLCULO I": 2.6, "CÁLCULO II": 2.2, "ÁLGEBRA LINEAR E GEOMETRIA ANALÍTICA": 2.0,
    "FÍSICA I": 1.8, "FÍSICA II": 1.5, "MATEMÁTICA DISCRETA": 1.6, "ALGORITMOS E ESTRUTURAS DE DADOS": 1.4,
    "SISTEMAS OPERATIVOS": 1.0, "COMPILADORES": 1.7, "ANÁLISE REAL": 2.4, "MECÂNICA QUÂNTICA": 2.0,
    "QUÍMICA GERAL": 1.2, "BIOQUÍMICA": 1.3, "ESTATÍSTICA": 1.1, "MICROECONOMIA": 1.0,
    "CONTABILIDADE FINANCEIRA": 1.2, "FUNDAMENTOS DE PROGRAMAÇÃO": 0.8,
    "PROJETO EM INFORMÁTICA": -2.0, "DISSERTAÇÃO": -1.5, "SEMINÁRIO": -2.5,
}

# electives for final-year bachelor students
ELECTIVES = ["EMPREENDEDORISMO", "GESTÃO DE PROJETOS", "INGLÊS TÉCNICO", "ÉTICA E SOCIEDADE", "ECONOMIA DIGITAL"]
ELECTIVE_SLOT = "OPÇÃO"

# dep id -> (name, {degree: (cycle, intake, cohort offset, [(curricular year, semester, course)])})
DEPARTMENTS = {
    "deti": ("DEPARTAMENTO DE ELETRÓNICA, TELECOMUNICAÇÕES E INFORMÁTICA (DEMO)", {
        "LICENCIATURA EM ENGENHARIA INFORMÁTICA (1º CICLO)": ("L1", 60, 0.3, [
            (1, 1, "FUNDAMENTOS DE PROGRAMAÇÃO"), (1, 1, "CÁLCULO I"), (1, 1, "MATEMÁTICA DISCRETA"),
            (1, 1, "ÁLGEBRA LINEAR E GEOMETRIA ANALÍTICA"), (1, 2, "PROGRAMAÇÃO ORIENTADA A OBJETOS"),
            (1, 2, "CÁLCULO II"), (1, 2, "SISTEMAS DIGITAIS"), (1, 2, "FÍSICA I"),
            (2, 1, "ALGORITMOS E ESTRUTURAS DE DADOS"), (2, 1, "BASES DE DADOS"), (2, 1, "ESTATÍSTICA"),
            (2, 1, "ARQUITETURA DE COMPUTADORES"), (2, 2, "SISTEMAS OPERATIVOS"), (2, 2, "REDES DE COMPUTADORES"),
            (2, 2, "INTERAÇÃO HUMANO-COMPUTADOR"), (3, 1, "COMPILADORES"), (3, 1, "ENGENHARIA DE SOFTWARE"),
            (3, 1, "COMPUTAÇÃO DISTRIBUÍDA"), (3, 2, "PROJETO EM INFORMÁTICA"), (3, 2, ELECTIVE_SLOT),
        ]),
        "LICENCIATURA EM ENGENHARIA DE COMPUTADORES E INFORMÁTICA (1º CICLO)": ("L1", 35, 0.0, [
            (1, 1, "FUNDAMENTOS DE PROGRAMAÇÃO"), (1, 1, "CÁLCULO I"), (1, 1, "SISTEMAS DIGITAIS"),
            (1, 1, "ÁLGEBRA LINEAR E GEOMETRIA ANALÍTICA"), (1, 2, "PROGRAMAÇÃO ORIENTADA A OBJETOS"),
            (1, 2, "CÁLCULO II"), (1, 2, "FÍSICA I"), (2, 1, "ARQUITETURA DE COMPUTADORES"),
            (2, 1, "ALGORITMOS E ESTRUTURAS DE DADOS"), (2, 1, "ELETRÓNICA"), (2, 2, "SISTEMAS OPERATIVOS"),
            (2, 2, "REDES DE COMPUTADORES"), (2, 2, "SINAIS E SISTEMAS"), (3, 1, "SISTEMAS EMBUTIDOS"),
            (3, 1, "COMPUTAÇÃO DISTRIBUÍDA"), (3, 2, "PROJETO EM INFORMÁTICA"), (3, 2, ELECTIVE_SLOT),
        ]),
        "MESTRADO EM ENGENHARIA INFORMÁTICA (2º CICLO)": ("M2", 30, 0.6, [
            (1, 1, "COMPUTAÇÃO EM NUVEM"), (1, 1, "SEGURANÇA INFORMÁTICA"), (1, 1, "APRENDIZAGEM AUTOMÁTICA"),
            (1, 2, "VISUALIZAÇÃO DE INFORMAÇÃO"), (1, 2, "ARQUITETURAS DE SOFTWARE"), (1, 2, "SEMINÁRIO"),
            (2, 1, "GESTÃO DE PROJETOS"), (2, 2, "DISSERTAÇÃO"),
        ]),
    }),
    "dmat": ("DEPARTAMENTO DE MATEMÁTICA (DEMO)", {
        "LICENCIATURA EM MATEMÁTICA (1º CICLO)": ("L1", 30, 0.2, [
            (1, 1, "CÁLCULO I"), (1, 1, "ÁLGEBRA LINEAR E GEOMETRIA ANALÍTICA"), (1, 1, "FUNDAMENTOS DE PROGRAMAÇÃO"),
            (1, 2, "CÁLCULO II"), (1, 2, "MATEMÁTICA DISCRETA"), (1, 2, "FÍSICA I"),
            (2, 1, "ANÁLISE REAL"), (2, 1, "ESTATÍSTICA"), (2, 1, "ÁLGEBRA"), (2, 2, "EQUAÇÕES DIFERENCIAIS"),
            (2, 2, "ANÁLISE NUMÉRICA"), (3, 1, "TOPOLOGIA"), (3, 1, "INVESTIGAÇÃO OPERACIONAL"),
            (3, 2, "GEOMETRIA DIFERENCIAL"), (3, 2, ELECTIVE_SLOT),
        ]),
        "MESTRADO EM MATEMÁTICA E APLICAÇÕES (2º CICLO)": ("M2", 15, 0.5, [
            (1, 1, "ANÁLISE FUNCIONAL"), (1, 1, "OTIMIZAÇÃO"), (1, 2, "PROCESSOS ESTOCÁSTICOS"),
            (1, 2, "SEMINÁRIO"), (2, 1, "MODELAÇÃO MATEMÁTICA"), (2, 2, "DISSERTAÇÃO"),
        ]),
    }),
    "dfis": ("DEPARTAMENTO DE FÍSICA (DEMO)", {
        "LICENCIATURA EM FÍSICA (1º CICLO)": ("L1", 25, 0.1, [
            (1, 1, "CÁLCULO I"), (1, 1, "FÍSICA I"), (1, 1, "QUÍMICA GERAL"), (1, 1, "FUNDAMENTOS DE PROGRAMAÇÃO"),
            (1, 2, "CÁLCULO II"), (1, 2, "FÍSICA II"), (1, 2, "ÁLGEBRA LINEAR E GEOMETRIA ANALÍTICA"),
            (2, 1, "ELETROMAGNETISMO"), (2, 1, "MECÂNICA CLÁSSICA"), (2, 2, "TERMODINÂMICA"), (2, 2, "ÓTICA"),
            (3, 1, "MECÂNICA QUÂNTICA"), (3, 1, "FÍSICA DO ESTADO SÓLIDO"), (3, 2, "LABORATÓRIO DE FÍSICA"),
            (3, 2, ELECTIVE_SLOT),
        ]),
        "LICENCIATURA EM ENGENHARIA FÍSICA (1º CICLO)": ("L1", 30, -0.1, [
            (1, 1, "CÁLCULO I"), (1, 1, "FÍSICA I"), (1, 1, "FUNDAMENTOS DE PROGRAMAÇÃO"),
            (1, 2, "CÁLCULO II"), (1, 2, "FÍSICA II"), (1, 2, "ÁLGEBRA LINEAR E GEOMETRIA ANALÍTICA"),
            (2, 1, "ELETROMAGNETISMO"), (2, 1, "ELETRÓNICA"), (2, 2, "TERMODINÂMICA"), (2, 2, "SINAIS E SISTEMAS"),
            (3, 1, "INSTRUMENTAÇÃO"), (3, 1, "MECÂNICA QUÂNTICA"), (3, 2, "PROJETO EM ENGENHARIA FÍSICA"),
            (3, 2, ELECTIVE_SLOT),
        ]),
    }),
    "dbio": ("DEPARTAMENTO DE BIOLOGIA (DEMO)", {
        "LICENCIATURA EM BIOLOGIA (1º CICLO)": ("L1", 55, 0.0, [
            (1, 1, "BIOLOGIA CELULAR"), (1, 1, "QUÍMICA GERAL"), (1, 1, "MATEMÁTICA PARA BIOLOGIA"),
            (1, 2, "BOTÂNICA"), (1, 2, "ZOOLOGIA"), (1, 2, "BIOQUÍMICA"), (2, 1, "GENÉTICA"),
            (2, 1, "MICROBIOLOGIA"), (2, 1, "ESTATÍSTICA"), (2, 2, "ECOLOGIA"), (2, 2, "FISIOLOGIA ANIMAL"),
            (3, 1, "BIOLOGIA MOLECULAR"), (3, 1, "EVOLUÇÃO"), (3, 2, "BIOLOGIA MARINHA"), (3, 2, ELECTIVE_SLOT),
        ]),
        "MESTRADO EM BIOLOGIA MARINHA (2º CICLO)": ("M2", 20, 0.4, [
            (1, 1, "OCEANOGRAFIA"), (1, 1, "ECOLOGIA MARINHA"), (1, 2, "CONSERVAÇÃO"),
            (1, 2, "SEMINÁRIO"), (2, 2, "DISSERTAÇÃO"),
        ]),
    }),
    "degeit": ("DEPARTAMENTO DE ECONOMIA, GESTÃO, ENGENHARIA INDUSTRIAL E TURISMO (DEMO)", {
        "LICENCIATURA EM GESTÃO (1º CICLO)": ("L1", 70, -0.1, [
            (1, 1, "MICROECONOMIA"), (1, 1, "CONTABILIDADE FINANCEIRA"), (1, 1, "MATEMÁTICA PARA GESTÃO"),
            (1, 2, "MACROECONOMIA"), (1, 2, "INTRODUÇÃO À GESTÃO"), (1, 2, "ESTATÍSTICA"),
            (2, 1, "MARKETING"), (2, 1, "FINANÇAS EMPRESARIAIS"), (2, 1, "DIREITO EMPRESARIAL"),
            (2, 2, "GESTÃO DE OPERAÇÕES"), (2, 2, "ECONOMETRIA"), (3, 1, "ESTRATÉGIA"),
            (3, 1, "GESTÃO DE RECURSOS HUMANOS"), (3, 2, "EMPREENDEDORISMO"), (3, 2, ELECTIVE_SLOT),
        ]),
        "LICENCIATURA EM ECONOMIA (1º CICLO)": ("L1", 45, 0.1, [
            (1, 1, "MICROECONOMIA"), (1, 1, "MATEMÁTICA PARA GESTÃO"), (1, 1, "CONTABILIDADE FINANCEIRA"),
            (1, 2, "MACROECONOMIA"), (1, 2, "ESTATÍSTICA"), (1, 2, "HISTÓRIA ECONÓMICA"),
            (2, 1, "ECONOMETRIA"), (2, 1, "ECONOMIA PÚBLICA"), (2, 2, "ECONOMIA INTERNACIONAL"),
            (2, 2, "FINANÇAS EMPRESARIAIS"), (3, 1, "ECONOMIA MONETÁRIA"), (3, 1, "ECONOMIA DO DESENVOLVIMENTO"),
            (3, 2, "POLÍTICA ECONÓMICA"), (3, 2, ELECTIVE_SLOT),
        ]),
    }),
}

ACCESS_TYPES_L1 = [("Regime Geral", 0.80), ("Mudança de Curso", 0.05), ("Reingresso", 0.04),
                   ("Maiores de 23", 0.04), ("PALOPS", 0.03), ("Estudante Internacional", 0.04)]
ACCESS_TYPES_M2 = [("Regime Geral - Pós Graduação", 0.88), ("Estudante Internacional", 0.08), ("Reingresso", 0.04)]
REGIMES = [("Ordinário", 0.855), ("Trabalhador Estudante", 0.105), ("Agente Associativo - UA", 0.022),
           ("Dirigente Associativo Estudantil", 0.007), ("Estudante Atleta", 0.005),
           ("Agente Associativo - Lei 23/2006", 0.004), ("Bombeiro", 0.002)]

# outcome shifts by profile: (grade points, attendance log-odds)
ACCESS_EFFECT = {"Maiores de 23": (-0.6, -0.4), "PALOPS": (-0.8, -0.2), "Reingresso": (-0.4, -0.5),
                 "Mudança de Curso": (-0.2, -0.2), "Estudante Internacional": (-0.3, 0.0)}
REGIME_EFFECT = {"Trabalhador Estudante": (-0.8, -1.0), "Estudante Atleta": (-0.3, -0.3),
                 "Dirigente Associativo Estudantil": (-0.3, -0.2)}
YEAR_EFFECT = {2020: 0.9, 2021: 0.5}  # pandemic grade inflation

DURATION = {"L1": 3, "M2": 2}
MAX_EXTRA_YEARS = 3          # years a student may stay beyond the nominal duration
BASE_GRADE = 13.2            # expected Normal grade for an average student
GRADE_SD = 3.2
BASE_ATTENDANCE = 2.2        # log-odds of being evaluated in the Normal exam
P_RESIT = 0.88               # chance a failed student enrols in Recurso
P_RESIT_ATTEND = 0.70
P_RESIT_ATTEND_AFTER_ABSENCE = 0.25
P_IMPROVE = 0.06             # chance a passed student attempts Melhoria
P_EXTRAORDINARY = 0.20       # chance a finalist retaking a course uses Dezembro
P_RETAKE = 0.80              # chance a failed course is retaken next year
P_DROPOUT = 0.06             # yearly dropout chance, grows with failures


def weighted_choice(rng, options):
    return rng.choices([o for o, _ in options], weights=[w for _, w in options])[0]


def sigmoid(x):
    return 1 / (1 + math.exp(-x))


def clamp_grade(value):
    return int(min(max(round(value), 0), 20))


class Simulation:
    def __init__(self, seed, scale):
        self.rng = random.Random(seed)
        self.scale = scale
        self.next_student_id = 1
        self.course_trend = {}
        self.course_offset = {}

    def course_params(self, degree, course):
        # difficulty per (degree, course), yearly trend shared across degrees
        if course not in self.course_trend:
            self.course_trend[course] = self.rng.gauss(0, 0.12)
        key = (degree, course)
        if key not in self.course_offset:
            self.course_offset[key] = self.rng.gauss(0, 0.7)
        return DIFFICULTY.get(course, DEFAULT_DIFFICULTY) + self.course_offset[key], self.course_trend[course]

    def new_student(self, cycle, curriculum):
        rng = self.rng
        regime = weighted_choice(rng, REGIMES)
        worker = regime == "Trabalhador Estudante"
        student = {
            "id": self.next_student_id,
            "ability": rng.gauss(0, 1),
            "access": weighted_choice(rng, ACCESS_TYPES_L1 if cycle == "L1" else ACCESS_TYPES_M2),
            "regime": regime,
            "relocated": int(rng.random() < 0.78),
            "part_time": int(rng.random() < (0.2 if worker else 0.03)),
            "schedule": "PÓS-LABORAL" if worker and rng.random() < 0.3 else "DIURNO",
            # never an elective the degree already requires
            "elective": rng.choice([e for e in ELECTIVES if e not in {c for *_, c in curriculum}]),
        }
        self.next_student_id += 1
        return student

    def exam(self, mean, attendance_logit):
        # returns (nota, avaliado), unevaluated means nota 0
        if self.rng.random() >= sigmoid(attendance_logit):
            return 0, 0
        return clamp_grade(self.rng.gauss(mean, GRADE_SD)), 1

    def enrolment(self, student, degree_offset, degree, course, semester, year, is_retake, is_finalist):
        # exam attempts of one (student, course, year) as (epoch, type, nota, avaliado)
        rng = self.rng
        difficulty, trend = self.course_params(degree, course)
        grade_shift = ACCESS_EFFECT.get(student["access"], (0, 0))[0] + REGIME_EFFECT.get(student["regime"], (0, 0))[0]
        attend_shift = ACCESS_EFFECT.get(student["access"], (0, 0))[1] + REGIME_EFFECT.get(student["regime"], (0, 0))[1]
        mean = (BASE_GRADE + 2.0 * (student["ability"] + degree_offset) - difficulty
                + trend * (year - 2017) + YEAR_EFFECT.get(year, 0) + grade_shift - (0.5 if is_retake else 0))
        attendance = BASE_ATTENDANCE + 0.7 * student["ability"] - 0.3 * difficulty + attend_shift - (0.8 if is_retake else 0)

        attempts = []
        if is_retake and is_finalist and rng.random() < P_EXTRAORDINARY:
            attempts.append(("EXTRAORDINÁRIA", "Dezembro", *self.exam(mean - 0.5, attendance)))
        if not any(nota >= 10 for *_, nota, _ in attempts):
            attempts.append((f"{semester}º SEMESTRE", "Normal", *self.exam(mean, attendance)))
        passed = attempts[-1][2] >= 10
        if not passed and rng.random() < P_RESIT:
            # students absent from Normal rarely show up for Recurso
            p_attend = P_RESIT_ATTEND if attempts[-1][3] else P_RESIT_ATTEND_AFTER_ABSENCE
            if rng.random() < p_attend:
                attempts.append(("RECURSO", "Recurso", clamp_grade(rng.gauss(mean - 0.8, GRADE_SD)), 1))
            else:
                attempts.append(("RECURSO", "Recurso", 0, 0))
        elif passed and rng.random() < P_IMPROVE:
            if rng.random() < 0.95:
                attempts.append(("RECURSO", "Melhoria", clamp_grade(attempts[-1][2] + rng.gauss(1.2, 2.2)), 1))
            else:
                attempts.append(("RECURSO", "Melhoria", 0, 0))
        return attempts

    def simulate_student(self, dep_id, dep_name, degree, cycle, degree_offset, curriculum, entry_year):
        rng = self.rng
        student = self.new_student(cycle, curriculum)
        duration = DURATION[cycle]
        pending = set()
        for study_year in range(duration + MAX_EXTRA_YEARS):
            year = entry_year + study_year
            if year > YEARS[-1]:
                break
            curricular_year = study_year + 1
            courses = [(sem, c) for cy, sem, c in curriculum if cy == curricular_year]
            retakes = [(sem, c) for sem, c in sorted(pending) if rng.random() < P_RETAKE]
            if not courses and not retakes:
                if not pending:
                    break  # graduated
                continue
            is_finalist = curricular_year >= duration
            mobility = "Sim" if rng.random() < 0.015 else "Não"
            failures = 0
            for (semester, course), is_retake in [(c, False) for c in courses] + [(c, True) for c in retakes]:
                name = student["elective"] if course == ELECTIVE_SLOT else course
                attempts = self.enrolment(student, degree_offset, degree, name, semester, year, is_retake, is_finalist)
                if any(nota >= 10 for *_, nota, _ in attempts):
                    pending.discard((semester, course))
                else:
                    pending.add((semester, course))
                    failures += 1
                if year < YEARS[0]:
                    continue  # pre-2012 cohorts only contribute later years
                best = max(range(len(attempts)), key=lambda i: (attempts[i][2], -i))
                for i, (epoch, exam_type, nota, evaluated) in enumerate(attempts):
                    yield [
                        year, student["id"], student["access"], student["regime"], student["relocated"],
                        student["part_time"], student["schedule"], mobility, cycle, dep_id, dep_name,
                        epoch, exam_type, nota, "Sim" if i == best else "Não", int(nota >= 10), evaluated,
                        degree, name,
                    ]
            dropout = P_DROPOUT + 0.05 * failures - 0.03 * student["ability"]
            if rng.random() < dropout:
                break

    def degree_rows(self, dep_id, dep_name, degree, spec):
        cycle, intake, degree_offset, curriculum = spec
        duration = DURATION[cycle]
        for entry_year in range(YEARS[0] - duration - MAX_EXTRA_YEARS + 1, YEARS[-1] + 1):
            growth = 1 + 0.05 * max(entry_year - YEARS[0], 0)  # intake grows over the decade
            for _ in range(max(round(intake * self.scale * growth * self.rng.uniform(0.85, 1.15)), 1)):
                yield from self.simulate_student(dep_id, dep_name, degree, cycle, degree_offset, curriculum, entry_year)


def main():
    parser = argparse.ArgumentParser(description="generate synthetic demo data for the public deploy")
    parser.add_argument("output_dir", nargs="?", default="data/departments")
    parser.add_argument("--seed", type=int, default=2024)
    parser.add_argument("--scale", type=float, default=1.0, help="multiplier on yearly intake per degree")
    args = parser.parse_args()

    sim = Simulation(args.seed, args.scale)
    os.makedirs(args.output_dir, exist_ok=True)
    index = []
    exam_types = Counter()
    for dep_id, (dep_name, degrees) in DEPARTMENTS.items():
        count = 0
        with open(os.path.join(args.output_dir, f"{dep_id}.csv"), "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(COLUMNS)
            for degree, spec in degrees.items():
                for row in sim.degree_rows(dep_id, dep_name, degree, spec):
                    writer.writerow(row)
                    exam_types[row[12]] += 1
                    count += 1
        index.append({"id": dep_id, "name": dep_name, "rows": count})
        print(f"  -> {dep_id}.csv ({count:,} rows)")
    with open(os.path.join(args.output_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"{sum(d['rows'] for d in index):,} rows, {sim.next_student_id - 1:,} students; exam types: {dict(exam_types)}")


if __name__ == "__main__":
    main()
