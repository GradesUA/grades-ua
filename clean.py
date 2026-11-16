import os
import pandas as pd
from scripts.clean_fields import clean_fields
from scripts.merge_names import merge_names
from scripts.split_departments import split_departments

def main():
    raw_path = "data/notas-alunos-2012-2022-corrigido.csv"
    cursos_path = "data/cursos_nomes.csv"
    disciplinas_path = "data/disciplinas_nomes.csv"
    output_clean = "data/notas_cleaned.csv"
    departments_dir = "data/departments"

    fields_to_drop = [
        "id_estudante",
        "mob_duracao_datainicial",
        "mob_nomeduracaoprograma",
        "aprovado",
        "naoaprovado",
        "naoavaliado"
    ]

    print("[1/4] Loading raw dataset...")
    df = pd.read_csv(raw_path)

    print("[2/4] Cleaning fields...")
    df = clean_fields(fields_to_drop, df)

    print("[3/4] Merging course and degree names...")
    df = merge_names(df, cursos_path, disciplinas_path)
    df.to_csv(output_clean, index=False)

    print("[4/4] Splitting by department...")
    split_departments(df, output_dir=departments_dir)
    
if __name__ == "__main__":
    main()