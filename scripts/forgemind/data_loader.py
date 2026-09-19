"""
ForgeMind AI — Data Loader
Loads cleaned (or raw) datasets and provides a unified interface.
Designed to work with Model 1, 2, and extensible to Model 3.
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

log = logging.getLogger("forgemind.data_loader")

# ---------------------------------------------------------------------------
# Column mappings — maps dataset-specific columns to canonical names
# ---------------------------------------------------------------------------

MODEL_1_MAPPING = {
    "Demand": "demand",
    "Total parts": "total_parts",
    "Parts per hour": "throughput_per_hour",
    "VA Time": "value_added_time",
    "Drilling Waiting Time": "drilling_wait_time",
    "Milling Waiting Time": "milling_wait_time",
    "Assembly Waiting Time": "assembly_wait_time",
    "Drilling Util": "drilling_utilization",
    "Milling Util": "milling_utilization",
    "Assembly Util": "assembly_utilization",
}

MODEL_2_MAPPING = {
    "Demand": "demand",
    "Entities In Part 1": "entities_in_part1",
    "Part 1 VA Time": "part1_va_time",
    "Drilling Queue Time": "drilling_queue_time",
    "Part 1 Storage Time": "part1_storage_time",
    "Part 1 Stored": "part1_stored_count",
    "Entities In Part 2": "entities_in_part2",
    "Part 2 VA Time": "part2_va_time",
    "Milling Queue Time": "milling_queue_time",
    "Part 2 Storage Time": "part2_storage_time",
    "Part 2 Stored": "part2_stored_count",
    "Entities Out": "entities_out",
    "Assembly Time": "assembly_time",
    "Assembly Queue Time": "assembly_queue_time",
    "Drilling Utilization": "drilling_utilization",
    "Milling Utilization": "milling_utilization",
    "Assembly Utilization": "assembly_utilization",
}

COLUMN_MAPPINGS = {
    "Model_1": MODEL_1_MAPPING,
    "Model_2": MODEL_2_MAPPING,
}


class ManufacturingDataset:
    """Unified interface for accessing manufacturing simulation data."""

    def __init__(self, model_key: str, use_cleaned: bool = True):
        self.model_key = model_key
        self.use_cleaned = use_cleaned
        self._df: Optional[pd.DataFrame] = None
        self._raw_df: Optional[pd.DataFrame] = None
        self._mapping = COLUMN_MAPPINGS.get(model_key, {})

    @property
    def df(self) -> pd.DataFrame:
        if self._df is None:
            self._df = self._load()
        return self._df

    @property
    def raw_df(self) -> pd.DataFrame:
        if self._raw_df is None:
            self._raw_df = self._load_raw()
        return self._raw_df

    def _load(self) -> pd.DataFrame:
        if self.use_cleaned:
            path = PROCESSED_DIR / f"{self.model_key}_cleaned.csv"
        else:
            path = RAW_DATA_DIR / self.model_key / f"{self.model_key}.csv"

        if not path.exists():
            raise FileNotFoundError(f"Data file not found: {path}")

        df = pd.read_csv(path)
        log.info("Loaded %s: %d rows, %d columns from %s",
                 self.model_key, len(df), len(df.columns), path.name)
        return df

    def _load_raw(self) -> pd.DataFrame:
        path = RAW_DATA_DIR / self.model_key / f"{self.model_key}.csv"
        if not path.exists():
            raise FileNotFoundError(f"Raw data file not found: {path}")
        return pd.read_csv(path)

    @property
    def data_columns(self) -> list[str]:
        """Return only the original data columns (no companion _outlier/_imputed)."""
        return [c for c in self.df.columns
                if not c.endswith("_outlier") and not c.endswith("_imputed")]

    @property
    def canonical_df(self) -> pd.DataFrame:
        """Return the dataframe with canonicalized column names."""
        df = self.df[self.data_columns].copy()
        reverse_map = {v: k for k, v in self._mapping.items()}
        rename = {k: v for k, v in self._mapping.items() if k in df.columns}
        return df.rename(columns=rename)

    def get_outlier_mask(self, column: str) -> Optional[pd.Series]:
        """Get the outlier flag for a column, if it exists."""
        flag_col = f"{column}_outlier"
        if flag_col in self.df.columns:
            return self.df[flag_col]
        return None

    def get_imputed_mask(self, column: str) -> Optional[pd.Series]:
        """Get the imputation flag for a column, if it exists."""
        flag_col = f"{column}_imputed"
        if flag_col in self.df.columns:
            return self.df[flag_col]
        return None

    def get_utilization_columns(self) -> list[str]:
        """Return columns that represent resource utilization."""
        return [c for c in self.data_columns if "util" in c.lower()]

    def get_queue_columns(self) -> list[str]:
        """Return columns related to queues/waiting."""
        return [c for c in self.data_columns
                if any(k in c.lower() for k in ["queue", "waiting", "wait"])]

    def get_throughput_columns(self) -> list[str]:
        """Return columns related to throughput/output."""
        return [c for c in self.data_columns
                if any(k in c.lower() for k in ["parts", "throughput", "entities", "out"])]

    def summary(self) -> dict:
        """Return a summary of the dataset."""
        return {
            "model": self.model_key,
            "rows": len(self.df),
            "data_columns": len(self.data_columns),
            "total_columns": len(self.df.columns),
            "utilization_cols": self.get_utilization_columns(),
            "queue_cols": self.get_queue_columns(),
            "throughput_cols": self.get_throughput_columns(),
        }


def load_all_models(use_cleaned: bool = True) -> dict[str, ManufacturingDataset]:
    """Load all available models."""
    datasets = {}
    for key in ["Model_1", "Model_2"]:
        try:
            ds = ManufacturingDataset(key, use_cleaned=use_cleaned)
            _ = ds.df  # Force load to verify
            datasets[key] = ds
        except FileNotFoundError:
            log.warning("Model %s not available", key)
    return datasets
