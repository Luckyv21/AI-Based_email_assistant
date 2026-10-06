from dataclasses import dataclass


@dataclass
class TrainingConfig:
    backbone: str = "bert-base-uncased"
    batch_size: int = 16
    learning_rate: float = 2e-5
    epochs: int = 3
    max_seq_length: int = 256
    seed: int = 42
    output_dir: str = "models/trained"
