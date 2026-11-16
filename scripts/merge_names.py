import pandas as pd
import os
from scripts.clean_fields import clean_fields

def merge_names(df, cursos_path, disciplinas_path):
    # check "cursos" and "departments"
    df_cursos = pd.read_csv(cursos_path)
    df_disciplinas = pd.read_csv(disciplinas_path)

    df_cursos.columns = df_cursos.columns.str.strip()
    df_disciplinas.columns = df_disciplinas.columns.str.strip()

    df_cursos["icursocod"] = pd.to_numeric(df_cursos["icursocod"], errors="coerce").astype("Int64")
    df_disciplinas["idisciplinaid"] = pd.to_numeric(df_disciplinas["idisciplinaid"], errors="coerce").astype("Int64")

    merged_df = df.merge(df_cursos, on="icursocod", how="inner")
    merged_df = merged_df.merge(df_disciplinas, on="idisciplinaid", how="inner")

    merged_df.drop(columns=["icursocod", "idisciplinaid"], inplace=True)

    return merged_df