from pathlib import Path
from typing import Iterable

from transformers import AutoTokenizer

from preprocessing.cleaner import combine_subject_body


DEFAULT_BACKBONE = "bert-base-uncased"
DEFAULT_MAX_LENGTH = 256


def load_tokenizer(backbone: str = DEFAULT_BACKBONE, max_length: int = DEFAULT_MAX_LENGTH, local_files_only: bool = False):
    tokenizer = AutoTokenizer.from_pretrained(backbone, local_files_only=local_files_only)
    tokenizer.model_max_length = max_length
    return tokenizer


def tokenize_batch(tokenizer, subjects: Iterable[object], bodies: Iterable[object], max_length: int = DEFAULT_MAX_LENGTH):
    texts = [combine_subject_body(subject, body) for subject, body in zip(subjects, bodies)]
    return tokenizer(texts, padding=True, truncation=True, max_length=max_length, return_tensors="pt")
