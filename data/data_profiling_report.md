# ForgeMind AI — Data Profiling Report

**Generated:** 2026-09-19 12:54:20
**Raw data directory:** `C:\Users\SAI SINDHURI REDDY\Downloads\ForgeMind AI\data\raw`

---

## Dataset Overview

| File | Domain | Rows | Columns | Duplicates | Size |
|------|--------|------|---------|------------|------|
| Model_1.csv | Production/Process Data | 3,000 | 10 | 0 | 210.3 KB |
| Model_2.csv | Production/Process Data | 3,000 | 17 | 0 | 357.1 KB |

---

## Model_1.csv

- **Source:** Arena Discrete-Event Simulation — Model 1
- **Domain mapping:** Production/Process Data
- **Documentation says:** 10 features
- **Notes:** Simplest model. Feature names suggest simulation counters/metrics.
- **Rows:** 3,000
- **Columns:** 10
- **Duplicate rows:** 0
- **File size:** 210.3 KB

### Column Details

| # | Column | Type | Missing | Missing % | Unique | Min | Max | Mean | Median | Inferred Meaning |
|---|--------|------|---------|-----------|--------|-----|-----|------|--------|------------------|
| 1 | `Demand` | int64 | 0 | 0.0% | 20 | 1.0 | 20.0 | 10.442 | 10.0 | Unknown / requires validation |
| 2 | `Total parts` | int64 | 0 | 0.0% | 1364 | 431.0 | 10811.0 | 5025.625333 | 4995.0 | Unknown / requires validation |
| 3 | `Parts per hour` | int64 | 0 | 0.0% | 387 | 18.0 | 450.0 | 209.453333 | 208.0 | Unknown / requires validation |
| 4 | `VA Time` | float64 | 0 | 0.0% | 2893 | 8.924635 | 9.091995 | 8.99968 | 8.999643 | Value-added time [MEASURED from simulation] |
| 5 | `Drilling Waiting Time` | float64 | 0 | 0.0% | 2722 | 0.0 | 257.618175 | 31.158644 | 2.150659 | Waiting time or count [MEASURED from simulation] |
| 6 | `Milling Waiting Time` | float64 | 0 | 0.0% | 244 | 0.0 | 0.00039 | 4.6e-05 | 2.6e-05 | Waiting time or count [MEASURED from simulation] |
| 7 | `Assembly Waiting Time` | float64 | 0 | 0.0% | 2874 | 0.0 | 244.006984 | 97.115862 | 42.488235 | Waiting time or count [MEASURED from simulation] |
| 8 | `Drilling Util` | float64 | 0 | 0.0% | 2838 | 0.059771 | 0.999999 | 0.64881 | 0.692557 | Resource utilization metric [MEASURED from simulation] |
| 9 | `Milling Util` | float64 | 0 | 0.0% | 2977 | 0.044539 | 0.752147 | 0.485562 | 0.518271 | Resource utilization metric [MEASURED from simulation] |
| 10 | `Assembly Util` | float64 | 0 | 0.0% | 2488 | 0.088929 | 0.996373 | 0.775912 | 0.978921 | Resource utilization metric [MEASURED from simulation] |

---

## Model_2.csv

- **Source:** Arena Discrete-Event Simulation — Model 2
- **Domain mapping:** Production/Process Data
- **Documentation says:** 16 features including metadata
- **Notes:** Medium complexity. Includes metadata columns alongside process metrics.
- **Rows:** 3,000
- **Columns:** 17
- **Duplicate rows:** 0
- **File size:** 357.1 KB

### Column Details

