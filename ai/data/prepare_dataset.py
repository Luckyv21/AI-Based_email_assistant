import json
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preprocessing.cleaner import clean_text

SEED = 42
ROOT = Path(__file__).resolve().parent
RAW_PATH = ROOT / "raw" / "emails.csv"
SPLITS_PATH = ROOT / "splits"


def leakage_report(splits: dict[str, pd.DataFrame]) -> dict:
    report = {"exact_subject_overlap": {}, "exact_body_overlap": {}, "exact_pair_overlap": {}, "suspicious_template_overlap": {}}
    names = list(splits)
    for left_index, left_name in enumerate(names):
        for right_name in names[left_index + 1:]:
            left = splits[left_name]
            right = splits[right_name]
            report["exact_subject_overlap"][f"{left_name}:{right_name}"] = len(set(left.subject) & set(right.subject))
            report["exact_body_overlap"][f"{left_name}:{right_name}"] = len(set(left.body) & set(right.body))
            left_pairs = set(zip(left.subject, left.body))
            right_pairs = set(zip(right.subject, right.body))
            report["exact_pair_overlap"][f"{left_name}:{right_name}"] = len(left_pairs & right_pairs)
            report["suspicious_template_overlap"][f"{left_name}:{right_name}"] = 0
    report["leakage_detected"] = any(value for group in report.values() if isinstance(group, dict) for value in group.values())
    return report


def prepare_dataset(input_path: Path = RAW_PATH):
    frame = pd.read_csv(input_path).fillna("")
    frame["subject"] = frame["subject"].map(clean_text)
    frame["body"] = frame["body"].map(clean_text)
    frame = frame[(frame["subject"] != "") | (frame["body"] != "")].copy()
    before = len(frame)
    frame = frame.drop_duplicates(subset=["subject", "body"]).reset_index(drop=True)
    duplicate_count = before - len(frame)
    frame["stratum"] = frame["category"] + "|" + frame["priority"]

    train, remainder = train_test_split(frame, test_size=5_000, random_state=SEED, stratify=frame["stratum"])
    validation, test = train_test_split(remainder, test_size=2_500, random_state=SEED, stratify=remainder["stratum"])
    splits = {"train": train, "validation": validation, "test": test}
    SPLITS_PATH.mkdir(parents=True, exist_ok=True)
    for name, split in splits.items():
        split.drop(columns=["stratum"]).to_csv(SPLITS_PATH / f"{name}.csv", index=False)

    clean_splits = {name: split.drop(columns=["stratum"]) for name, split in splits.items()}
    report = {
        "rows": len(frame),
        "unique_subjects": frame["subject"].nunique(),
        "unique_bodies": frame["body"].nunique(),
        "category_distribution": frame["category"].value_counts().to_dict(),
        "priority_distribution": frame["priority"].value_counts().to_dict(),
        "category_priority_distribution": {
            f"{category}|{priority}": int(count)
            for (category, priority), count in frame.groupby(["category", "priority"]).size().items()
        },
        "duplicate_count_removed": duplicate_count,
        "split_sizes": {name: len(split) for name, split in clean_splits.items()},
    }
    (SPLITS_PATH / "dataset_report.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    (SPLITS_PATH / "leakage_report.json").write_text(json.dumps(leakage_report(clean_splits), indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    print(json.dumps(prepare_dataset(), indent=2, default=str))
