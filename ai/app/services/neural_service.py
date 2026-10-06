import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
import torch.nn as nn
from transformers import AutoTokenizer, DistilBertConfig, DistilBertModel

from app.schemas import (
    ExtractedEntity,
    ExtractedEvent,
    PredictionResponse,
)

logger = logging.getLogger(__name__)


class SECDMultiTaskClassifier(nn.Module):
    """Multi-task classifier head on top of DistilBERT for category and priority."""

    def __init__(self, weights_path: str, device: torch.device):
        super().__init__()
        self.distilbert = DistilBertModel(DistilBertConfig())
        self.category_classifier = nn.Linear(768, 3)
        self.priority_classifier = nn.Linear(768, 3)
        self.priority_loss_fn = nn.Module()
        self.priority_loss_fn.weight = nn.Parameter(torch.ones(3))

        logger.info("Loading SECD model weights from %s", weights_path)
        state_dict = torch.load(weights_path, map_location=device)
        self.load_state_dict(state_dict, strict=False)
        self.to(device)
        self.eval()

    def forward(self, input_ids: torch.Tensor, attention_mask: Optional[torch.Tensor] = None, **kwargs):
        distil_out = self.distilbert(input_ids=input_ids, attention_mask=attention_mask)
        cls_rep = distil_out[0][:, 0]
        cat_logits = self.category_classifier(cls_rep)
        pri_logits = self.priority_classifier(cls_rep)
        return cat_logits, pri_logits


class BiLSTMEventExtractor(nn.Module):
    """DistilBERT + BiLSTM Multi-Head NER for Event, Date, Time, and Location."""

    def __init__(self, weights_path: str, device: torch.device):
        super().__init__()
        self.distilbert = DistilBertModel(DistilBertConfig())
        self.bilstm = nn.LSTM(
            input_size=768,
            hidden_size=256,
            num_layers=1,
            bidirectional=True,
            batch_first=True,
        )
        self.event_classifier = nn.Linear(512, 3)
        self.date_classifier = nn.Linear(512, 3)
        self.time_classifier = nn.Linear(512, 3)
        self.location_classifier = nn.Linear(512, 3)

        logger.info("Loading Event Extraction model weights from %s", weights_path)
        state_dict = torch.load(weights_path, map_location=device)
        self.load_state_dict(state_dict, strict=True)
        self.to(device)
        self.eval()

    def forward(self, input_ids: torch.Tensor, attention_mask: Optional[torch.Tensor] = None, **kwargs):
        distil_out = self.distilbert(input_ids=input_ids, attention_mask=attention_mask)
        seq_rep = distil_out[0]
        lstm_out, _ = self.bilstm(seq_rep)
        return {
            "EVENT": self.event_classifier(lstm_out),
            "DATE": self.date_classifier(lstm_out),
            "TIME": self.time_classifier(lstm_out),
            "LOCATION": self.location_classifier(lstm_out),
        }


