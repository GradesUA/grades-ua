# Grades UA

Grades UA is an interactive visual analytics dashboard for:
- Academic performance
- Student retention
- Curricular bottleneck diagnostics

## Installation

This is a private dataset so, it will only work if you have access to the data. If you do, please follow the steps below:

**1. Clone the repository**:
```bash
git clone https://github.com/GradesUA/grades-ua.git
```

**2. Move data into data folder**:
```bash
mv /path/to/notas-alunos-2012-2022-corrigido.csv grades-ua/data/notas-alunos-2012-2022-corrigido.csv
```

**2. Create and open venv**:
```bash
python3 -m venv venv
source venv/bin/activate
```

**3. Install dependencies**:
```bash
pip install -r requirements.txt
```

**4. Run the cleaning script**:
```bash
python clean.py
```