| # | Column | Type | Missing | Missing % | Unique | Min | Max | Mean | Median | Inferred Meaning |
|---|--------|------|---------|-----------|--------|-----|-----|------|--------|------------------|
| 1 | `Demand` | int64 | 0 | 0.0% | 20 | 1.0 | 20.0 | 10.502 | 11.0 | Unknown / requires validation |
| 2 | `Entities In Part 1` | int64 | 0 | 0.0% | 1535 | 659.0 | 15460.0 | 7537.239 | 7480.0 | Unknown / requires validation |
| 3 | `Part 1 VA Time` | float64 | 0 | 0.0% | 2789 | 2.958094 | 3.028059 | 2.999822 | 2.999918 | Value-added time [MEASURED from simulation] |
| 4 | `Drilling Queue Time` | float64 | 0 | 0.0% | 2464 | 0.0 | 71.015454 | 2.462334 | 0.30803 | Queue length — number of entities waiting at a station [MEASURED from simulation] |
| 5 | `Part 1 Storage Time` | float64 | 0 | 0.0% | 3000 | 0.000789 | 239.910373 | 61.823535 | 32.467304 | Time-related metric [MEASURED from simulation] |
| 6 | `Part 1 Stored` | int64 | 0 | 0.0% | 1364 | 0.0 | 5925.0 | 982.867667 | 201.0 | Unknown / requires validation |
| 7 | `Entities In Part 2` | int64 | 0 | 0.0% | 1557 | 639.0 | 15820.0 | 7534.885333 | 7485.0 | Unknown / requires validation |
| 8 | `Part 2 VA Time` | float64 | 0 | 0.0% | 2772 | 2.965998 | 3.036248 | 2.999863 | 2.999827 | Value-added time [MEASURED from simulation] |
| 9 | `Milling Queue Time` | float64 | 0 | 0.0% | 2230 | 0.0 | 3.339232 | 0.338296 | 0.063628 | Queue length — number of entities waiting at a station [MEASURED from simulation] |
| 10 | `Part 2 Storage Time` | float64 | 0 | 0.0% | 3000 | 0.00016 | 297.713544 | 62.864212 | 29.545842 | Time-related metric [MEASURED from simulation] |
| 11 | `Part 2 Stored` | int64 | 0 | 0.0% | 1379 | 0.0 | 6231.0 | 980.514 | 193.5 | Unknown / requires validation |
| 12 | `Entities Out` | int64 | 0 | 0.0% | 1781 | 637.0 | 9601.0 | 6554.371333 | 7270.5 | Unknown / requires validation |
| 13 | `Assembly Time` | float64 | 0 | 0.0% | 2795 | 2.966219 | 3.040068 | 2.999977 | 3.000062 | Time-related metric [MEASURED from simulation] |
| 14 | `Assembly Queue Time` | float64 | 0 | 0.0% | 2663 | 0.0 | 2.940341 | 1.400282 | 1.138215 | Queue length — number of entities waiting at a station [MEASURED from simulation] |
| 15 | `Drilling Utilization` | float64 | 0 | 0.0% | 2996 | 0.045579 | 0.999918 | 0.520993 | 0.518687 | Resource utilization — fraction of time the resource is busy [MEASURED from simulation] |
| 16 | `Milling Utilization` | float64 | 0 | 0.0% | 2992 | 0.033046 | 0.823238 | 0.391862 | 0.389475 | Resource utilization — fraction of time the resource is busy [MEASURED from simulation] |
| 17 | `Assembly Utilization` | float64 | 0 | 0.0% | 2928 | 0.067162 | 0.997833 | 0.683471 | 0.758409 | Resource utilization — fraction of time the resource is busy [MEASURED from simulation] |

---

## Domain Mapping Summary

> **Important:** This dataset is synthetic Arena discrete-event simulation data.
> It contains production/process metrics — NOT visual inspection or defect image data.
> Column meanings are inferred from naming patterns; columns that cannot be
> confidently mapped are marked `Unknown / requires validation`.

| Domain | Files | Status |
|--------|-------|--------|
| Production/Process Data | Model_1.csv, Model_2.csv | ✅ Available |
| Batch Metadata / Config | ParametersFile.xls (Model 3) | ⏳ Deferred |
| Inspection/Quality Data | Not present in this dataset | ❌ Not available |
| Economic/Cost Data | Not present in this dataset | ❌ Not available (will use configurable assumptions) |