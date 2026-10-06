import torch
from transformers import BertConfig

from training.metrics import classification_metrics
from training.model import MultiTaskBertClassifier


def test_multitask_model_output_shapes():
    config = BertConfig(vocab_size=100, hidden_size=32, intermediate_size=64, num_hidden_layers=1, num_attention_heads=4)
    model = MultiTaskBertClassifier(config=config)
    output = model(torch.randint(0, 100, (4, 8)), torch.ones(4, 8, dtype=torch.long))
    assert tuple(output.category_logits.shape) == (4, 3)
    assert tuple(output.priority_logits.shape) == (4, 2)


def test_label_mappings_and_metrics():
    from training.train import CATEGORY_LABELS, PRIORITY_LABELS
    assert CATEGORY_LABELS == {"Education": 0, "Office": 1, "Personal": 2}
    assert PRIORITY_LABELS == {"Important": 0, "Normal": 1}
    assert classification_metrics([0, 1], [0, 1])["f1_macro"] == 1.0
