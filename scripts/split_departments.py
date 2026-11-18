import json
import os
import re
import pandas as pd

def split_departments(df: pd.DataFrame, output_dir: str = "data/departments", dept_col: str = "dep_sigla_oficial"):
    os.makedirs(output_dir, exist_ok=True)

    unique_depts = df[dept_col].dropna().unique()
    index_entries = []

    for dept in sorted(unique_depts):
        subset = df[df[dept_col] == dept]
        safe_name = re.sub(r'[^\w\-_\. ]', '_', str(dept)).strip()
        file_path = os.path.join(output_dir, f"{safe_name}.csv")
        subset.to_csv(file_path, index=False)
        print(f"  -> {safe_name}.csv ({len(subset):,} registos)")
        index_entries.append({
            "id": safe_name,
            "name": str(subset["nomedepartamento"].dropna().iloc[0]) if "nomedepartamento" in subset else safe_name,
            "rows": len(subset),
        })

    write_department_index(index_entries, output_dir)


def write_department_index(entries, output_dir: str = "data/departments"):
    with open(os.path.join(output_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)