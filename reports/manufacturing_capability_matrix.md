# ForgeMind AI — Manufacturing Capability Matrix

**Dataset Reference:** Discrete-Event Manufacturing Simulation ([Mendeley DOI: 10.17632/3rw227zxt7.2](https://data.mendeley.com/datasets/3rw227zxt7/2))  
**Version:** 2.0 (Arena Discrete-Event Simulation Models 1 & 2)  
**Evaluation Standard:** Strictly grounded in actual dataset schema. Zero fabricated calculations.

---

## 1. Comprehensive Capability Evaluation Matrix

| # | Capability | Status | Actual Fields Used | Legitimate Calculation Method | Evidence Tag |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **A** | **Production Throughput** | `SUPPORTED` | `Parts per hour`, `Total parts` (M1); `Entities Out` (M2) | Empirical mean, median, standard deviation, and hourly throughput distribution | `[CALCULATED]` |
| **B** | **Process Utilization** | `SUPPORTED` | `Drilling Util`, `Milling Util`, `Assembly Util` (M1); `Drilling Utilization`, `Milling Utilization`, `Assembly Utilization` (M2) | Mean and peak station busy fractions $\bar{U}_s = \frac{1}{N} \sum U_{s,i}$ | `[CALCULATED]` |
| **C** | **Bottleneck Identification** | `SUPPORTED` | Utilization fields, `Assembly Waiting Time`, `Drilling Queue Time`, `Assembly Queue Time` | Multi-factor constraint ranking identifying station with persistent queue accumulation and maximum utilization | `[CALCULATED]` |
| **D** | **Waiting-Time Analysis** | `SUPPORTED` | `Drilling Waiting Time`, `Milling Waiting Time`, `Assembly Waiting Time` (M1) | Station delay evaluation quantifying work-in-progress idle time | `[CALCULATED]` |
| **E** | **Queue Analysis** | `SUPPORTED` | `Drilling Queue Time`, `Milling Queue Time`, `Assembly Queue Time` (M2) | In-queue buffer dwell duration prior to cell admission | `[CALCULATED]` |
| **F** | **Process-Time Analysis** | `SUPPORTED` | `VA Time` (M1); `Part 1 VA Time`, `Part 2 VA Time`, `Assembly Time` (M2) | Value-Added execution cycle timing distributions | `[CALCULATED]` |
| **G** | **Production Capacity Analysis** | `SUPPORTED` | `Demand`, `Parts per hour`, Station Utilizations | Line capacity ceiling and maximum sustainable throughput under demand saturation | `[CALCULATED]` |
| **H** | **Inventory / Buffer Analysis** | `SUPPORTED` (M2) / `NOT SUPPORTED` (M1) | `Part 1 Stored`, `Part 2 Stored`, `Part 1 Storage Time`, `Part 2 Storage Time` (Model 2 only) | Intermediate WIP buffer stock counts and holding time | `[CALCULATED]` |
| **I** | **Demand vs. Production** | `SUPPORTED` | `Demand`, `Total parts`, `Entities Out` | Fulfillment delta and starvation/overload sensitivity curves | `[CALCULATED]` |
| **J** | **What-If Simulation** | `SUPPORTED` | All simulation features across 3,000 runs | Multi-variable scenario analysis based on actual discrete-event dataset runs | `[SIMULATED]` |
| **K** | **Economic Impact** | `NOT SUPPORTED` | *None* (No cost, price, wage, or scrap fields in dataset) | Raw dataset does NOT provide financial variables. Marked unavailable from raw dataset alone. | `[NOT AVAILABLE]` |
| **L** | **Defect / Root-Cause Linkage** | `NOT SUPPORTED` | *None* (No defect labels or quality flags in simulation) | Arena dataset has NO quality tags. Cannot establish statistical or causal link to inspection images. | `[NOT AVAILABLE]` |

---

## 2. Strict Demarcation of Non-Supported Features

### Why Economic Impact is Marked Not Available
The Mendeley Discrete-Event dataset is an operational simulation log. It contains operational durations (minutes) and unit counts, but **zero financial columns** (e.g., no raw material purchase cost, labor rate per hour, kilowatt energy tariffs, or scrap disposal fees).
* **ForgeMind Policy:** ForgeMind AI displays:
  > *"Financial impact cannot currently be calculated because cost/revenue data is not available in the simulation dataset."*
  Arbitrary financial numbers are not fabricated.

### Why Image-to-Manufacturing Linkage is Marked Not Available
* **Visual Dataset:** Contains image files classified by morphology (Crack, Normal, Hole, Scratch, Rust).
* **Simulation Dataset:** Contains aggregate time-series simulation outputs from Rockwell Arena.
* **Linkage Reality:** There is no primary key, batch identifier, machine serial number, or timestamp that links an image specimen to a simulation record.
* **ForgeMind Policy:** The UI explicitly displays:
  > *"Visual-to-production record linkage is not available in the supplied datasets."*

---

## 3. Supported Analytical Architecture in ForgeMind AI

1. **Discrete-Event Line Intelligence:**
   Calculates actual station utilization, true bottleneck stations (Assembly in Model 1, Assembly/Drilling in Model 2), queue dwell times, and throughput limits directly from `Model_1.csv` and `Model_2.csv`.
2. **Visual Morphology Classifier (EfficientNet-B0):**
   Identifies surface defect classes with model confidence and Grad-CAM visual attention overlays.
3. **Engineering Knowledge Layer (RAG + Gemini):**
   Provides evidence-grounded potential causes and recommended investigation procedures from validated FMEA and manufacturing SOP references, labeled as `[HYPOTHESIS]` and `Advisory — requires engineer verification`.
