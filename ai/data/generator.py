import csv
import random
from pathlib import Path

SEED = 42
ROWS = 15_000
CATEGORIES = ("Education", "Office", "Personal")
PRIORITIES = ("Important", "Normal")

CATEGORY_SUBJECTS = {
    "Education": ("Course update", "Learning plan", "Campus notice", "Study schedule"),
    "Office": ("Team update", "Project note", "Work schedule", "Client message"),
    "Personal": ("Weekend plan", "Family note", "Home update", "Personal reminder"),
}
CATEGORY_BODIES = {
    "Education": ("Please review the material before the next session.", "The learning group shared a new schedule.", "A campus activity needs your attention."),
    "Office": ("Please review the project details before the next discussion.", "The team shared an updated schedule.", "A client item needs your attention."),
    "Personal": ("Please review the details before making your plans.", "A family member shared an updated schedule.", "A personal item needs your attention."),
}
PRIORITY_OPENERS = {
    "Important": ("Please respond today.", "A response is needed soon.", "This needs prompt attention."),
    "Normal": ("There is no immediate deadline.", "Please review it when convenient.", "This can be handled in your normal routine."),
}


def generate_rows(rows: int = ROWS, seed: int = SEED):
    rng = random.Random(seed)
    combinations = [(category, priority) for category in CATEGORIES for priority in PRIORITIES]
    result = []

    for index in range(rows):
        category, priority = combinations[index % len(combinations)]
        subject = f"{rng.choice(CATEGORY_SUBJECTS[category])} {index + 1:05d}"
        body = f"{rng.choice(CATEGORY_BODIES[category])} {rng.choice(PRIORITY_OPENERS[priority])} Reference {index + 1:05d}-{rng.randrange(100000, 999999)}."
        result.append({"id": index + 1, "subject": subject, "body": body, "category": category, "priority": priority})

    rng.shuffle(result)
    return result


def main():
    output = Path(__file__).parent / "raw" / "emails.csv"
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "subject", "body", "category", "priority"])
        writer.writeheader()
        writer.writerows(generate_rows())
    print(f"Wrote {ROWS} synthetic rows to {output}")


if __name__ == "__main__":
    main()
