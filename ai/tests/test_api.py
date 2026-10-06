from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "provider": "mock"}


def test_predict_response_structure():
    response = client.post(
        "/predict",
        json={"subject": "Exam schedule", "body": "Action required today."},
    )
    assert response.status_code == 200
    assert set(response.json()) == {"category", "category_confidence", "priority", "priority_confidence"}


def test_batch_prediction():
    response = client.post(
        "/predict/batch",
        json={"emails": [{"subject": "Exam", "body": "Details"}, {"subject": "Family", "body": "Hello"}]},
    )
    assert response.status_code == 200
    assert len(response.json()["predictions"]) == 2


def test_invalid_request_is_rejected():
    response = client.post(
        "/predict",
        json={"subject": 123, "body": "text", "unknown": "field"},
    )

    assert response.status_code == 422


def test_batch_empty_request_is_rejected():
    response = client.post("/predict/batch", json={"emails": []})
    assert response.status_code == 422


def test_classifier_failure_returns_service_unavailable(monkeypatch):
    def fail(subject, body):
        raise RuntimeError("test failure")

    monkeypatch.setattr("app.main.classifier.predict", fail)
    response = client.post("/predict", json={"subject": "test", "body": "test"})

    assert response.status_code == 503
    assert response.json() == {"detail": "Classifier unavailable"}
