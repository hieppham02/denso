# FactoryDoctor Workspace

This workspace contains three separate application areas:

```text
E:\EAUT\Denso Hackathon\
|-- ml\                 Data preparation, experiments and model artifacts
|-- frontend\          Vue/Vite operator dashboard
|-- backend\           Future API, replay service and persistence layer
|-- metropt+3+dataset\  Local input data; do not commit raw datasets
|-- WORKSPACE.md        Workspace-level map and commands
```

## Ownership

- `ml`: Python notebooks, chunked data processing, model training and metrics.
- `frontend`: Vue components, browser presentation and user interactions.
- `backend`: API contracts, replay/scoring endpoints, database integration and authentication later.
- `metropt+3+dataset`: local data only. ML code reads it; frontend/backend should not import raw CSV files directly.

## Run ML

Run from this workspace directory:

```powershell
py ml\local_pipeline.py `
  --csv "E:\EAUT\Denso Hackathon\metropt+3+dataset\MetroPT3(AirCompressor).csv" `
  --output-dir "E:\EAUT\Denso Hackathon\ml\output"
```

## Run frontend

Run from the frontend project directory:

```powershell
cd "E:\EAUT\Denso Hackathon\frontend"
npm.cmd run dev
```

The frontend should consume exported ML results or backend API responses, not
read the source dataset itself.

## Git note

At the time this file was created, the Git repository was rooted at
`frontend\.git`. The parent workspace is not a Git repository. Do not move or
initialize Git repositories without an explicit decision about source-control
ownership.
