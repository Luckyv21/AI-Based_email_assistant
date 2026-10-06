# Data pipeline

`generator.py` creates the reproducible synthetic fallback dataset at `data/raw/emails.csv`.

`prepare_dataset.py` cleans, deduplicates, stratifies, checks leakage, and writes train/validation/test CSV files under `data/splits/` plus `dataset_report.json` and `leakage_report.json`.

The synthetic data is for pipeline testing only and must not be treated as representative of real-world email distributions.
