# ForgeMind AI

### Industrial Visual Inspection & Operational Decision-Support Platform

ForgeMind AI bridges the gap between computer vision defect detection and factory operational decisions. When an inspection image is uploaded, the platform classifies the surface defect morphology, highlights its contributing visual regions via Grad-CAM, links the event to simulated line station context, estimates downstream queue pressure and financial loss ranges, presents actionable engineering containment options for human review, and persists verified resolutions to PostgreSQL for automated retrieval on repeat defects:

$$\text{Image} \longrightarrow \text{Defect Type + Heatmap} \longrightarrow \text{Simulated Line Cause} \longrightarrow \text{Flow \& Profit Ranges} \longrightarrow \text{Human Decision (Approve/Edit/Reject)} \longrightarrow \text{Case Library Reuse}$$

---

## 1. Problem Statement

In industrial manufacturing, defect inspection cannot operate as an isolated task. Standard computer vision models function merely as label predictors: an image enters, a class like "Crack" or "Hole" is returned, and the model halts.

Plant supervisors, quality engineers, and continuous improvement teams face critical questions that standard image classifiers cannot answer:
1. **Root-Cause Origin**: *Which workstation, tooling feed rate, or thermal cycle likely produced this anomaly?*
2. **Operational Flow Impact**: *How will an elevated defect rate impact downstream station queues, buffer capacities, and overall parts-per-hour throughput?*
3. **Financial Consequence**: *What is the net profit loss under fluctuating material scrap and rework labor rates?*
4. **Actionable Containment**: *What standard operating procedure (SOP) or verified historical fix should be applied immediately?*
5. **Organizational Memory**: *When the same defect recurs three shifts later, how can the team retrieve the previously approved fix rather than re-diagnosing from scratch?*

ForgeMind AI solves this operational problem by combining computer vision, discrete-event line dynamics, Monte Carlo unit economics, and a persistent human-in-the-loop review workflow.

---

## 2. What Makes ForgeMind AI Different

Every capability listed below is verified in the active codebase:

1. **"Uncertain / Novel" Rejection Gate (No Forced Guesses)**:
   Instead of forcing ambiguous, blurred, or novel specimens into a closed 5-class taxonomy, the inference service flags predictions as `"Uncertain / Novel"` whenever:
   - Softmax top-1 confidence $< 0.85$, OR
   - Top-2 logit probability margin $< 0.15$, OR
   - Normalized Shannon entropy $> 0.60$ $\left(\frac{H}{\ln K}\right)$.
   *Verified in [`scripts/ml/inference_service.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/inference_service.py).*

2. **Persistent Human Review & Repeat-Defect Reuse**:
   Engineers review every classification with three explicit actions:
   - **Approve**: Adopts recommended containment fix.
   - **Edit**: Customizes corrective action text and adds reviewer notes.
   - **Reject**: Declines recommendation with mandatory logged justification.
   All decisions persist to PostgreSQL (`DefectCaseReview`) via SQLAlchemy. On subsequent identical defects, the system automatically retrieves previously approved actions for instant re-approval.
   *Verified in [`backend/models.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/models.py), [`scripts/forgemind/cure_prevention_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/cure_prevention_engine.py), and [`backend/server.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/server.py).*

3. **Structured Case Lifecycle & Verification**:
   Cases advance through auditable operational states:
   $$\text{NEW} \longrightarrow \text{IN\_REVIEW} \longrightarrow \text{ACTION\_APPLIED} \longrightarrow \text{VERIFIED} \;\;(\text{or } \text{DEFECT\_RECURRED})$$
   *Verified in [`scripts/forgemind/cure_prevention_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/cure_prevention_engine.py).*

4. **Transparent Trust & Evidence Tagging**:
   Every numerical and qualitative output is explicitly labeled with provenance tags:
   - `[SIMULATED]`: For deterministic synthetic line linkages and discrete-event flow runs.
   - `[HYPOTHESIS_ONLY]`: For exploratory root-cause correlations requiring physical confirmation.
   - `[USER CONFIRMED]`: For engineer-validated actions and baseline parameter values.
   - `SIMULATED RANGE`: For Monte Carlo cost distributions.
   *Verified in [`backend/schemas.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/schemas.py) and [`backend/server.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/server.py).*

5. **Profit & Margin Ranges via Monte Carlo Simulation**:
   Instead of misleading single-point estimates, user-entered unit price, material cost, scrap cost, and rework cost are simulated over 500 iterations with fixed seed (42) and $\pm 10\text{--}20\%$ cost variation, yielding $p_{10}$, $p_{50}$, and $p_{90}$ ranges for estimated profit, margin %, and total defect loss.
   *Verified in [`scripts/forgemind/economic_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/economic_engine.py).*

