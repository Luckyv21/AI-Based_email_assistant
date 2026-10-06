import json
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset
from tqdm import tqdm
from torch.optim import AdamW
from sklearn.metrics import f1_score

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from preprocessing.cleaner import combine_subject_body  # noqa: E402
from preprocessing.tokenizer import load_tokenizer  # noqa: E402
from training.config import TrainingConfig  # noqa: E402
from training.model import MultiTaskBertClassifier  # noqa: E402

CATEGORY_LABELS = {"Education": 0, "Office": 1, "Personal": 2}
PRIORITY_LABELS = {"Important": 0, "Normal": 1}


class EmailDataset(Dataset):
    def __init__(self, frame, tokenizer, max_length):
        texts = [combine_subject_body(row.subject, row.body) for row in frame.itertuples()]
        self.tokens = tokenizer(texts, padding=True, truncation=True, max_length=max_length, return_tensors="pt")
        self.category = torch.tensor([CATEGORY_LABELS[value] for value in frame.category], dtype=torch.long)
        self.priority = torch.tensor([PRIORITY_LABELS[value] for value in frame.priority], dtype=torch.long)

    def __len__(self):
        return len(self.category)

    def __getitem__(self, index):
        return {key: value[index] for key, value in self.tokens.items()} | {"category_labels": self.category[index], "priority_labels": self.priority[index]}


def seed_everything(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available(): torch.cuda.manual_seed_all(seed)


def train(config=TrainingConfig()):
    seed_everything(config.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = load_tokenizer(config.backbone, config.max_seq_length)
    train_frame = pd.read_csv(ROOT / "data/splits/train.csv")
    validation_frame = pd.read_csv(ROOT / "data/splits/validation.csv")
    train_loader = DataLoader(EmailDataset(train_frame, tokenizer, config.max_seq_length), batch_size=config.batch_size, shuffle=True)
    validation_loader = DataLoader(EmailDataset(validation_frame, tokenizer, config.max_seq_length), batch_size=config.batch_size)
    model = MultiTaskBertClassifier(config.backbone).to(device)
    optimizer = AdamW(model.parameters(), lr=config.learning_rate)
    scaler = torch.cuda.amp.GradScaler(enabled=device.type == "cuda")
    best_f1 = -1.0
    history = []

    for epoch in range(config.epochs):
        model.train()
        train_loss = 0.0
        for batch in tqdm(train_loader, desc=f"epoch {epoch + 1}"):
            batch = {key: value.to(device) for key, value in batch.items()}
            optimizer.zero_grad()
            with torch.autocast(device_type="cuda", enabled=device.type == "cuda"):
                output = model(**batch)
            scaler.scale(output.loss).backward()
            scaler.step(optimizer)
            scaler.update()
            train_loss += output.loss.item()

        validation_loss, validation_f1 = validate(model, validation_loader, device)
        history.append({"epoch": epoch + 1, "train_loss": train_loss / len(train_loader), "validation_loss": validation_loss, "validation_combined_f1": validation_f1})
        if validation_f1 > best_f1:
            best_f1 = validation_f1
            output_dir = ROOT / config.output_dir
            output_dir.mkdir(parents=True, exist_ok=True)
            model.encoder.save_pretrained(output_dir)
            torch.save({"category_head": model.category_head.state_dict(), "priority_head": model.priority_head.state_dict()}, output_dir / "heads.pt")
            tokenizer.save_pretrained(output_dir)
            (output_dir / "label_mappings.json").write_text(json.dumps({"category": CATEGORY_LABELS, "priority": PRIORITY_LABELS}, indent=2), encoding="utf-8")
            (output_dir / "training_config.json").write_text(json.dumps(config.__dict__, indent=2), encoding="utf-8")

    (ROOT / "experiments/training_history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    return history


def validate(model, loader, device):
    model.eval()
    losses, category_labels, category_predictions, priority_labels, priority_predictions = [], [], [], [], []
    with torch.no_grad():
        for batch in loader:
            batch = {key: value.to(device) for key, value in batch.items()}
            output = model(**batch)
            losses.append(output.loss.item())
            category_labels.extend(batch["category_labels"].cpu().tolist())
            category_predictions.extend(output.category_logits.argmax(1).cpu().tolist())
            priority_labels.extend(batch["priority_labels"].cpu().tolist())
            priority_predictions.extend(output.priority_logits.argmax(1).cpu().tolist())
    category_f1 = f1_score(category_labels, category_predictions, average="macro")
    priority_f1 = f1_score(priority_labels, priority_predictions, average="macro")
    return sum(losses) / len(losses), float((category_f1 + priority_f1) / 2)


if __name__ == "__main__":
    train()
