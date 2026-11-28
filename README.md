# Grades UA

Grades UA is an interactive visual analytics dashboard for:
- Academic performance
- Student retention
- Curricular bottleneck diagnostics

## Installation

This is a private dataset, so it will only work if you have access to the data. If you do, please follow the steps below:

**1. Clone the repository**:
```bash
git clone https://github.com/GradesUA/grades-ua.git
```

**2. Move data into data folder**:
```bash
mv /path/to/notas-alunos-2012-2022-corrigido.csv grades-ua/data/notas-alunos-2012-2022-corrigido.csv
```

**3. Create and open venv**:
```bash
python3 -m venv venv
source venv/bin/activate
```

**4. Install dependencies**:
```bash
pip install pandas
npm ci
```

**5. Run the cleaning script**:
```bash
python clean.py
```

**6. Serve the dashboard** from the repository root:
```bash
python3 -m http.server 8000   # open http://localhost:8000/src/
```

Without the private dataset, generate synthetic data instead: `python3 scripts/generate_demo_data.py data/departments`.

## Column reference

| Column | Type | Nulls | Observed values | Meaning |
|---|---|---|---|---|
| `ianolectivo` | int | 0 | 2012 to 2022 | academic year start (2012 = 2012/13). Rows per year grow from 43.8k (2012) to 93.5k (2022) in the cleaned data |
| `id_estudante` | int | 0 | 28,854 distinct (cleaned) | anonymised student id, stable across years and degrees |
| `nome_tipoacesso` | str | 0 | 20 values: `Regime Geral` (65.7%), `Regime Geral - Pós Graduação`, `mudança de curso por cessação de ciclo de estudos e acreditação de novo ciclo`, `Mudança de Curso`, `Reingresso`, `Maiores de 23`, `PALOPS`, `Estudante Internacional`, `Regime Geral - Prosseguimento de Estudos`, `Cand. Especiais - ...` (3 variants), `Transferência`, `Atleta de Alta Competição`, `Mobilidade - Dupla Titulação`, `ERASMUS - MUNDUS`, `Naturais e filhos de naturais de Timor-Leste`, `Estudantes em situação de emergência oriundos da Ucrânia`, `Adequação de curso referente ao processo de Bolonha` | admission route. `Regime Geral - Pós Graduação*` and `Prosseguimento de Estudos` occur only with `M2`; most others only with `L1`. Constant within a student-year (17% of students change it across years, e.g. when moving to a master's) |
| `nome_regime` | str | 0 | `Ordinário` (85.7%), `Trabalhador Estudante` (10.7%), `Agente Associativo - UA`, `Dirigente Associativo Estudantil`, `Estudante Atleta`, `Agente Associativo - Lei 23/2006`, `Bombeiro` | attendance/statute regime. Constant within a student-year, changes across years for 11% of students |
| `deslocado` | int 0/1 | 0 | 1 = 84.1% | 1 = relocated (studies away from home), 0 = local |
| `tempoparcial` | int 0/1 | 0 | 1 = 4.6% | 1 = part-time enrolment. Correlated with `Trabalhador Estudante` (19% part-time vs 3% for `Ordinário`) |
| `regime_frequencia` | str | 0 | `DIURNO` (95.3%), `NOTURNO`, `PÓS-LABORAL`, `MISTO` | class schedule of the degree |
| `mobilidade` | str | 0 | `Não` (98.6%), `Sim` | student in an exchange/mobility programme that year. In the raw file `Sim` comes with `mob_nomeduracaoprograma` filled in 99.9% of cases |
| `mob_duracao_datainicial` | datetime | raw only, empty unless mobility | e.g. `2013-10-01 00:00:00` | mobility start date (dropped by `clean.py`) |
| `mob_nomeduracaoprograma` | str | raw only, empty unless mobility | `Um semestre letivo`, `Um ano letivo`, `Um trimestre letivo` | mobility duration (dropped by `clean.py`) |
| `icursocod` | int | raw only | 217 named + 69 unnamed ids | degree id (dropped by `clean.py` after the name merge) |
| `sigla_grau` | str | 0 | raw: `L1`, `MI`, `M2`. cleaned: `L1` (86.8%), `M2` | degree cycle: `L1` = bachelor (`LICENCIATURA ... (1º CICLO)`), `M2` = master (`MESTRADO ... (2º CICLO)`), `MI` = integrated master (not present after cleaning) |
| `dep_sigla_oficial` | str | 0 | 20 ids in the cleaned data (`isca-ua`, `dlc`, `degeit`, `dq`, `dbio`, `deti`, ...); raw also has `sacs` | department/school owning the degree, used as the file name in `data/departments/` |
| `nomedepartamento` | str | 0 | e.g. `DEPARTAMENTO DE ELETRÓNICA, TELECOMUNICAÇÕES E INFORMÁTICA` | full name of `dep_sigla_oficial` (1:1) |
| `idisciplinaid` | int | raw only | 2,657 named + 1,624 unnamed ids | subject id (dropped by `clean.py`) |
| `nvcepocaexame` | str | 0 | `1º SEMESTRE`, `2º SEMESTRE`, `ANUAL`, `RECURSO`, `EXTRAORDINÁRIA`, `ESPECIAL` | exam period, see below |
| `nvctipoexame` | str | 0 | `Normal`, `Recurso`, `Melhoria`, `Dezembro`, `Semestral`, `Especial` | exam type, see below |
| `nota` | int | 0 | 0 to 20, integers only | grade of this attempt. **Always 0 when `avaliado = 0`**. 0 also occurs for evaluated attempts (56,054 raw rows) |
| `notafinal` | str | 0 | `Sim`, `Não` | marks the attempt that holds the enrolment's **final grade**. Not a pass flag, see below |
| `aprovado` | int 0/1 | 0 | 1 = 58.8% of rows | 1 iff this attempt was passed. **Exactly `nota >= 10`** (0 mismatches) |
| `naoaprovado` | int 0/1 | raw only | | always `1 - aprovado` (dropped by `clean.py`) |
| `avaliado` | int 0/1 | 0 | 1 = 75.7% of rows | 1 if the student was assessed in this attempt, 0 = did not show up / not assessed |
| `naoavaliado` | int 0/1 | raw only | | always `1 - avaliado` (dropped by `clean.py`) |
| `nome_curso` | str | 0 | 132 degrees after cleaning | degree name, from `cursos_nomes.csv` |
| `nome_disciplina` | str | 0 | 1,477 subjects after cleaning | subject name, from `disciplinas_nomes.csv`. Casing is inconsistent (`Cálculo I` next to `QUÍMICA BIORGÂNICA`); normalise before comparing |

## Exam periods and types

| `nvctipoexame` | `nvcepocaexame` | Meaning | Rows | Pass rate of attempt |
|---|---|---|---|---|
| `Normal` | `1º SEMESTRE`, `2º SEMESTRE`, `ANUAL` | regular period, first attempt of every enrolment | 1,014,821 | 67% |
| `Recurso` | `RECURSO` | resit period. Sat almost only after a failed or missed `Normal` (Normal passed in 0.17% of Normal+Recurso enrolments) | 305,701 | 29% |
| `Melhoria` | `RECURSO` (99.7%), rarely `1º/2º SEMESTRE`, `ANUAL`, `ESPECIAL` | grade improvement after a pass (the Normal attempt was passed in 99.8% of Normal+Melhoria enrolments) | 40,590 | 91% |
| `Dezembro` | `EXTRAORDINÁRIA` | extraordinary December period, taken **after** failing Normal and Recurso (in Dezembro+Normal+Recurso enrolments, Normal passes 0.0% and Recurso 0.1%, Dezembro 34%) | 25,672 | 34% |
| `Especial` | `1º SEMESTRE`, `2º SEMESTRE` | special period, also taken after failing Normal and Recurso (Especial passes 59%, Normal 0%, Recurso 5% in those enrolments) | 584 | 47% |
| `Semestral` | `1º SEMESTRE`, `2º SEMESTRE` | additional semester exam, mostly after failing Normal and Recurso (`Normal+Recurso+Semestral`: Normal 0%, Recurso 2%, Semestral 46%) | 3,070 | 47% |

The `ESPECIAL` period value (32 rows) only holds `Melhoria` attempts. It is not the same thing as the `Especial` exam type.

## Rules

All rules below use the deduplicated attempts and the enrolment key defined above.

**Attempt level**
- Passed attempt: `aprovado == 1` (equivalently `nota >= 10`).
- Not assessed attempt: `avaliado == 0` (then `nota == 0`, `aprovado == 0`).
- Failed attempt (assessed): `avaliado == 1 && aprovado == 0`.

**`notafinal`**
- The `notafinal == "Sim"` row always carries the **highest `nota`** of the enrolment, and it is passed **if and only if** any attempt of the enrolment was passed.
- When several attempts share the highest grade, which one is flagged is not consistent, so do not rely on the flagged row's exam type.
- Therefore: we use `notafinal == "Sim"` to pick **the final grade** of an enrolment (or simply `max(nota)`), and never as a pass indicator. Of the 1,015,626 `Sim` rows, 234,241 are fails: 100,052 assessed fails and 134,189 not-assessed attempts.

**Enrolment level**

| Outcome | Definition |
|---|---|
| Passed | `max(aprovado) == 1` over all attempts (77.3% of enrolments) |
| Final grade | `max(nota)` (= `nota` of the `notafinal == "Sim"` row) |
| Not evaluated / dropout | `max(avaliado) == 0`: the student never sat any exam (12.9%) |
| Evaluated but failed | `max(avaliado) == 1 && max(aprovado) == 0` (9.9%) |
| Passed in regular period | the `Normal` attempt has `aprovado == 1` (67.5% of enrolments) |
| Passed in resit | not passed in `Normal` and the `Recurso` attempt has `aprovado == 1` (8.7%) |
| Passed in December / special / semestral period | not passed in `Normal` nor `Recurso`, and the `Dezembro` / `Especial` / `Semestral` attempt has `aprovado == 1` (1.1% / 0.03% / 0.2% of passed enrolments) |
| Failed a specific period | that period's attempt has `avaliado == 1 && aprovado == 0` |
| Missed a specific period | that period's attempt has `avaliado == 0` |
| Improved | has a `Melhoria` attempt. A `Melhoria` never decides pass or fail; it only matters for the final grade |

Shares of passed enrolments by the period that produced the pass: Normal 82.8%, Recurso 11.2%, Normal then Melhoria 4.6%, Dezembro 1.1%, Semestral 0.2%, Especial 0.03%.

Never-evaluated enrolments are mostly `Normal+Recurso` with both attempts not assessed (77%) or a lone `Normal` not assessed (19%).