class DualModelAIService:
    """Orchestrates both the SECD MultiTask model and BiLSTM Event Extractor."""

    name = "neural-dual-models"

    def __init__(
        self,
        secd_model_dir: str,
        event_model_dir: str,
        max_seq_length: int = 512,
        device_str: str = "auto",
    ):
        self.secd_path = Path(secd_model_dir)
        self.event_path = Path(event_model_dir)
        self.max_seq_length = max_seq_length

        if device_str == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device_str)

        logger.info("Initializing DualModelAIService on device: %s", self.device)

        # 1. Load SECD mappings and tokenizer
        mapping_file = self.secd_path / "label_mappings.json"
        if mapping_file.exists():
            with open(mapping_file, "r", encoding="utf-8") as f:
                mappings = json.load(f)
                self.category_labels = {int(k): v for k, v in mappings.get("category", {}).items()}
                self.priority_labels = {int(k): v for k, v in mappings.get("priority", {}).items()}
        else:
            self.category_labels = {0: "Office", 1: "Education", 2: "Personal"}
            self.priority_labels = {0: "Normal", 1: "Important", 2: "Urgent"}

        self.secd_tokenizer = AutoTokenizer.from_pretrained(str(self.secd_path))
        self.secd_model = SECDMultiTaskClassifier(
            str(self.secd_path / "pytorch_model.bin"), device=self.device
        )

        # 2. Load Event Extractor tokenizer and model
        self.event_tokenizer = AutoTokenizer.from_pretrained(str(self.event_path))
        self.event_model = BiLSTMEventExtractor(
            str(self.event_path / "pytorch_model.bin"), device=self.device
        )

        # Thresholds tuned from inference_config.json
        self.entity_thresholds = {
            "EVENT": 0.45,
            "DATE": 0.25,
            "TIME": 0.25,
            "LOCATION": 0.35,
        }

    def _prepare_text(self, subject: str, body: str) -> str:
        subj = (subject or "").strip()
        bdy = (body or "").strip()
        if subj and bdy:
            return f"Subject: {subj}\n\n{bdy}"
        return subj or bdy or "No content"

    def predict_classification_and_priority(self, full_text: str) -> Tuple[str, float, str, float]:
        encoded = self.secd_tokenizer(
            full_text,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_seq_length,
        ).to(self.device)

        with torch.no_grad():
            cat_logits, pri_logits = self.secd_model(
                input_ids=encoded["input_ids"],
                attention_mask=encoded["attention_mask"],
            )
            cat_probs = torch.softmax(cat_logits, dim=-1)[0]
            pri_probs = torch.softmax(pri_logits, dim=-1)[0]

        cat_idx = int(cat_probs.argmax())
        pri_idx = int(pri_probs.argmax())

        category = self.category_labels.get(cat_idx, "Office")
        category_conf = float(cat_probs[cat_idx])

        priority = self.priority_labels.get(pri_idx, "Normal")
        priority_conf = float(pri_probs[pri_idx])

        return category, category_conf, priority, priority_conf

    def extract_entities(self, full_text: str) -> Dict[str, List[Dict[str, Any]]]:
        encoded = self.event_tokenizer(
            full_text,
            return_offsets_mapping=True,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_seq_length,
        )
        offsets = encoded.pop("offset_mapping")[0].tolist()
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded["attention_mask"].to(self.device)

        with torch.no_grad():
            head_outputs = self.event_model(input_ids=input_ids, attention_mask=attention_mask)

        extracted: Dict[str, List[Dict[str, Any]]] = {}

        for head_name, logits in head_outputs.items():
            probs = torch.softmax(logits, dim=-1)[0].cpu()  # [seq_len, 3]
            threshold = self.entity_thresholds.get(head_name, 0.35)

            spans = []
            current_span = None

            for (start, end), p in zip(offsets, probs):
                if start == end:  # Special token
                    if current_span:
                        spans.append(current_span)
                        current_span = None
                    continue

                p_entity = float(p[1] + p[2])  # P(B) + P(I)
                pred_label = int(p.argmax())

                if pred_label > 0 or p_entity >= threshold:
                    if pred_label == 1 or current_span is None:
                        if current_span:
                            spans.append(current_span)
                        current_span = [start, end, p_entity]
                    else:
                        current_span[1] = end
                        current_span[2] = max(current_span[2], p_entity)
                else:
                    if current_span:
                        spans.append(current_span)
                        current_span = None

            if current_span:
                spans.append(current_span)

            items = []
            seen = set()
            for s, e, conf in spans:
                raw_span = full_text[s:e].strip()
                # Clean edge punctuation
                clean = re.sub(r"^[\s,;:!?.()\[\]\"']+|[\s,;:!?.()\[\]\"']+$", "", raw_span)
                if len(clean) >= 2 and clean.lower() not in seen:
                    seen.add(clean.lower())
                    items.append({"text": clean, "confidence": round(conf, 3)})

            extracted[head_name] = items

        return extracted

    def synthesize_events(
        self, subject: str, entities: Dict[str, List[Dict[str, Any]]]
    ) -> List[ExtractedEvent]:
        events_found = entities.get("EVENT", [])
        dates_found = entities.get("DATE", [])
        times_found = entities.get("TIME", [])
        locations_found = entities.get("LOCATION", [])

        # Flatten raw entities for detailed inspectability
        raw_entities = []
        for ent_type, ent_list in entities.items():
            for ent in ent_list:
                raw_entities.append(
                    ExtractedEntity(
                        type=ent_type,  # type: ignore
                        text=ent["text"],
                        confidence=ent["confidence"],
                    )
                )

        # If there are no date, time, event, or location entities, no event detected
        if not (events_found or dates_found or times_found or locations_found):
            return []

        # We construct structured event objects
        constructed_events: List[ExtractedEvent] = []

        primary_date = dates_found[0]["text"] if dates_found else None
        primary_time = times_found[0]["text"] if times_found else None
        primary_location = locations_found[0]["text"] if locations_found else None

        # Choose the best event title
        # Prioritize noun phrases like "Quarterly Review Meeting", "Project Kickoff"
        meeting_regex = re.compile(
            r"\b(meeting|sync|call|review|standup|interview|seminar|session|webinar|conference|workshop|exam|class|presentation|catch-up)\b",
            re.IGNORECASE,
        )

        chosen_title = None
        for ev in events_found:
            text = ev["text"]
            if meeting_regex.search(text):
                chosen_title = text
                break

        if not chosen_title and events_found:
            # Pick longest or highest confidence
            chosen_title = sorted(events_found, key=lambda x: len(x["text"]), reverse=True)[0]["text"]

        # If no event token found but date/time detected, fallback to subject
        if not chosen_title:
            if subject and len(subject.strip()) > 3:
                chosen_title = subject.strip()
            else:
                chosen_title = "Scheduled Event"

        overall_conf = 0.90
        if events_found:
            overall_conf = max(e["confidence"] for e in events_found)
        elif dates_found:
            overall_conf = max(d["confidence"] for d in dates_found)

        event_obj = ExtractedEvent(
            title=chosen_title,
            date=primary_date,
            time=primary_time,
            location=primary_location,
            confidence=round(overall_conf, 3),
            raw_entities=raw_entities,
        )
        constructed_events.append(event_obj)

        return constructed_events

    def predict(self, subject: str, body: str) -> PredictionResponse:
        full_text = self._prepare_text(subject, body)
        category, cat_conf, priority, pri_conf = self.predict_classification_and_priority(full_text)
        entities = self.extract_entities(full_text)
        events = self.synthesize_events(subject, entities)

        return PredictionResponse(
            category=category,
            category_confidence=cat_conf,
            priority=priority,
            priority_confidence=pri_conf,
            has_event=len(events) > 0,
            events=events,
        )
