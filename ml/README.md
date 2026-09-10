# Local MetroPT-3 A1 pipeline

This pipeline recreates the useful parts of the Kaggle notebook locally and
adds a first ML experiment for FactoryDoctor.

It reads `MetroPT3(AirCompressor).csv` in chunks. The raw CSV is never loaded
into memory as a complete DataFrame. Each chunk is reduced to 5-minute sensor
features before the next chunk is processed.

## Setup

From PowerShell:

```powershell
py -m pip install pandas numpy scikit-learn
```

## Smoke test

The script can also be started directly from VS Code's Run button. It then
uses the default dataset path relative to this workspace and writes to
`ml\output`.

This reads only two chunks and creates a small aggregate file:

```powershell
py ml/local_pipeline.py `
  --csv "E:\EAUT\Denso Hackathon\ml\metropt3-dataset\MetroPT3(AirCompressor).csv" `
  --output-dir "ml/output-smoke" `
  --max-chunks 2
```

## Full local run

The full run still reads the file sequentially, but never keeps the raw rows
in memory. It writes aggregated windows, synthetic fault windows and metrics:

```powershell
py ml/local_pipeline.py `
  --csv "E:\EAUT\Denso Hackathon\ml\metropt3-dataset\MetroPT3(AirCompressor).csv" `
  --output-dir "ml/output"
```

Outputs:

- `aggregated_5min.csv`: 5-minute features from the raw data.
- `synthetic_fault_windows_5min.csv`: transparent bootstrap/noise baseline.
- `metrics.json`: real-only versus real-plus-synthetic results.

The current experiment uses the first air-leak interval as the scarce labeled
seed and leaves later fault intervals for evaluation. This is a first local
benchmark, not yet the final physics-informed generator promised by A1.

## Important interpretation

The original notebook's February-only train split contains no fault labels.
That is valid for Isolation Forest, but it cannot train a supervised fault
classifier. This script therefore reports both an unsupervised baseline and a
supervised augmentation experiment with an explicit chronological split.
