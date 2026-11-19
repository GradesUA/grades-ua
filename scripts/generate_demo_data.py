import csv
import json
import os
import random
import sys

# fake data in the cleaned-CSV schema, used for the public demo deploy
SEED = 2024
YEARS = range(2012, 2023)
COLUMNS = [
    "ianolectivo", "nome_tipoacesso", "nome_regime", "deslocado", "tempoparcial", "regime_frequencia",
    "mobilidade", "sigla_grau", "dep_sigla_oficial", "nomedepartamento", "nvcepocaexame", "nvctipoexame",
    "nota", "notafinal", "avaliado", "nome_curso", "nome_disciplina",
]

DEPARTMENTS = {
    "demo-cs": ("DEMO DEPARTMENT OF COMPUTING", {
        "DEMO BSC IN SOFTWARE ENGINEERING": ("L1", 2014, ["Programming Fundamentals", "Discrete Mathematics", "Algorithms", "Databases", "Operating Systems", "Computer Networks", "Software Design", "Calculus I", "Linear Algebra", "Compilers"]),
        "DEMO MSC IN DATA SCIENCE": ("M1", 2012, ["Machine Learning", "Statistics", "Data Mining", "Visual Analytics", "Big Data", "Optimization", "Research Methods"]),
    }),
    "demo-bio": ("DEMO DEPARTMENT OF BIOLOGY", {
        "DEMO BSC IN BIOLOGY": ("L1", 2012, ["General Chemistry", "Cell Biology", "Genetics", "Biostatistics", "Ecology", "Microbiology", "Physiology", "Organic Chemistry"]),
        "DEMO MSC IN MARINE BIOLOGY": ("M1", 2012, ["Marine Ecology", "Oceanography", "Fisheries Science", "Conservation", "Field Methods"]),
    }),
    "demo-math": ("DEMO DEPARTMENT OF MATHEMATICS", {
        "DEMO BSC IN MATHEMATICS": ("L1", 2012, ["Calculus I", "Calculus II", "Real Analysis", "Abstract Algebra", "Probability", "Numerical Methods", "Topology", "Differential Equations"]),
    }),
    "demo-econ": ("DEMO DEPARTMENT OF ECONOMICS", {
        "DEMO BSC IN MANAGEMENT": ("L1", 2012, ["Microeconomics", "Macroeconomics", "Accounting", "Marketing", "Corporate Finance", "Business Law", "Operations Management", "Econometrics", "Strategy"]),
        "DEMO MSC IN FINANCE": ("M1", 2013, ["Asset Pricing", "Risk Management", "Financial Econometrics", "Derivatives", "Banking"]),
    }),
    "demo-eng": ("DEMO DEPARTMENT OF ENGINEERING", {
        "DEMO BSC IN MECHANICAL ENGINEERING": ("L1", 2012, ["Statics", "Thermodynamics", "Fluid Mechanics", "Materials Science", "Technical Drawing", "Control Systems", "Calculus I", "Physics I"]),
    }),
}

def build_rows(rng, dep_id, dep_name, degree, cycle, first_year, courses):
    for course in courses:
        base_pass = rng.uniform(0.35, 0.95)
        trend = rng.uniform(-0.015, 0.02)
        size = rng.randint(15, 80)
        for year in YEARS:
            if year < first_year:
                continue
            p_pass = min(max(base_pass + trend * (year - 2012) + rng.uniform(-0.06, 0.06), 0.1), 0.98)
            for _ in range(max(int(size * rng.uniform(0.7, 1.3)), 5)):
                regime = rng.random() < 0.12
                relocated = int(rng.random() < 0.35)
                evaluated = rng.random() > 0.08
                grade = min(max(round(rng.gauss(10 + 6 * (p_pass - 0.5) * 2, 3.2)), 0), 20) if evaluated else 0
                passed = evaluated and grade >= 10
                common = [
                    "Regime Geral" if rng.random() < 0.8 else "Maiores de 23", "Ordinário" if not regime else "Trabalhador-Estudante",
                    relocated, int(regime), "DIURNO" if not regime else "PÓS-LABORAL", "Não", cycle, dep_id, dep_name,
                ]
                yield year, common, "1º SEMESTRE", "Normal", grade, passed, int(evaluated), degree, course
                if not passed and rng.random() < 0.55:
                    resit = min(max(round(rng.gauss(9.5, 3)), 0), 20)
                    yield year, common, "RECURSO", "Recurso", resit, resit >= 10, 1, degree, course

def main(output_dir):
    rng = random.Random(SEED)
    os.makedirs(output_dir, exist_ok=True)
    index = []
    for dep_id, (dep_name, degrees) in DEPARTMENTS.items():
        count = 0
        with open(os.path.join(output_dir, f"{dep_id}.csv"), "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(COLUMNS)
            for degree, (cycle, first_year, courses) in degrees.items():
                for year, common, epoch, exam_type, grade, passed, evaluated, degree_name, course in build_rows(rng, dep_id, dep_name, degree, cycle, first_year, courses):
                    writer.writerow([year, *common, epoch, exam_type, grade, "Sim" if passed else "Não", evaluated, degree_name, course])
                    count += 1
        index.append({"id": dep_id, "name": dep_name, "rows": count})
        print(f"{dep_id}: {count} rows")
    with open(os.path.join(output_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/departments")
