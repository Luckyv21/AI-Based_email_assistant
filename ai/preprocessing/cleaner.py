import re


def clean_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def combine_subject_body(subject: object, body: object) -> str:
    return f"{clean_text(subject)} [SEP] {clean_text(body)}".strip()
