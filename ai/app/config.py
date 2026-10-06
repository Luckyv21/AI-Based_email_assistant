import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("AI_HOST", "0.0.0.0")
    port: int = int(os.getenv("AI_PORT", "8001"))
    model_provider: str = os.getenv("AI_MODEL_PROVIDER", "neural")
    secd_model_path: str = os.getenv("SECD_MODEL_PATH", "models/secd_classifier")
    event_model_path: str = os.getenv("EVENT_MODEL_PATH", "models/event_extractor")
    max_seq_length: int = int(os.getenv("MAX_SEQ_LENGTH", "512"))
    device: str = os.getenv("DEVICE", "auto")


settings = Settings()
