from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

import pandas as pd


ANALOG_COLUMNS = [
    "TP2",
    "TP3",
    "H1",
    "DV_pressure",
    "Reservoirs",
    "Oil_temperature",
    "Motor_current",
]
DIGITAL_COLUMNS = [
    "COMP",
    "DV_eletric",
    "Towers",
    "MPG",
    "LPS",
    "Pressure_switch",
    "Oil_level",
    "Caudal_impulses",
]
CSV_COLUMNS = ["timestamp", *ANALOG_COLUMNS, *DIGITAL_COLUMNS]
FIRST_FAULT_END = pd.Timestamp("2020-04-19 00:00:00")


class MetroPT3CsvStore:
    """Read MetroPT-3 in chunks and cache only one-minute aggregates."""

    def __init__(self, csv_path: Path | None = None, chunk_size: int = 100_000):
        workspace = Path(__file__).resolve().parents[3]
        default_path = workspace / "metropt+3+dataset" / "MetroPT3(AirCompressor).csv"
        self.csv_path = Path(os.getenv("FACTORYDOCTOR_CSV", csv_path or default_path))
        self.chunk_size = chunk_size
        self._cache: pd.DataFrame | None = None

    def _load(self) -> pd.DataFrame:
        if self._cache is not None:
            return self._cache
        if not self.csv_path.exists():
            raise FileNotFoundError(f"MetroPT-3 CSV not found: {self.csv_path}")

        partials: list[pd.DataFrame] = []
        reader = pd.read_csv(self.csv_path, usecols=CSV_COLUMNS, chunksize=self.chunk_size)
        for chunk in reader:
            chunk["timestamp"] = pd.to_datetime(
                chunk["timestamp"], format="%Y-%m-%d %H:%M:%S", errors="raise"
            )
            chunk["bucket"] = chunk["timestamp"].dt.floor("1min")
            grouped = chunk.groupby("bucket", sort=True)

            values = chunk[[*ANALOG_COLUMNS, *DIGITAL_COLUMNS]].copy()
            values["bucket"] = chunk["bucket"]
            partial = values.groupby("bucket", sort=True).agg(
                {
                    **{column: ["sum", "count"] for column in ANALOG_COLUMNS},
                    **{column: "last" for column in DIGITAL_COLUMNS},
                }
            )
            partial.columns = [
                f"{column}__{stat}" if stat else column
                for column, stat in partial.columns
            ]
            partials.append(partial)

        if not partials:
            raise ValueError("MetroPT-3 CSV contains no rows")

        combined = pd.concat(partials).groupby(level=0, sort=True).agg(
            {
                **{f"{column}__sum": "sum" for column in ANALOG_COLUMNS},
                **{f"{column}__count": "sum" for column in ANALOG_COLUMNS},
                **{f"{column}__last": "last" for column in DIGITAL_COLUMNS},
            }
        )

        output = pd.DataFrame(index=combined.index)
        for column in ANALOG_COLUMNS:
            output[column] = (
                combined[f"{column}__sum"]
                / combined[f"{column}__count"].clip(lower=1)
            )
        for column in DIGITAL_COLUMNS:
            output[column] = combined[f"{column}__last"].round().astype("int8")
        output["loaded"] = output["Motor_current"] > 1
        output.index.name = "timestamp"
        self._cache = output.sort_index()
        return self._cache

    def history(self, minutes: int, incident: bool = False) -> list[dict]:
        data = self._load()
        end = FIRST_FAULT_END if incident else data.index.max()
        start = end - timedelta(minutes=minutes)
        selected = data.loc[(data.index >= start) & (data.index <= end)]
        return self._rows_to_samples(selected, end)

    def replay_reset(self, scenario: str = "normal", history_minutes: int = 5) -> list[dict]:
        data = self._load()
        if scenario == "leak":
            end = FIRST_FAULT_END
            start = end - timedelta(minutes=history_minutes)
        else:
            start = data.index.min()
            end = start + timedelta(minutes=history_minutes)
        selected = data.loc[(data.index >= start) & (data.index <= end)]
        return self._rows_to_samples(selected, end)

    def replay_rows(self, scenario: str, cursor: int, count: int) -> tuple[list[dict], int]:
        data = self._load()
        if scenario == "leak":
            start = FIRST_FAULT_END - timedelta(minutes=5)
            offset = int(data.index.searchsorted(start, side="left"))
        else:
            offset = 0
        begin = offset + cursor
        selected = data.iloc[begin: begin + count]
        return selected.reset_index().to_dict("records"), begin + len(selected)

    def replay_stream(self, scenario: str = "normal"):
        """Yield raw CSV samples without loading the complete file into memory."""
        reader = pd.read_csv(self.csv_path, usecols=CSV_COLUMNS, chunksize=self.chunk_size)
        replay_start = FIRST_FAULT_END - timedelta(minutes=5) if scenario == "leak" else None
        started = replay_start is None

        for chunk in reader:
            chunk["timestamp"] = pd.to_datetime(
                chunk["timestamp"], format="%Y-%m-%d %H:%M:%S", errors="raise"
            )
            if not started:
                chunk = chunk.loc[chunk["timestamp"] >= replay_start]
                if chunk.empty:
                    continue
                started = True

            for row in chunk.itertuples(index=False):
                item = {"timestamp": row.timestamp.to_pydatetime().replace(tzinfo=None).isoformat() + "Z"}
                for column in [*ANALOG_COLUMNS, *DIGITAL_COLUMNS]:
                    value = getattr(row, column)
                    item[column] = int(round(value)) if column in DIGITAL_COLUMNS else float(value)
                item["loaded"] = item["Motor_current"] > 1
                yield item

    def _rows_to_samples(self, selected: pd.DataFrame, end: pd.Timestamp) -> list[dict]:
        result = []
        for timestamp, row in selected.iterrows():
            item = {
                "time": int((timestamp - end).total_seconds()),
                "timestamp": timestamp.to_pydatetime().replace(tzinfo=None).isoformat() + "Z",
            }
            for column in [*ANALOG_COLUMNS, *DIGITAL_COLUMNS]:
                value = row[column]
                item[column] = int(value) if column in DIGITAL_COLUMNS else float(value)
            item["loaded"] = bool(row["loaded"])
            result.append(item)
        return result

    @property
    def path(self) -> str:
        return str(self.csv_path)