6. **Batch-to-Batch Drift Monitoring**:
   Evaluates sequential production windows against reference distributions using two-sample Kolmogorov-Smirnov tests ($p < 0.01$), Population Stability Index (PSI $> 0.25$), and cumulative sum control charts (CUSUM $> 4.0$).
   *Verified in [`scripts/forgemind/drift_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/drift_engine.py).*

7. **Self-Audit of Accuracy & Leakage**:
   An offline audit script computes 64-bit dHash pairwise Hamming distance to identify near-duplicates ($d \le 5$) between train and test splits, and stress-tests model accuracy under 4 physical optical perturbations (Gaussian blur, underexposure $0.5\times$, overexposure $1.5\times$, JPEG quality 30).
   *Verified in [`scripts/ml/robustness_check.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/robustness_check.py) and [`reports/robustness_report.md`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/reports/robustness_report.md).*

---

## 3. System Architecture

```mermaid
flowchart TD
    subgraph UI ["Frontend Interface (React 18 + Vite + Tailwind CSS)"]
        Upload[Specimen Image Upload]
        ResultView[Analysis Result & Heatmap View]
        ReviewActions[Approve / Edit / Reject Controls]
        CostForm[Custom Economics Input Form]
        DriftCard[Batch Drift Monitoring Card]
    end

    subgraph Vision ["Layer 1: Visual Inspection & Quality Gate"]
        OpenCVGate["OpenCV Quality Gate\n(Sharpness >= 80, Luminance [30, 240])"]
        Model["EfficientNet-B0 Classifier\n(5 Classes + Softmax Distribution)"]
        Uncertainty["Uncertainty Gate\n(Conf < 0.85 | Margin < 0.15 | Entropy > 0.60)"]
        GradCAM["Grad-CAM Engine\n(Visual Attention Heatmap Overlay)"]
    end

    subgraph Linkage ["Layer 2: Production Linkage & Root Cause"]
        SimLinkage["Simulated Deterministic Linkage\n(Station ID, Batch ID, Telemetry)"]
        RootCause["Root-Cause Synthesis Engine\n(Evidence-Weighted Hypothesis Ranking)"]
    end

    subgraph Flow ["Layer 3: Discrete-Event Flow Dynamics"]
        Bottleneck["Bottleneck Intelligence Engine\n(Utilization Imbalance, Queue Pressure)"]
        Drift["Drift Engine\n(KS Test, PSI, CUSUM)"]
    end

    subgraph Economics ["Layer 4: Unit Economics & Range Modeling"]
        MonteCarlo["Monte Carlo Simulator (N=500, Seed 42)\n(p10, p50, p90 Ranges for Profit & Margin)"]
    end

    subgraph Decision ["Layer 5: Decision Support & RAG Knowledge"]
        RAG["Knowledge Retriever\n(Engineering Markdown KB Guides)"]
        Assistant["Factory Assistant Copilot\n(Gemini Reasoning + Deterministic Fallback)"]
    end

    subgraph Store ["Layer 6: Human Review & Case Persistence"]
        DB[(PostgreSQL / SQLite Fallback\nDefectCaseReview Table)]
        Registry["In-Memory Case Registry\n(Rebuilt from DB on Startup)"]
    end

    Upload --> OpenCVGate
    OpenCVGate --> Model
    Model --> Uncertainty
    Model --> GradCAM
    Uncertainty --> ResultView
    GradCAM --> ResultView

    Model --> SimLinkage
    SimLinkage --> RootCause
    RootCause --> Bottleneck
    Bottleneck --> Drift
    Drift --> DriftCard

    Model --> MonteCarlo
    CostForm --> MonteCarlo
    MonteCarlo --> ResultView

    Model --> RAG
    RAG --> Assistant
    RAG --> ResultView

    ResultView --> ReviewActions
    ReviewActions --> DB
    DB --> Registry
    Registry -.->|Fast Reuse on Repeat Defect| ResultView
```

