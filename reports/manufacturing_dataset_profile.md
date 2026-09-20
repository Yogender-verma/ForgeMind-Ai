# Manufacturing Simulation Dataset Profile

**Dataset Source:** [Mendeley Data DOI: 10.17632/3rw227zxt7.2](https://data.mendeley.com/datasets/3rw227zxt7/2)
**Title:** *Manufacturing Data Shared Facility - Discrete-Event Simulation*
**Simulation Software:** Rockwell Arena Simulation v15

---

## Executive Data Summary

| Model | Source File | Rows | Columns | Stations Profiled | Multi-Part Support | Missing Values |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| **Model_1** | `data/raw/Model_1/Model_1.csv` | 3,000 | 10 | Drilling, Milling, Assembly | No | 0 (0.0%) |
| **Model_2** | `data/raw/Model_2/Model_2.csv` | 3,000 | 17 | Drilling, Milling, Assembly | Yes | 0 (0.0%) |

---

## Model 1 — Linear Single-Line Facility (3-Station)
- **File:** `data/raw/Model_1/Model_1.csv`
- **Rows:** 3,000
- **Columns:** 10
- **Missing Values:** 0

### Detailed Data Dictionary

| # | Column Name | Type | Unique | Min | Mean | Median | Max | Operational Interpretation |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `Demand` | `int64` | 20 | 1.0 | 10.442 | 10.0 | 20.0 | Incoming demand schedule input (parts/hr target) |
| 2 | `Total parts` | `int64` | 1,364 | 431.0 | 5025.625333 | 4995.0 | 10811.0 | Total cumulative manufactured units output |
| 3 | `Parts per hour` | `int64` | 387 | 18.0 | 209.453333 | 208.0 | 450.0 | Observed production line throughput rate (units/hr) |
| 4 | `VA Time` | `float64` | 2,893 | 8.924635 | 8.99968 | 8.999643 | 9.091995 | Value-Added physical processing cycle duration (min) |
| 5 | `Drilling Waiting Time` | `float64` | 2,722 | 0.0 | 31.158644 | 2.150659 | 257.618175 | Cumulative entity waiting delay prior to station processing (min) |
| 6 | `Milling Waiting Time` | `float64` | 244 | 0.0 | 4.6e-05 | 2.6e-05 | 0.00039 | Cumulative entity waiting delay prior to station processing (min) |
| 7 | `Assembly Waiting Time` | `float64` | 2,874 | 0.0 | 97.115862 | 42.488235 | 244.006984 | Cumulative entity waiting delay prior to station processing (min) |
| 8 | `Drilling Util` | `float64` | 2,838 | 0.059771 | 0.64881 | 0.692557 | 0.999999 | Station busy-time ratio (0.0 to 1.0 fraction) |
| 9 | `Milling Util` | `float64` | 2,977 | 0.044539 | 0.485562 | 0.518271 | 0.752147 | Station busy-time ratio (0.0 to 1.0 fraction) |
| 10 | `Assembly Util` | `float64` | 2,488 | 0.088929 | 0.775912 | 0.978922 | 0.996373 | Station busy-time ratio (0.0 to 1.0 fraction) |


## Model 2 — Dual-Part Shared Facility with Intermediate Buffers
- **File:** `data/raw/Model_2/Model_2.csv`
- **Rows:** 3,000
- **Columns:** 17
- **Missing Values:** 0

### Detailed Data Dictionary

| # | Column Name | Type | Unique | Min | Mean | Median | Max | Operational Interpretation |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `Demand` | `int64` | 20 | 1.0 | 10.502 | 11.0 | 20.0 | Incoming demand schedule input (parts/hr target) |
| 2 | `Entities In Part 1` | `int64` | 1,535 | 659.0 | 7537.239 | 7480.0 | 15460.0 | Raw material entities arriving at intake cell |
| 3 | `Part 1 VA Time` | `float64` | 2,789 | 2.958094 | 2.999822 | 2.999918 | 3.028059 | Value-Added physical processing cycle duration (min) |
| 4 | `Drilling Queue Time` | `float64` | 2,464 | 0.0 | 2.462334 | 0.30803 | 71.015454 | Average in-queue entity waiting time at buffer station (min) |
| 5 | `Part 1 Storage Time` | `float64` | 3,000 | 0.000789 | 61.823535 | 32.467304 | 239.910373 | Work-in-process buffer dwell time before assembly (min) |
| 6 | `Part 1 Stored` | `int64` | 1,364 | 0.0 | 982.867667 | 201.0 | 5925.0 | Count of intermediate buffer inventory items in storage |
| 7 | `Entities In Part 2` | `int64` | 1,557 | 639.0 | 7534.885333 | 7485.0 | 15820.0 | Raw material entities arriving at intake cell |
| 8 | `Part 2 VA Time` | `float64` | 2,772 | 2.965998 | 2.999863 | 2.999826 | 3.036248 | Value-Added physical processing cycle duration (min) |
| 9 | `Milling Queue Time` | `float64` | 2,230 | 0.0 | 0.338296 | 0.063628 | 3.339232 | Average in-queue entity waiting time at buffer station (min) |
| 10 | `Part 2 Storage Time` | `float64` | 3,000 | 0.00016 | 62.864212 | 29.545842 | 297.713544 | Work-in-process buffer dwell time before assembly (min) |
| 11 | `Part 2 Stored` | `int64` | 1,379 | 0.0 | 980.514 | 193.5 | 6231.0 | Count of intermediate buffer inventory items in storage |
| 12 | `Entities Out` | `int64` | 1,781 | 637.0 | 6554.371333 | 7270.5 | 9601.0 | Completed assemblies successfully exiting final station |
| 13 | `Assembly Time` | `float64` | 2,795 | 2.966219 | 2.999977 | 3.000062 | 3.040068 | Value-Added assembly cell execution duration (min) |
| 14 | `Assembly Queue Time` | `float64` | 2,663 | 0.0 | 1.400282 | 1.138215 | 2.940341 | Average in-queue entity waiting time at buffer station (min) |
| 15 | `Drilling Utilization` | `float64` | 2,996 | 0.045579 | 0.520993 | 0.518687 | 0.999918 | Station busy-time ratio (0.0 to 1.0 fraction) |
| 16 | `Milling Utilization` | `float64` | 2,992 | 0.033046 | 0.391862 | 0.389474 | 0.823238 | Station busy-time ratio (0.0 to 1.0 fraction) |
| 17 | `Assembly Utilization` | `float64` | 2,928 | 0.067162 | 0.683471 | 0.758409 | 0.997833 | Station busy-time ratio (0.0 to 1.0 fraction) |


## Model 3 Reference (Mendeley Archive)
- **Archive Status:** 77 features, ~311 MB raw CSV, complex assembly cells with SKU counters.
- **Integration Status:** Profiled in manifest; Model 1 and Model 2 serve as the primary discrete-event production pipelines in ForgeMind AI.

---

## Strict Dataset Provenance & Linkage Demarcation

> [!IMPORTANT]
> **NO IMAGE-TO-MANUFACTURING LINKAGE:**
> The visual inspection dataset (Dataset 1: 10,726 defect images) and the discrete-event manufacturing simulation dataset (Dataset 2: Mendeley Arena simulation logs) are distinct organizer-provided datasets.
> There is **no primary key, serial ID, batch tag, timestamp, or vendor lot mapping** connecting image pixels to simulation rows.
> ForgeMind AI **strictly enforces this demarcation** and does not fabricate relationships between images and stations.
