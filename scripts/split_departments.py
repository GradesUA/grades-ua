import os
import re
import pandas as pd

def split_departments(df: pd.DataFrame, output_dir: str = "data/departments", dept_col: str = "dep_sigla_oficial"):
    os.makedirs(output_dir, exist_ok=True)

    unique_depts = df[dept_col].dropna().unique()

    for dept in sorted(unique_depts):
        subset = df[df[dept_col] == dept]
        safe_name = re.sub(r'[^\w\-_\. ]', '_', str(dept)).strip()
        file_path = os.path.join(output_dir, f"{safe_name}.csv")
        subset.to_csv(file_path, index=False)
        print(f"  -> {safe_name}.csv ({len(subset):,} registos)")