"""Local, chunked MetroPT-3 pipeline for the FactoryDoctor A1 experiment.

The raw CSV is never loaded into memory as a whole. Each chunk is reduced to
5-minute aggregates before the next chunk is read.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


FAULT_PERIODS = [
    ("2020-04-18 00:00:00", "2020-04-19 00:00:00"),
    ("2020-05-29 23:30:00", "2020-05-30 06:01:00"),
    ("2020-06-05 10:00:00", "2020-06-07 14:31:00"),
    ("2020-07-15 14:30:00", "2020-07-15 19:01:00"),
]

ANALOG_COLUMNS = ["TP2", "TP3", "Motor_current"]
REQUIRED_COLUMNS = ["timestamp", *ANALOG_COLUMNS]
FEATURE_COLUMNS = [
    "TP2_mean",
    "TP2_min",
    "TP2_max",
    "TP2_std",
    "TP3_mean",
    "TP3_min",
    "TP3_max",
    "TP3_std",
    "Motor_current_mean",
    "Motor_current_min",
    "Motor_current_max",
    "Motor_current_std",
    "Motor_running_ratio",
]

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = SCRIPT_DIR.parent
DEFAULT_CSV = (
    SCRIPT_DIR
    / "metropt3-dataset"
    / "MetroPT3(AirCompressor).csv"
)
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "output"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Local MetroPT-3 CSV (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument("--chunk-size", type=int, default=100_000)
    parser.add_argument(
        "--max-chunks",
        type=int,
        default=None,
        help="Read only this many chunks for a smoke test.",
    )
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def fault_id_for_timestamp(timestamp: pd.Series) -> pd.Series:
    result = pd.Series(0, index=timestamp.index, dtype="int8")
    for number, (start, end) in enumerate(FAULT_PERIODS, start=1):
        mask = (timestamp >= pd.Timestamp(start)) & (timestamp < pd.Timestamp(end))
        result.loc[mask] = number
    return result


def aggregate_chunk(chunk: pd.DataFrame) -> pd.DataFrame:
    chunk = chunk.copy()
    chunk["timestamp"] = pd.to_datetime(
        chunk["timestamp"], format="%Y-%m-%d %H:%M:%S", errors="raise"
    )
    chunk["bucket"] = chunk["timestamp"].dt.floor("5min")
    chunk["label"] = (fault_id_for_timestamp(chunk["timestamp"]) > 0).astype("int8")
    chunk["Motor_running"] = (chunk["Motor_current"] > 1).astype("int8")

    grouped = chunk.groupby("bucket", sort=True)
    result = grouped["label"].max().to_frame()

    for column in ANALOG_COLUMNS:
        values = chunk[column].astype("float64")
        partial = pd.DataFrame(
            {
                f"{column}__sum": values,
                f"{column}__sum_sq": values * values,
                f"{column}__count": values.notna().astype("int64"),
                f"{column}__min": values,
                f"{column}__max": values,
            },
            index=chunk.index,
        )
        partial["bucket"] = chunk["bucket"]
        partial = partial.groupby("bucket").agg(
            {
                f"{column}__sum": "sum",
                f"{column}__sum_sq": "sum",
                f"{column}__count": "sum",
                f"{column}__min": "min",
                f"{column}__max": "max",
            }
        )
        result = result.join(partial, how="outer")

    running = chunk.groupby("bucket")["Motor_running"].agg(["sum", "count"])
    result = result.join(running.rename(columns={"sum": "running_sum", "count": "running_count"}))
    return result


def combine_partials(partials: list[pd.DataFrame]) -> pd.DataFrame:
    if not partials:
        raise ValueError("No rows were read from the CSV.")

    combined = pd.concat(partials).groupby(level=0, sort=True).agg(
        {
            "label": "max",
            **{
                f"{column}__sum": "sum"
                for column in ANALOG_COLUMNS
            },
            **{
                f"{column}__sum_sq": "sum"
                for column in ANALOG_COLUMNS
            },
            **{
                f"{column}__count": "sum"
                for column in ANALOG_COLUMNS
            },
            **{f"{column}__min": "min" for column in ANALOG_COLUMNS},
            **{f"{column}__max": "max" for column in ANALOG_COLUMNS},
            "running_sum": "sum",
            "running_count": "sum",
        }
    )

    output = pd.DataFrame(index=combined.index)
    for column in ANALOG_COLUMNS:
        count = combined[f"{column}__count"].clip(lower=1)
        mean = combined[f"{column}__sum"] / count
        variance = (
            combined[f"{column}__sum_sq"] / count - mean.pow(2)
        ).clip(lower=0)
        output[f"{column}_mean"] = mean
        output[f"{column}_min"] = combined[f"{column}__min"]
        output[f"{column}_max"] = combined[f"{column}__max"]
        output[f"{column}_std"] = np.sqrt(variance).fillna(0)

    output["Motor_running_ratio"] = (
        combined["running_sum"] / combined["running_count"].clip(lower=1)
    )
    output["label"] = combined["label"].astype("int8")
    output.index.name = "timestamp"
    return output.reset_index()


def read_and_aggregate(csv_path: Path, chunk_size: int, max_chunks: int | None) -> pd.DataFrame:
    partials: list[pd.DataFrame] = []
    reader = pd.read_csv(csv_path, usecols=REQUIRED_COLUMNS, chunksize=chunk_size)
    for number, chunk in enumerate(reader, start=1):
        partials.append(aggregate_chunk(chunk))
        print(f"Read chunk {number}: {len(chunk):,} rows")
        if max_chunks is not None and number >= max_chunks:
            break
    return combine_partials(partials)


def make_synthetic_faults(
    train: pd.DataFrame, normal: pd.DataFrame, count: int, seed: int
) -> pd.DataFrame:
    """Bootstrap scarce fault windows and perturb them within real-data bounds.

    This is intentionally a transparent v0 generator. It is a benchmark for a
    later physics-based generator or TimeGAN, not a claim that these samples
    are ground truth.
    """
    fault = train[train["label"] == 1][FEATURE_COLUMNS].dropna()
    if fault.empty:
        raise ValueError("No labeled fault windows are available in the seed train set.")

    rng = np.random.default_rng(seed)
    indices = rng.integers(0, len(fault), size=count)
    synthetic = fault.iloc[indices].reset_index(drop=True).copy()
    scale = fault.std(ddof=0).replace(0, 1).fillna(1)
    noise = rng.normal(0, 0.05, size=synthetic.shape) * scale.to_numpy()
    synthetic = synthetic + noise

    bounds_source = pd.concat([normal[FEATURE_COLUMNS], fault], ignore_index=True)
    for column in FEATURE_COLUMNS:
        low = bounds_source[column].quantile(0.001)
        high = bounds_source[column].quantile(0.999)
        synthetic[column] = synthetic[column].clip(lower=low, upper=high)
    for column in ["TP2_std", "TP3_std", "Motor_current_std"]:
        synthetic[column] = synthetic[column].clip(lower=0)
    synthetic["Motor_running_ratio"] = synthetic["Motor_running_ratio"].clip(0, 1)
    synthetic["label"] = 1
    synthetic["synthetic"] = 1
    return synthetic


def classification_metrics(model, x_test: pd.DataFrame, y_test: pd.Series) -> dict:
    probabilities = model.predict_proba(x_test)[:, 1]
    predictions = (probabilities >= 0.5).astype("int8")
    result = {
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1": float(f1_score(y_test, predictions, zero_division=0)),
        "average_precision": float(average_precision_score(y_test, probabilities)),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
    }
    if y_test.nunique() == 2:
        result["roc_auc"] = float(roc_auc_score(y_test, probabilities))
    return result


def run_experiment(data: pd.DataFrame, output_dir: Path, seed: int) -> dict:
    data = data.sort_values("timestamp").reset_index(drop=True)
    first_fault_start = pd.Timestamp(FAULT_PERIODS[0][0])
    test_start = pd.Timestamp(FAULT_PERIODS[1][0])

    # Train uses normal data before the first fault plus the first fault as the
    # scarce labeled seed. Later fault events remain unseen for evaluation.
    train = data[data["timestamp"] < test_start].copy()
    test = data[data["timestamp"] >= test_start].copy()
    normal = train[train["label"] == 0]
    if test["label"].nunique() < 2:
        raise ValueError("The selected test period does not contain both labels.")

    x_test = test[FEATURE_COLUMNS]
    y_test = test["label"]
    classifier_kwargs = {
        "n_estimators": 300,
        "class_weight": "balanced",
        "random_state": seed,
        "n_jobs": -1,
        "min_samples_leaf": 2,
    }

    real_train = train[FEATURE_COLUMNS + ["label"]].dropna()
    model_real = RandomForestClassifier(**classifier_kwargs)
    model_real.fit(real_train[FEATURE_COLUMNS], real_train["label"])

    synthetic = make_synthetic_faults(
        train, normal, count=max(500, int(real_train["label"].sum()) * 5), seed=seed
    )
    augmented = pd.concat([real_train.assign(synthetic=0), synthetic], ignore_index=True)
    model_augmented = RandomForestClassifier(**classifier_kwargs)
    model_augmented.fit(augmented[FEATURE_COLUMNS], augmented["label"])

    # Unsupervised baseline follows the original notebook's month-2 idea.
    month_two = data[data["timestamp"] < pd.Timestamp("2020-03-01")].dropna()
    anomaly = IsolationForest(
        n_estimators=300, contamination="auto", random_state=seed, n_jobs=-1
    )
    anomaly.fit(month_two[FEATURE_COLUMNS])
    anomaly_scores = -anomaly.score_samples(x_test.fillna(month_two[FEATURE_COLUMNS].median()))

    synthetic.to_csv(output_dir / "synthetic_fault_windows_5min.csv", index=False)
    metrics = {
        "rows_5min": int(len(data)),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "real_fault_windows_train": int(real_train["label"].sum()),
        "real_fault_windows_test": int(y_test.sum()),
        "first_fault_start": str(first_fault_start),
        "test_start": str(test_start),
        "real_only": classification_metrics(model_real, x_test, y_test),
        "real_plus_synthetic": classification_metrics(model_augmented, x_test, y_test),
        "isolation_forest_test_score_mean": float(np.mean(anomaly_scores)),
    }
    return metrics


def main() -> None:
    args = parse_args()
    if not args.csv.exists():
        raise FileNotFoundError(args.csv)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    data = read_and_aggregate(args.csv, args.chunk_size, args.max_chunks)
    data.to_csv(args.output_dir / "aggregated_5min.csv", index=False)
    print(f"Aggregated windows: {len(data):,}")

    if args.max_chunks is not None:
        print("Smoke test complete; model experiment skipped.")
        return

    metrics = run_experiment(data, args.output_dir, args.seed)
    (args.output_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
