from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score


def classification_metrics(labels, predictions):
    return {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision_macro": float(precision_score(labels, predictions, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(labels, predictions, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(labels, predictions, average="macro", zero_division=0)),
        "confusion_matrix": confusion_matrix(labels, predictions).tolist(),
    }
