import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    EventExtractionResponse,
    HealthResponse,
    PredictionRequest,
    PredictionResponse,
)
from app.services.model_service import classifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Email Assistant AI Service",
    description="Dual Model Service: SECD Multi-Task DistilBERT (Classification & Priority) + BiLSTM NER (Event Extraction)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        provider=getattr(classifier, "name", "unknown"),
        classification_model="SECD Multi-Task DistilBERT (Office/Education/Personal + Normal/Important/Urgent)",
        event_model="MailEx BiLSTM Multi-Head NER (EVENT, DATE, TIME, LOCATION)",
    )


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    try:
        return classifier.predict(request.subject, request.body)
    except Exception as error:
        logger.exception("Classifier inference failed: %s", error)
        raise HTTPException(status_code=503, detail="Classifier unavailable") from error


@app.post("/extract-events", response_model=EventExtractionResponse)
def extract_events(request: PredictionRequest) -> EventExtractionResponse:
    try:
        prediction = classifier.predict(request.subject, request.body)
        return EventExtractionResponse(
            has_event=prediction.has_event,
            events=prediction.events,
        )
    except Exception as error:
        logger.exception("Event extraction failed: %s", error)
        raise HTTPException(status_code=503, detail="Event extraction failed") from error


@app.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(request: BatchPredictionRequest) -> BatchPredictionResponse:
    try:
        return BatchPredictionResponse(
            predictions=[classifier.predict(email.subject, email.body) for email in request.emails]
        )
    except Exception as error:
        logger.exception("Batch classifier inference failed: %s", error)
        raise HTTPException(status_code=503, detail="Classifier unavailable") from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)