### Architectural Layers
- **Vision Layer**: Validates input image integrity with OpenCV (Laplacian variance $\ge 80.0$, mean brightness $[30, 230]$). Executes forward pass through EfficientNet-B0, calculates logit margin and normalized Shannon entropy, and overlays a Grad-CAM visual attention heatmap.
- **Root Cause & Linkage Layer**: Computes a deterministic hash linkage connecting inspection specimens to synthetic workstation IDs (`Station_1` to `Station_3`), batch identifiers, and operational telemetry.
- **Flow Dynamics Layer**: Models work-center cycle times, queue pressures, and utilization imbalances based on discrete-event manufacturing datasets (Mendeley DOI: 10.17632/3rw227zxt7.2).
- **Economics Layer**: Computes baseline point estimates and Monte Carlo range projections ($p_{10}$, $p_{50}$, $p_{90}$) for scrap losses, rework costs, total financial exposure, and run profit margins.
- **Decision & RAG Layer**: Performs keyword-indexed retrieval across structured engineering knowledge guides (`data/engineering_knowledge/`) and augments the factory assistant copilot via Google Gemini with deterministic RAG fallback.
- **Human Review & Persistence Layer**: Mediates human validation (Approve/Edit/Reject) and maintains persistent state in PostgreSQL (`defect_case_reviews`) with in-memory fallback.

---

## 4. Features Mapped to Operational Requirements

