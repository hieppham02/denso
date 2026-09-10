# DENSO A1 - FactoryDoctor

FactoryDoctor is a dashboard for monitoring air compressors, replaying MetroPT-3 sensor data, and evaluating an initial machine-learning approach for fault detection.

## Project Structure

```text
Denso Hackathon/
├── frontend/              # Vue web application
├── backend/               # FastAPI service
├── ml/                    # Local ML pipeline and MetroPT-3 dataset
├── documents/             # Project and technical documents
└── README.md
```

## Frontend

The `frontend` folder contains the Vue 3 interface, styled with Tailwind CSS and visualized with ApexCharts.

It provides the device dashboard, sensor charts, realtime simulation controls, alerts, incident processing, approvals, and history. Device history and simulation data are requested from FastAPI. The UI also supports playback speed, animation speed, zoom, pause, and reset.

Start it with:

```powershell
cd "<your parent directory>\frontend"
npm install
npm run dev
```

Default URL: `http://127.0.0.1:5175`

## Backend

The `backend` folder contains the FastAPI data and simulation service. It reads the MetroPT-3 CSV as the current database source, serves device/history endpoints, and streams simulated sensor rows through WebSocket. It supports scenarios, pause/reset, device selection, and playback speeds from `1x` to `10x`.

Start it with:

```powershell
cd "<your parent directory>"
py -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload
```

API documentation: `http://127.0.0.1:8001/docs`

## ML

The `ml` folder contains the first local ML experiment for the MetroPT-3 air-compressor dataset.

`ml/local_pipeline.py` reads the large CSV in chunks, aggregates sensor data into five-minute windows, creates statistical features, labels known fault periods, trains Random Forest and Isolation Forest baselines, and generates transparent synthetic fault samples.

Dataset:

```text
ml/metropt3-dataset/MetroPT3(AirCompressor).csv
```

Full output is written to `ml/output`:

- `aggregated_5min.csv`: five-minute feature windows.
- `synthetic_fault_windows_5min.csv`: generated fault samples.
- `metrics.json`: model evaluation metrics.

## Documents

The `documents` folder stores project descriptions, competition requirements, dataset descriptions, technical references, and presentation materials. These documents define the product context and the constraints for the ML experiment.

## Current Scope

The CSV currently acts as a local database and replay source for one simulated air-compressor device, APU-01. The application structure supports multiple devices, while the current simulation and ML calibration focus on the APU-01 demonstration. The ML models and fault rules are prototypes and require validation against real equipment before production use.
