# FactoryDoctor Backend

Reserved for the future server-side part of FactoryDoctor.

Planned responsibilities:

- Serve sensor replay and model scoring results.
- Persist incidents, approval decisions and verification history.
- Expose a stable API for the Vue frontend.
- Add WebSocket streaming only after the HTTP contract is stable.
- Keep model training and dataset preparation in `..\ml`, not in this folder.

Suggested future layout:

```text
backend\
|-- app\
|   |-- main.py
|   |-- api\
|   |-- services\
|   |-- schemas\
|   `-- storage\
|-- tests\
`-- requirements.txt
```

## Setup

From `E:\EAUT\Denso Hackathon`:

```powershell
py -m pip install -r backend\requirements.txt
```

## Run

```powershell
py -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

API documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

The current API phase exposes one real device, `APU-01`, backed by the local
MetroPT-3 CSV. The CSV is read in chunks on the first history request and only
one-minute aggregates are cached in memory. It is not loaded as one raw
DataFrame and it is not used as a writeable database.

The simulation endpoints remain available for the later phase where the ML
evaluation will be used to calibrate a one-APU simulator. Other devices are
intentionally not exposed until that simulator has been evaluated.
