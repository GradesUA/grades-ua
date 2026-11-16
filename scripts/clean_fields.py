import pandas as pd

def clean_fields(fields_to_clean, df):
    # remove fields
    for field in fields_to_clean:
        if field in df.columns:
            df.drop(columns=[field], inplace=True)

    str_cols = df.select_dtypes(include=["object"]).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
        df[col] = df[col].replace(["nan", "None", "", "null"], pd.NA)

    # substitute comma with dot and convert to numeric
    if "nota" in df.columns:
        clean_grade = df["nota"].astype(str).str.replace(",", ".", regex=False)
        df["nota"] = pd.to_numeric(
            clean_grade.str.extract(r"(\d+\.?\d*)")[0], errors="coerce"
        )

    # convert id columns to numeric
    for id_col in ["icursocod", "idisciplinaid"]:
        if id_col in df.columns:
          df[id_col] = pd.to_numeric(df[id_col], errors="coerce").astype("Int64")

    return df