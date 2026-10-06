from dataclasses import dataclass

import torch
from torch import nn
from transformers import BertConfig, BertModel


@dataclass
class MultiTaskOutput:
    category_logits: torch.Tensor
    priority_logits: torch.Tensor
    loss: torch.Tensor | None = None


class MultiTaskBertClassifier(nn.Module):
    def __init__(self, backbone: str = "bert-base-uncased", num_categories: int = 3, num_priorities: int = 2, config: BertConfig | None = None, local_files_only: bool = False):
        super().__init__()
        self.encoder = BertModel.from_pretrained(backbone, config=config, local_files_only=local_files_only) if config is None else BertModel(config)
        self.dropout = nn.Dropout(self.encoder.config.hidden_dropout_prob)
        self.category_head = nn.Linear(self.encoder.config.hidden_size, num_categories)
        self.priority_head = nn.Linear(self.encoder.config.hidden_size, num_priorities)

    def forward(self, input_ids, attention_mask, token_type_ids=None, category_labels=None, priority_labels=None):
        pooled = self.encoder(input_ids=input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids).pooler_output
        pooled = self.dropout(pooled)
        category_logits = self.category_head(pooled)
        priority_logits = self.priority_head(pooled)
        loss = None
        if category_labels is not None and priority_labels is not None:
            loss = nn.functional.cross_entropy(category_logits, category_labels) + nn.functional.cross_entropy(priority_logits, priority_labels)
        return MultiTaskOutput(category_logits, priority_logits, loss)
