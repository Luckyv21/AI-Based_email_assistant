import logging
from pathlib import Path

from app.config import settings
from app.services.classifier import MockClassifier
from app.services.neural_service import DualModelAIService

logger = logging.getLogger(__name__)


def create_classifier():
    provider = settings.model_provider.lower()
    if provider in ("neural", "trained", "bert", "dual"):
        try:
            logger.info("Initializing neural dual models from %s and %s", settings.secd_model_path, settings.event_model_path)
            return DualModelAIService(
                secd_model_dir=settings.secd_model_path,
                event_model_dir=settings.event_model_path,
                max_seq_length=settings.max_seq_length,
                device_str=settings.device,
            )
        except Exception as e:
            logger.exception("Failed to load neural models, falling back to mock: %s", e)
            return MockClassifier()

    logger.info("Using mock classifier provider")
    return MockClassifier()


classifier = create_classifier()
