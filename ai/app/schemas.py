from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


Category = Literal["Education", "Office", "Personal", "College/Education", "Office/Work"]
Priority = Literal["Normal", "Important", "Urgent", "Low", "Medium", "High"]


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(default="", max_length=1000)
    body: str = Field(default="", max_length=200_000)


class ExtractedEntity(BaseModel):
    type: Literal["EVENT", "DATE", "TIME", "LOCATION"]
    text: str
    confidence: float = Field(ge=0, le=1)


class ExtractedEvent(BaseModel):
    title: str
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0, le=1)
    raw_entities: list[ExtractedEntity] = []


class PredictionResponse(BaseModel):
    category: str
    category_confidence: float = Field(ge=0, le=1)
    priority: str
    priority_confidence: float = Field(ge=0, le=1)
    has_event: bool = False
    events: list[ExtractedEvent] = []


class EventExtractionResponse(BaseModel):
    has_event: bool = False
    events: list[ExtractedEvent] = []


class HealthResponse(BaseModel):
    status: Literal["ok"]
    provider: str
    classification_model: str = "SECD Multi-Task DistilBERT"
    event_model: str = "BiLSTM Multi-Head NER"


class BatchPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    emails: list[PredictionRequest] = Field(min_length=1, max_length=100)


class BatchPredictionResponse(BaseModel):
    predictions: list[PredictionResponse]
