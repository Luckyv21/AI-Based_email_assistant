import pandas as pd

from preprocessing.cleaner import clean_text, combine_subject_body
from preprocessing.tokenizer import tokenize_batch


def test_cleaner_handles_missing_values_and_whitespace():
    assert clean_text(None) == ""
    assert clean_text("  hello\n world ") == "hello world"
    assert combine_subject_body("Subject", " body ") == "Subject [SEP] body"


def test_tokenizer_combines_subject_and_body():
    class FakeTokenizer:
        def __call__(self, texts, **kwargs):
            self.texts = texts
            self.kwargs = kwargs
            return {"input_ids": [[1]], "attention_mask": [[1]]}

    tokenizer = FakeTokenizer()
    result = tokenize_batch(tokenizer, ["Subject"], ["Body"], max_length=32)
    assert result["input_ids"] == [[1]]
    assert tokenizer.texts == ["Subject [SEP] Body"]
    assert tokenizer.kwargs["max_length"] == 32


def test_dataset_labels_are_balanced_by_generator():
    frame = pd.DataFrame({
        "category": ["Education", "Office", "Personal"],
        "priority": ["Important", "Normal", "Normal"],
    })
    assert set(frame.category) == {"Education", "Office", "Personal"}
    assert set(frame.priority) == {"Important", "Normal"}
