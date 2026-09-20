# ForgeMind AI — Model Card: EfficientNet-B0 Visual Defect Classifier

## 1. Model Details
- **Model Name**: ForgeMind EfficientNet-B0 Defect Classifier
- **Model Version**: v1.0.0-production
- **Architecture**: `EfficientNet-B0` (Pretrained on ImageNet-1k, fine-tuned classification head)
- **Input Dimensions**: 224 × 224 × 3 (RGB, normalized using standard ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`)
- **Output**: 5-class Softmax probability distribution over the industrial defect taxonomy
- **Framework**: PyTorch 2.5+ / torchvision

---

## 2. Target Taxonomy & Defect Classes
The model is trained strictly to classify visual surface morphology into five discrete industrial categories:

| Index | Class Name | Morphology & Visual Characteristics | Severity Category |
| :---: | :--- | :--- | :---: |
| **0** | **Crack** | Linear surface fractures, stress tears, structural fissures | High / Critical |
| **1** | **Normal** | Defect-free surface within dimensional and surface roughness tolerances | Normal (Pass) |
| **2** | **Hole** | Cavities, gas porosity pockets, punctures, voids | Critical |
| **3** | **Scratch** | Mechanical friction marks, abrasions, tooling drag scores | Medium |
| **4** | **Rust** | Surface oxidation, corrosion pitting, chemical degradation | High |

---

## 3. Training & Validation Dataset
- **Total Raw Images**: 10,726 industrial inspection images
  - `Crack`: 2,400 images (22.38%)
  - `Normal`: 2,400 images (22.38%)
  - `Hole`: 2,400 images (22.38%)
  - `Scratch`: 2,400 images (22.38%)
  - `Rust`: 1,126 images (10.50% — class imbalance)
- **Split Strategy**: Stratified 70% Train (7,508 images), 15% Validation (1,609 images), 15% Test (1,609 images) with fixed random seed `SEED = 42`.
- **Integrity Guarantee**: Duplicate hashing, resolution verification, and zero leakage between partitions.
- **Class Balancing**: Inverse-frequency class weights applied to `CrossEntropyLoss`:
  - `w(Crack) = 0.815`, `w(Normal) = 0.815`, `w(Hole) = 0.815`, `w(Scratch) = 0.815`, `w(Rust) = 1.738`.

---

## 4. Explainability: Grad-CAM
- **Target Layer**: Final convolutional layer of backbone (`model.features[-1]`).
- **Function**: Computes gradients of the target class score with respect to feature maps, yielding a coarse spatial activation heatmap blended via OpenCV `COLORMAP_JET`.
- **Operational Interpretation**:
  - **Attention / Focus Area**: Explains which visual patterns and spatial zones the neural network concentrated on to reach its decision.
  - **NOT Exact Defect Segmentation**: Grad-CAM does **not** provide pixel-level defect contours or millimeter-exact boundaries.

---

## 5. Scope & Explicit Non-Claims
- **Visual Classification Only**: The model strictly classifies visual surface defects from 2D images.
- **No Physical Root Cause**: The classifier does not determine metallurgical defects, thermal cycling causes, machine tool wear, or operator error directly from pixels. Root causes require correlation with factory discrete telemetry.
- **No Financial Loss / Impact**: Scrap costs, rework hours, and line downtime are derived from external MES / ERP business logic, not the neural network.
- **No Machine / Line Localization**: Workstation routing (e.g., Station S1 vs S3) is tracked via factory serial barcodes and line sensors, not visual prediction.

---

## 6. Preprocessing & Quality Gate
Before inference, all inputs pass through an OpenCV quality validation pipeline:
1. **Integrity**: Decodable image with valid dimensions ($\ge 64 \times 64$).
2. **Sharpness (Blur)**: Laplacian variance $\sigma^2 \ge 80.0$.
3. **Illumination**: Mean luminance within $[30, 240]$ to prevent severe underexposure or washed-out glare.
4. **Flagging**: Images failing criteria are flagged `LOW_QUALITY`, alerting quality engineers to review camera focus or lighting before relying on classification.

---

## 7. Model Checkpoint & Deployment Artifacts
- **Model Checkpoint**: `models/efficientnet_b0_forgemind_best.pth`
- **Class Names Map**: `models/class_names.json`
- **Model Metadata**: `models/model_config.json`
- **FastAPI Endpoint**: `POST /api/v1/classify-image`
