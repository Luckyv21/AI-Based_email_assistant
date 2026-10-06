from dataclasses import dataclass

from app.schemas import Category, PredictionResponse, Priority


@dataclass
class MockClassifier:
    """Deterministic test provider; this is not a trained ML model."""

    name: str = "mock"

    def predict(self, subject: str, body: str) -> PredictionResponse:
        text = f"{subject} {body}".lower()

        education_terms = ("class", "course", "exam", "lecture", "university", "school")
        office_terms = ("meeting", "project", "deadline", "client", "work", "office")
        important_terms = ("urgent", "immediately", "action required", "due today", "asap")

        if any(term in text for term in education_terms):
            category: Category = "Education"
            category_confidence = 0.80
        elif any(term in text for term in office_terms):
            category = "Office"
            category_confidence = 0.80
        else:
            category = "Personal"
            category_confidence = 0.55

        if any(term in text for term in important_terms):
            priority: Priority = "Important"
            priority_confidence = 0.85
        else:
            priority = "Normal"
            priority_confidence = 0.65

        return PredictionResponse(
            category=category,
            category_confidence=category_confidence,
            priority=priority,
            priority_confidence=priority_confidence,
        )


classifier = MockClassifier()
