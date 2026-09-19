# ForgeMind AI — Data Cleaning Report

**Generated:** 2026-09-19 12:54:47
**Output directory:** `C:\Users\SAI SINDHURI REDDY\Downloads\ForgeMind AI\data\processed`

---

## Summary

| File | Rows Before | Rows After | Removed | Missing Before | Missing After | Outliers Flagged | Imputed | Companion Cols Added |
|------|-------------|------------|---------|----------------|---------------|------------------|---------|---------------------|
| Model_1 | 3,000 | 3,000 | 0 | 0 | 0 | 3 cols | 0 values | 3 |
| Model_2 | 3,000 | 3,000 | 0 | 0 | 0 | 8 cols | 0 values | 8 |

---

## Detailed Transformation Log


### Model_1

| Column | Action | Detail | Affected Rows |
|--------|--------|--------|---------------|
| `*all*` | REMOVE_DUPLICATES | No exact duplicates found | 0 |
| `VA Time` | FLAG_OUTLIERS | Flagged 77 outliers (IQR×1.5: [8.9684, 9.0309]) | 77 |
| `Drilling Waiting Time` | FLAG_OUTLIERS | Flagged 493 outliers (IQR×1.5: [-50.4854, 84.6077]) | 493 |
| `Milling Waiting Time` | FLAG_OUTLIERS | Flagged 81 outliers (IQR×1.5: [-0.0001, 0.0002]) | 81 |

### Model_2

| Column | Action | Detail | Affected Rows |
|--------|--------|--------|---------------|
| `*all*` | REMOVE_DUPLICATES | No exact duplicates found | 0 |
| `Part 1 VA Time` | FLAG_OUTLIERS | Flagged 100 outliers (IQR×1.5: [2.9863, 3.0135]) | 100 |
| `Drilling Queue Time` | FLAG_OUTLIERS | Flagged 398 outliers (IQR×1.5: [-3.0522, 5.1037]) | 398 |
| `Part 1 Stored` | FLAG_OUTLIERS | Flagged 243 outliers (IQR×1.5: [-2185.5000, 3730.5000]) | 243 |
| `Part 2 VA Time` | FLAG_OUTLIERS | Flagged 118 outliers (IQR×1.5: [2.9871, 3.0127]) | 118 |
| `Milling Queue Time` | FLAG_OUTLIERS | Flagged 253 outliers (IQR×1.5: [-0.7412, 1.2354]) | 253 |
| `Part 2 Storage Time` | FLAG_OUTLIERS | Flagged 44 outliers (IQR×1.5: [-138.5518, 245.5136]) | 44 |
| `Part 2 Stored` | FLAG_OUTLIERS | Flagged 233 outliers (IQR×1.5: [-2228.2500, 3793.7500]) | 233 |
| `Assembly Time` | FLAG_OUTLIERS | Flagged 101 outliers (IQR×1.5: [2.9854, 3.0146]) | 101 |

---

## Before / After Missing Values Per Column


### Model_1

| Column | Missing Before | Missing After | Change |
|--------|----------------|---------------|--------|
| `Demand` | 0 | 0 | — |
| `Total parts` | 0 | 0 | — |
| `Parts per hour` | 0 | 0 | — |
| `VA Time` | 0 | 0 | — |
| `Drilling Waiting Time` | 0 | 0 | — |
| `Milling Waiting Time` | 0 | 0 | — |
| `Assembly Waiting Time` | 0 | 0 | — |
| `Drilling Util` | 0 | 0 | — |
| `Milling Util` | 0 | 0 | — |
| `Assembly Util` | 0 | 0 | — |

### Model_2

| Column | Missing Before | Missing After | Change |
|--------|----------------|---------------|--------|
| `Demand` | 0 | 0 | — |
| `Entities In Part 1` | 0 | 0 | — |
| `Part 1 VA Time` | 0 | 0 | — |
| `Drilling Queue Time` | 0 | 0 | — |
| `Part 1 Storage Time` | 0 | 0 | — |
| `Part 1 Stored` | 0 | 0 | — |
| `Entities In Part 2` | 0 | 0 | — |
| `Part 2 VA Time` | 0 | 0 | — |
| `Milling Queue Time` | 0 | 0 | — |
| `Part 2 Storage Time` | 0 | 0 | — |
| `Part 2 Stored` | 0 | 0 | — |
| `Entities Out` | 0 | 0 | — |
| `Assembly Time` | 0 | 0 | — |
| `Assembly Queue Time` | 0 | 0 | — |
| `Drilling Utilization` | 0 | 0 | — |
| `Milling Utilization` | 0 | 0 | — |
| `Assembly Utilization` | 0 | 0 | — |

---

## Assumptions & Warnings

1. **Outlier detection** uses IQR × 1.5 method. Outliers are **flagged, not removed**.
2. **Numeric imputation** uses **median** (robust to outliers). Every imputed value has a `_imputed` companion column set to `True`.
3. **Categorical values** are NOT imputed — left as-is (conservative policy).
4. **Exact duplicate** rows are removed. Near-duplicates are not auto-removed.
5. **Raw data** in `data/raw/` is never modified.
6. All cleaning decisions are traceable via the companion flag columns and this report.

> **ForgeMind AI Honesty Principle:** Every imputed or estimated value remains
> distinguishable from measured values via the `_imputed` flag columns.