import json
import sys
from pathlib import Path

import pandas as pd
import torch
from sklearn.metrics import classification_report
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from preprocessing.tokenizer import load_tokenizer  # noqa: E402
from training.metrics import classification_metrics  # noqa: E402
from training.model import MultiTaskBertClassifier  # noqa: E402
from training.train import EmailDataset, CATEGORY_LABELS, PRIORITY_LABELS  # noqa: E402


def evaluate(model_dir=ROOT / "models/trained", split="test"):
    model_dir = Path(model_dir)
    config = json.loads((model_dir / "training_config.json").read_text(encoding="utf-8"))
    tokenizer = load_tokenizer(str(model_dir), config["max_seq_length"], local_files_only=True)
    model = MultiTaskBertClassifier(str(model_dir), local_files_only=True)
    heads = torch.load(model_dir / "heads.pt", map_location="cpu")
    model.category_head.load_state_dict(heads["category_head"])
    model.priority_head.load_state_dict(heads["priority_head"])
    frame = pd.read_csv(ROOT / f"data/splits/{split}.csv")
    loader = DataLoader(EmailDataset(frame, tokenizer, config["max_seq_length"]), batch_size=config["batch_size"])
    category_labels, category_predictions, priority_labels, priority_predictions = [], [], [], []
    model.eval()
    with torch.no_grad():
        for batch in loader:
            output = model(input_ids=batch["input_ids"], attention_mask=batch["attention_mask"])
            category_labels.extend(batch["category_labels"].tolist())
            category_predictions.extend(output.category_logits.argmax(1).tolist())
            priority_labels.extend(batch["priority_labels"].tolist())
            priority_predictions.extend(output.priority_logits.argmax(1).tolist())
    category = classification_metrics(category_labels, category_predictions)
    priority = classification_metrics(priority_labels, priority_predictions)
    result = {"split": split, "category": category, "priority": priority, "combined_f1_macro": (category["f1_macro"] + priority["f1_macro"]) / 2, "limitations": ["This is synthetic data and is not evidence of real-world performance.", "Inspect leakage_report.json and template overlap before interpreting scores."]}
    output = ROOT / "experiments" / f"evaluation_{split}.json"
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    (ROOT / "experiments" / f"classification_report_{split}.json").write_text(json.dumps({"category": classification_report(category_labels, category_predictions, output_dict=True), "priority": classification_report(priority_labels, priority_predictions, output_dict=True)}, indent=2), encoding="utf-8")
    return result


def config_from_dir(model_dir):
    from transformers import BertConfig
    return BertConfig.from_pretrained(model_dir, local_files_only=True)


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2))
