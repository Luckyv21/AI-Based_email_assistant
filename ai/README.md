# Email Assistant AI Service

This is an independent Python service. It communicates with the Node.js backend over HTTP in a future phase; it does not import or modify `backend/`.

## Architecture

The pipeline is:

```text
data/raw -> data/splits -> preprocessing -> shared BERT encoder
                                      -> category head (3 classes)
                                      -> priority head (2 classes)
```

FastAPI loads one provider at startup. `MockClassifier` is the default because no verified weights were found locally. `BERTClassifier` is available for locally saved trained artifacts.

## Setup

From `ai/`:

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# Windows Git Bash
source .venv/Scripts/activate
python -m pip install -r requirements.txt
```

The root `.env.example` contains service settings. The default model provider is `mock`; BERT loading is local-only and never downloads weights automatically.

## Dataset

No prior dataset was present in the workspace. `data/generator.py` creates exactly 15,000 reproducible synthetic emails with subject, body, category, and priority fields. It uses seed 42 and writes `data/raw/emails.csv`.

This dataset is a pipeline fixture, not a claim about real-world email distributions. Its generated language may be easier than production email and any resulting scores must be interpreted accordingly.

Prepare and inspect it with:

```bash
python data/generator.py
python data/prepare_dataset.py
```

Preparation removes invalid rows and exact duplicates, normalizes text, creates stratified 10,000/2,500/2,500 train/validation/test splits, and writes `data/splits/dataset_report.json` and `data/splits/leakage_report.json`. Leakage checks compare exact subjects, bodies, pairs, and template overlap across splits.

## Training

The model uses `bert-base-uncased`, max sequence length 256, a shared BERT encoder, and two heads. Category labels are `Education=0`, `Office=1`, `Personal=2`; priority labels are `Important=0`, `Normal=1`. The combined loss is category cross-entropy plus priority cross-entropy.

```bash
python training/train.py
python training/evaluate.py
```

Training defaults are batch size 16, learning rate 2e-5, three epochs, seed 42, and CUDA when available. Mixed precision is enabled on CUDA. The best checkpoint is selected by validation combined macro F1 and saved under `models/trained/`. Evaluation writes separate category/priority accuracy, macro precision, macro recall, macro F1, confusion matrices, classification reports, and combined F1 under `experiments/`.

Do not treat perfect synthetic scores as real-world evidence. Always inspect the leakage report and synthetic-data limitations.

## Model artifacts

Trained artifacts belong under `models/trained/` and are ignored by git. Expected files include the BERT configuration/tokenizer files, `heads.pt`, `label_mappings.json`, and `training_config.json`. The service loads them once at startup when `AI_MODEL_PROVIDER=bert` and `MODEL_PATH=models/trained`.

No trained model was created during this phase and no model files are claimed to exist. A BERT training run requires downloading `bert-base-uncased` through Transformers when explicitly invoked and may require GPU memory; CPU fallback works but is slower.

## API

Start the service from `ai/`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

`GET /health` returns the service status and active provider.

`POST /predict`:

```json
{"subject":"Exam information","body":"The exam is scheduled next Tuesday."}
```

`POST /predict/batch`:

```json
{"emails":[{"subject":"Exam","body":"Details"},{"subject":"Team","body":"Project update"}]}
```

Responses contain category and priority labels with confidence values produced by the active provider. Invalid requests return 422; provider failures return 503.

## Summarization

`app/services/summarizer.py` defines a future summarizer interface and returns an explicit not-implemented result. Classification output is never presented as a summary.

## Tests and limitations

```bash
pytest
```

Tests cover dataset-related label assumptions, cleaning, tokenization boundaries, model output shapes, metrics, API validation, health, batch inference, and provider failure handling. There is no real-world validation set, no verified pretrained fine-tuned model in this workspace, and no backend integration in this phase.