| Operational Requirement | How It Is Addressed in ForgeMind AI | Implementation Status | Key Codebase Files |
| :--- | :--- | :---: | :--- |
| **Surface Defect Classification** | EfficientNet-B0 fine-tuned on 5 discrete classes (Crack, Normal, Hole, Scratch, Rust). | **Implemented** | [`scripts/ml/model.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/model.py), [`scripts/ml/inference_service.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/inference_service.py) |
| **Spatial Defect Localization** | Coarse spatial feature-attribution heatmap via Grad-CAM (final convolutional layer). *Note: Provides visual attention area, not precise bounding boxes.* | **Implemented (Heatmap)**<br>*Roadmap (Bounding Boxes)* | [`scripts/ml/gradcam.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/gradcam.py) |
| **Optical Quality Validation** | OpenCV Laplacian variance sharpness check and luminance bounds evaluation before inference. | **Implemented** | [`scripts/ml/opencv_quality.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/opencv_quality.py) |
| **Out-of-Distribution Rejection** | Multi-factor uncertainty heuristic: confidence $< 0.85$, margin $< 0.15$, or normalized entropy $> 0.60$. *Note: Proxy heuristic; not a dedicated generative OOD model.* | **Implemented (Proxy)**<br>*Roadmap (PatchCore)* | [`scripts/ml/inference_service.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/inference_service.py) |
| **Inspection-to-Station Linkage** | Deterministic hash mapping generating synthetic station ID, batch ID, and operational context. *Note: Simulated linkage, not physical MES telemetry.* | **Implemented (Simulated)**<br>*Roadmap (Live MES)* | [`scripts/forgemind/simulated_linkage.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/simulated_linkage.py) |
| **Process Bottleneck Diagnosis** | Workstation utilization imbalance, queue pressure, and throughput analysis on discrete-event data. | **Implemented** | [`scripts/forgemind/bottleneck_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/bottleneck_engine.py) |
| **Batch Drift Detection** | Sequential batch monitoring using two-sample KS test, Population Stability Index (PSI), and CUSUM. | **Implemented** | [`scripts/forgemind/drift_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/drift_engine.py) |
| **Profit & Margin Estimation** | Monte Carlo range modeling (500 samples, fixed seed 42) computing $p_{10}$, $p_{50}$, $p_{90}$ financial ranges. | **Implemented** | [`scripts/forgemind/economic_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/economic_engine.py) |
| **Action Recommendation** | Retrieval across curated engineering standard operating procedures (SOPs). | **Implemented** | [`scripts/forgemind/cure_prevention_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/cure_prevention_engine.py), [`scripts/ml/knowledge_retriever.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/knowledge_retriever.py) |
| **Human Review Persistence** | SQLAlchemy model `DefectCaseReview` storing approval, edit, reject decisions and reloaded on startup. | **Implemented** | [`backend/models.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/models.py), [`scripts/forgemind/cure_prevention_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/cure_prevention_engine.py) |
| **Repeat Fix Auto-Retrieval** | Historical case library matching repeat defects to previously approved actions for instant reuse. | **Implemented** | [`scripts/forgemind/cure_prevention_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/cure_prevention_engine.py) |
| **Verification Gate** | Case lifecycle outcome recording (`VERIFIED` vs `DEFECT_RECURRED`). | **Implemented** | [`scripts/forgemind/cure_prevention_engine.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/forgemind/cure_prevention_engine.py) |

---

## 5. Technology Stack

| Layer | Technologies & Dependencies | Source Reference |
| :--- | :--- | :--- |
| **Frontend UI** | React 18.3, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4, React Router 7.18, Firebase 12.19 | [`frontend/package.json`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/frontend/package.json) |
| **Backend API** | Python 3.10+, FastAPI 0.110+, Uvicorn 0.28+, Pydantic 2.6+, Python-Dotenv 1.0+ | [`requirements.txt`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/requirements.txt), [`backend/server.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/server.py) |
| **Database & ORM** | PostgreSQL, SQLAlchemy 2.0+, Psycopg2-binary 2.9+ (with in-memory fallback) | [`backend/database.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/database.py), [`backend/models.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/models.py) |
| **Vision & ML** | PyTorch 2.1+, Torchvision, OpenCV 4.x/5.0, Pillow, ImageHash 4.3+ | [`scripts/ml/model.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/model.py), [`scripts/ml/inference_service.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/inference_service.py) |
| **Data Analytics** | Pandas 2.0+, NumPy 1.24+, Scikit-learn 1.3+, SciPy 1.10+ | [`requirements.txt`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/requirements.txt) |
| **AI Copilot** | Google Gemini API (`gemini-2.5-flash` reasoning) with deterministic RAG fallback | [`scripts/ml/gemini_reasoning.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/scripts/ml/gemini_reasoning.py) |
| **Testing** | Pytest 7.3+, Coverage 7.1+ (119 automated passing tests) | [`tests/`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/tests/) |
| **Deployment** | Render Web Service + Managed PostgreSQL (`render.yaml`) | [`render.yaml`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/render.yaml) |

---

## 6. Model Performance & Robustness Audit

### Model Architecture & Training Setup
- **Architecture**: `EfficientNet-B0` (Pretrained on ImageNet-1k, customized 5-class linear head with dropout 0.2).
- **Checkpoint**: `models/efficientnet_b0_forgemind_best.pth`.
- **Dataset Size**: 10,726 industrial inspection images across 5 classes (`Crack`: 2,400, `Normal`: 2,400, `Hole`: 2,400, `Scratch`: 2,400, `Rust`: 1,126).
- **Split Strategy**: Stratified 70% Train (7,508 images), 15% Validation (1,609 images), 15% Held-Out Test (1,609 images), random seed 42.

### Held-Out Test Split Performance
*Source: [`reports/classification_report.txt`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/reports/classification_report.txt)*

- **Overall Accuracy**: **98.20%** (1,580 / 1,609 correct)
- **Macro F1-Score**: **98.30%** *(Source: `classification_report.txt`)*
- **Macro Precision**: **98.30%** | **Macro Recall**: **98.33%**

| Defect Class | Support | Precision | Recall (Sensitivity) | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| **Crack** | 360 | 98.85% | 95.56% | 97.18% |
| **Normal** | 360 | 94.67% | 98.61% | 96.60% |
| **Hole** | 360 | 99.17% | 99.44% | 99.31% |
| **Scratch** | 360 | 100.00% | 98.61% | 99.30% |
| **Rust** | 169 | 98.82% | 99.41% | 99.12% |

> [!NOTE]
> **Source Discrepancy Notice**: `reports/classification_report.txt` evaluates the unpartitioned held-out test split, reporting **98.30% Macro F1**. In contrast, `reports/robustness_report.md` evaluates the split divided into distinct and near-duplicate subsets, yielding an aggregated Macro F1 of **97.51%**. The 98.30% figure from `classification_report.txt` is cited as the primary benchmark.

### Train-Test Leakage Audit (dHash Analysis)
*Source: [`reports/robustness_report.md`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/reports/robustness_report.md)*

Using 64-bit perceptual difference hashing (`dHash`, $8\times8$), pairwise Hamming distances between all 7,508 training images and 1,609 test images were computed:
- **Exact Matches ($d = 0$)**: 170 images (**10.57%**)
- **Near-Duplicates ($d \le 5$ bits)**: 707 images (**43.94%**)
- **Distinct Images ($d > 5$ bits)**: 902 images (**56.06%**)
- **Mean Minimum Distance**: 7.09 bits (Median: 6.0 bits)

#### Leakage-Controlled Generalization Comparison:
Evaluating the model across the isolated subsets reveals the effect of near-duplicate leakage:

| Metric | Distinct Test Subset ($d > 5$, N=902) | Near-Duplicate Subset ($d \le 5$, N=707) | Full Held-Out Split (N=1,609) |
| :--- | :---: | :---: | :---: |
| **Raw Top-1 Accuracy** | **99.11%** | **97.03%** | **98.20%** |
| **Macro F1-Score** | **98.68%** | **96.02%** | **97.51%** |
| **Filtered / Accepted Accuracy** | **100.00%** *(on 87.25% accepted)* | **100.00%** *(on 73.69% accepted)* | **100.00%** *(on 81.29% accepted)* |
| **Flagged "Uncertain / Novel"** | **12.75%** | **26.31%** | **18.71%** |
| **Mean Prediction Confidence** | 94.23% | 88.95% | 91.91% |

*Key finding: The model maintains **99.11% accuracy** on novel, distinct images ($d > 5$). The near-duplicate subset is dominated by uniform defect-free metal surfaces (284 of 360 normal test images are near-duplicates), where subtle surface reflectance variations trigger higher uncertainty.*

### Optical Perturbation Stress Testing
*Evaluated on a 300-image random test subset (`seed=42`). Source: [`reports/robustness_report.md`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/reports/robustness_report.md)*

| Condition | Physical Optical Stress | Raw Top-1 Acc | Filtered / Accepted Acc* | Share Flagged Uncertain / Novel | Mean Confidence |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Clean Baseline** | Unperturbed test images | **98.67%** | **100.00%** *(on 82.0% accepted)* | **18.00%** | 92.72% |
| **Gaussian Blur** | Defocused lens / vibration ($\sigma=1.5$, $7\times7$) | **87.00%** | **100.00%** *(on 39.3% accepted)* | **60.67%** | 74.81% |
| **Brightness $\times 0.5$** | 50% underexposure / shadowing | **97.00%** | **100.00%** *(on 73.7% accepted)* | **26.33%** | 88.23% |
| **Brightness $\times 1.5$** | 150% overexposure / surface glare | **90.67%** | **100.00%** *(on 66.0% accepted)* | **34.00%** | 84.06% |
| **JPEG Quality 30** | Lossy edge sensor compression | **89.00%** | **100.00%** *(on 46.0% accepted)* | **54.00%** | 73.38% |

> [!IMPORTANT]
> **Conditional Accuracy Notice**: "100.00% Accepted Accuracy" is strictly conditional on the share of samples flagged as uncertain. For example, under Gaussian blur, the model achieves 100% accuracy on the accepted samples by safely abstaining on and flagging **60.67%** of the degraded specimens for human review.

---

## 7. Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18.0+ and npm
- PostgreSQL (optional; the platform automatically falls back to in-memory registry if PostgreSQL is unavailable)

### 1. Clone & Environment Configuration
```bash
git clone https://github.com/Yogender-verma/ForgeMind-Ai.git
cd "ForgeMind AI"

# Copy the environment template
cp .env.example .env
```

Configure your `.env` with appropriate placeholders (do not commit real secrets):
```ini
ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0
DATABASE_URL=postgresql+psycopg2://forgemind_user:your_password@localhost:5432/forgemind
ALLOWED_ORIGINS=*

# Optional: Google Gemini API key (falls back to deterministic RAG if omitted)
GEMINI_API_KEY=your_gemini_api_key_placeholder

# Frontend API URL
VITE_API_BASE_URL=http://localhost:8000
```

### 2. Dataset & Model Checkpoint Setup
Both the raw dataset and trained model weights are gitignored due to file size.

1. **Model Checkpoint**:
   Ensure `models/efficientnet_b0_forgemind_best.pth` exists. If training from scratch:
   ```bash
   python train.py --epochs 15 --batch-size 32
   ```
2. **Dataset**:
   Ensure `dataset/splits/train.csv`, `validation.csv`, and `test.csv` exist in `dataset/splits/`. If starting from raw images:
   ```bash
   python prepare_dataset.py
   ```

### 3. Backend Setup
```bash
# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend server
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```
*The database schema (`init_db()`) and case review registry are automatically initialized on startup.*

### 4. Frontend Setup
```bash
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Running Automated Tests
Execute the comprehensive test suite:
```bash
pytest
```
*Current test suite status: **119 passed in ~52s** (0 failures).*

---

## 8. API Overview

All routes are implemented in [`backend/server.py`](file:///c:/Users/Yogendar/Downloads/ForgeMind%20AI/backend/server.py) and documented interactively at `/docs`:

| Method | Endpoint Path | Primary Purpose | Trust Tag |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/status` | System health check, active models, and PostgreSQL connectivity status | System |
| `GET` | `/api/models` | Metadata and station topologies for Model 1 (3-station) and Model 2 (dual-part) | `[MEASURED]` |
| `GET` | `/api/process-health` | Work-center capacity, queue pressure, and utilization metrics | `[CALCULATED]` |
| `GET` | `/api/bottlenecks` | Line bottleneck diagnosis using station cycle time and buffer occupancy | `[CALCULATED]` |
| `GET` | `/api/root-causes` | Evidence-weighted synthesis correlating bottlenecks to line telemetry | `[HYPOTHESIS_ONLY]` |
| `GET` | `/api/ml/feature-importance` | Random Forest feature importance modeling for throughput drivers | `[ESTIMATED]` |
| `GET` | `/api/ml/anomalies` | Isolation Forest anomaly detection across station telemetry streams | `[ESTIMATED]` |
| `POST` | `/api/v1/classify-image` | EfficientNet-B0 defect classification, OpenCV quality check, and Grad-CAM | Visual ML |
| `POST` | `/api/v1/investigate-defect` | Multi-modal defect investigation linking visual defect to station context | `[SIMULATED]` |
| `GET` | `/api/v1/drift` | Batch drift detection across rolling windows (KS test, PSI, CUSUM) | `[SIMULATED]` |
| `POST` | `/api/v1/economic/custom` | Monte Carlo range calculation ($p_{10}, p_{50}, p_{90}$) from user costs | `SIMULATED RANGE` |
| `GET` | `/api/v1/economic/what-if` | Containment action cost-benefit comparison trade-offs | `[ESTIMATED]` |
| `GET` | `/api/v1/cases` | List all historical defect cases from PostgreSQL / in-memory store | Persistent |
| `GET` | `/api/v1/cases/similar` | Retrieve approved historical cases matching a specific defect type | Persistent |
| `POST` | `/api/v1/cases/{case_id}/approve` | Persist human approval of recommended engineering action | `[USER CONFIRMED]` |
| `POST` | `/api/v1/cases/{case_id}/edit` | Persist customized action text and reviewer notes | `[USER CONFIRMED]` |
| `POST` | `/api/v1/cases/{case_id}/reject` | Reject recommendation with mandatory logged reason | `[USER CONFIRMED]` |
| `POST` | `/api/v1/cases/{case_id}/verify` | Verify action efficacy (`VERIFIED` vs `DEFECT_RECURRED`) | Lifecycle |
| `POST` | `/api/v1/factory-assistant/chat` | AI factory copilot chat (Gemini reasoning + deterministic RAG fallback) | Decision |
| `POST` | `/api/simulation/run` | Execute discrete-event manufacturing simulation under custom parameters | `[SIMULATED]` |

---

## 9. Demonstration Walkthrough

Follow these steps to verify the end-to-end intelligence workflow:

1. **Inspect a Clear Defect**:
   - In the frontend, navigate to **Analysis** and upload a specimen image (e.g. `dataset/raw/crack/crack_00008.png`).
   - The system displays the predicted class (**Crack**), confidence score ($> 95\%$), and an interactive Grad-CAM heatmap highlighting visual fractures.
2. **Inspect an Ambiguous / Degraded Image**:
   - Upload an overexposed, blurry, or low-contrast image.
   - The multi-factor uncertainty gate triggers, returning **"Uncertain / Novel"** with a advisory notice: *"needs human review, possible novel defect"*.
3. **Conduct Human Review (Approve, Edit, or Reject)**:
   - Click **Approve** to accept the recommended fix, **Edit** to modify the action with a custom note, or **Reject** with a mandatory reason.
   - The updated decision and timestamp are immediately displayed and persisted to PostgreSQL.
4. **Demonstrate Repeat Defect Reuse**:
   - Upload another image of the same defect category.
   - The platform identifies the historical match and displays the previously approved action beside an **"Apply Previous Action"** button for instant one-click validation.
   - Restart the backend server (`uvicorn`) and repeat the inspection; the approved action is restored seamlessly from PostgreSQL.
5. **Monitor Batch Drift on Dashboard**:
   - Navigate to the **Dashboard**.
   - Review the **Batch Drift Monitoring** card showing PSI bar charts and KS test $p$-values across rolling 100-run windows, flagging shifted batches with advisory investigation tags.
6. **Simulate Custom Economic Ranges**:
   - In the **Economic Impact** panel, enter custom parameters (e.g., Unit Price = \$250, Scrap Cost = \$85, Rework Cost = \$40).
   - Click **Calculate Custom Impact**. The system generates 500 Monte Carlo runs and displays $p_{10}$, $p_{50}$, and $p_{90}$ ranges for run profit and total defect losses labeled `SIMULATED RANGE`.

---

## 10. Safety, Scope & Operational Boundaries

ForgeMind AI is designed strictly as an **advisory and decision-support tool**:
- **No Machine Control**: The software has zero direct connection to Programmable Logic Controllers (PLCs), Industrial Robots, Computer Numerical Control (CNC) machinery, or emergency stop circuits.
- **No Direct Actuation**: Recommendations must be validated and physically implemented by qualified manufacturing personnel.
- **Simulated Figures**: Financial calculations and station linkages are mathematical approximations and discrete-event simulations, not certified accounting or ERP ledgers.

---

## 11. Known Limitations

In the interest of engineering transparency, the following technical limitations are documented:

1. **Train-Test Near-Duplicate Overlap (43.94%)**:
   Perceptual dHash analysis reveals that 43.94% of test images share near-duplicate visual characteristics ($d \le 5$) with the training set, particularly uniform defect-free metal specimens. While accuracy on completely distinct images remains high (99.11%), split deduplication is recommended for future dataset iterations.
2. **Normal Surface Rejection Rate**:
   Because uniform defect-free metal surfaces have minimal edge features, subtle illumination shifts produce diffuse softmax distributions. As a result, the uncertainty gate flags a substantial proportion of clean `Normal` images (up to 40–60%) for review.
3. **Simulated Production Linkage**:
   The correlation between an uploaded image and a specific workstation or batch ID is a deterministic synthetic mapping, not physical line RFID/barcode tracking.
4. **Coarse Spatial Attribution**:
   Grad-CAM heatmaps highlight general activation areas corresponding to the $7\times7$ receptive fields of the final convolutional layer. They do not represent millimeter-accurate bounding boxes or pixel segmentation contours.

---

## 12. Roadmap

The following enhancements are planned for future releases:
- [ ] **Bounding-Box Defect Localization**: Integrate YOLOv8 / RT-DETR for bounding-box coordinate detection and millimeter defect sizing.
- [ ] **Dedicated OOD Detection Model**: Replace heuristic uncertainty gating with deep feature-space novelty detection (e.g., PatchCore or Mahalanobis distance embeddings).
- [ ] **Cost-Aware Review Thresholds**: Dynamically adjust confidence rejection thresholds based on defect financial risk (e.g., stringent thresholds for costly structural cracks vs. lenient thresholds for cosmetic scratches).
- [ ] **Vector-Search Historical Case Matching**: Transition historical case retrieval to pgvector / FAISS embeddings for semantic multi-case ranking.
- [ ] **Physical MES / SCADA Integration**: Implement OPC-UA and MQTT telemetry connectors for live line integration.

---

## 13. Project Structure

```
ForgeMind AI/
├── backend/                        # FastAPI Backend Service
│   ├── database.py                 # SQLAlchemy engine & session management
│   ├── models.py                   # DefectCaseReview PostgreSQL ORM model
│   ├── schemas.py                  # Pydantic request/response schemas
│   └── server.py                   # REST API routes and lifespan hooks
├── frontend/                       # React + TypeScript Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── analysis/           # Visual inspection, Grad-CAM, human review
│   │   │   ├── dashboard/          # Process KPIs, batch drift monitoring
│   │   │   ├── economics/          # Monte Carlo range forms & what-if views
│   │   │   └── simulation/         # Discrete-event simulation workbench
│   │   └── services/               # API clients and data transformers
│   └── package.json                # Frontend dependencies and Vite configuration
├── dataset/                        # Quality Inspection Dataset & Splits (Gitignored)
│   ├── raw/                        # Raw image folders (crack, normal, hole, scratch, rust)
│   └── splits/                     # Stratified 70/15/15 CSV split manifests
├── models/                         # Trained Weights & Configuration (Gitignored)
│   ├── efficientnet_b0_forgemind_best.pth  # PyTorch model checkpoint
│   ├── class_names.json            # Taxonomy class mapping
│   └── model_config.json           # Model architecture metadata
├── reports/                        # Verification, Audit & Benchmark Reports
│   ├── classification_report.txt   # Official scikit-learn held-out test metrics (98.20% Acc)
│   ├── confusion_matrix.png        # Publication-quality test confusion matrix
│   └── robustness_report.md        # Perceptual dHash leakage & perturbation audit
├── scripts/                        # Core Engineering & Analytics Engines
│   ├── forgemind/                  # Manufacturing process engines
│   │   ├── bottleneck_engine.py    # Station utilization and queue pressure
│   │   ├── cure_prevention_engine.py # SOP retrieval, review actions & verification
│   │   ├── drift_engine.py         # Batch drift detection (KS test, PSI, CUSUM)
│   │   ├── economic_engine.py      # Monte Carlo simulated profit ranges
│   │   └── simulated_linkage.py    # Deterministic station/batch mapping
│   └── ml/                         # Machine learning & inference service
│       ├── gradcam.py              # PyTorch Grad-CAM heatmap generator
│       ├── inference_service.py    # Production inference & uncertainty gate
│       ├── model.py                # EfficientNet-B0 architecture definition
│       ├── opencv_quality.py       # Laplacian blur & luminance quality filter
│       └── robustness_check.py     # Offline dHash leakage & perturbation audit
├── tests/                          # Automated Pytest Suite (119 passing tests)
│   ├── test_backend.py             # API route unit and integration tests
│   ├── test_cure_prevention.py     # Review action persistence & verification tests
│   ├── test_manufacturing_integration.py # Drift and process engine tests
│   └── test_unit_economic_impact.py # Monte Carlo range tests
├── prepare_dataset.py              # Dataset splitting and manifest generator
├── train.py                        # Model training script
├── requirements.txt                # Python production dependencies
├── render.yaml                     # Render deployment configuration
└── README.md                       # Comprehensive documentation
```

---

## 14. License & Team

- **License**: MIT License (see `LICENSE` file if present, or contact repository maintainers).
- **Authors & Contributors**: ForgeMind AI Engineering Team.
- **Repository**: [https://github.com/Yogender-verma/ForgeMind-Ai](https://github.com/Yogender-verma/ForgeMind-Ai)
