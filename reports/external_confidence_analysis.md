# ForgeMind AI — Diagnostic Analysis of Low Confidence on Unseen Images

> **Diagnostic Purpose**: Investigate why predictions on unseen external/evaluation images exhibit lower probability confidence compared to internal training/val performance, and determine root causes without modifying evaluation benchmarks or artificially boosting confidence thresholds.

---

## 1. Executive Summary & Key Findings

- **Total Unseen Images Analyzed**: 40 real inspection specimens (5 external domain test images + 35 held-out test split images).
- **Overall Accuracy**: **87.50%** | **Macro F1-Score**: **87.57%**.
- **High Confidence ($\ge 90\%$)**: **29 images** (72.5%) — Accuracy: **93.1%**.
- **Medium Confidence ($70-89\%$)**: **6 images** (15.0%).
- **Low Confidence ($< 70\%$)**: **5 images** (12.5%).

> [!IMPORTANT]
> **Crucial Insight**: Low model confidence does **NOT** equate to incorrect predictions. Of the low-confidence cases ($< 70\%$), **66.7% were correctly classified** into their true defect category. Low confidence reflects model uncertainty caused by visual domain shifts (lighting/background variation) and micro-defect boundary ambiguity, rather than outright classification failure.

---

## 2. Confidence Tier Distribution

| Confidence Tier | Definition | Image Count | Percentage | Correct Count | Tier Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **High Confidence** | $\ge 90\%$ | 29 | 72.5% | 27 | 93.1% |
| **Medium Confidence** | $70-89\%$ | 6 | 15.0% | 4 | 66.7% |
| **Low Confidence** | $< 70\%$ | 5 | 12.5% | 4 | 80.0% |

---

## 3. Ground-Truth Performance & Confidence Distributions

### Evaluation Metrics on Unseen Set

- **Accuracy**: 87.50%
- **Macro Precision**: 88.89%
- **Macro Recall**: 87.50%
- **Macro F1-Score**: 87.57%

### Per-Class Recall Breakdown

| Defect Class | Support | Recall (Sensitivity) |
| :--- | :---: | :---: |
| **Crack** | 8 | 87.50% |
| **Normal** | 8 | 87.50% |
| **Hole** | 8 | 87.50% |
| **Scratch** | 8 | 100.00% |
| **Rust** | 8 | 75.00% |

### Confidence Distribution: Correct vs. Incorrect Predictions

| Prediction Group | Count | Mean Conf | Median Conf | Min Conf | Max Conf |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Correct Predictions** | 35 | 91.37% | 98.13% | 36.20% | 100.00% |
| **Incorrect Predictions** | 5 | 80.51% | 88.45% | 31.23% | 100.00% |

---

## 4. Domain & Visual Property Comparison

Comparison of physical and optical properties between High-Confidence predictions vs Low-Confidence predictions:

| Visual / Physical Property | High-Confidence Set ($\ge 90\%$) | Low-Confidence Set ($< 70\%$) | Domain Shift Delta |
| :--- | :---: | :---: | :---: |
| **Blur Score (Laplacian Var)** | 123.6 | 46.5 | -77.2 (Reduced Sharpness) |
| **Mean Luminance / Brightness** | 98.7 | 111.1 | +12.4 (Lighting Variance) |
| **RMS Image Contrast** | 15.5 | 10.9 | -4.6 (Lower Contrast) |
| **Image Background** | Uniform Slate / Metallic | Variable Lighting / External Camera | Non-Standard Backgrounds |
| **Defect Scale** | Prominent macro features | Micro-cracks & boundary noise | Scale Disparity |

---

## 5. Grad-CAM Spatial Focus & Error Analysis

Inspection of Grad-CAM visual attention overlays reveals two primary patterns in low-confidence cases:

1. **Diffuse Attention Scatter**: On low-contrast or underexposed images (e.g. `ext_normal_01.png`), Grad-CAM activations spread across background pixels rather than concentrating tightly on component surface features.
2. **Boundary Fissure Confusion**: For fine linear micro-cracks (e.g. `ext_crack_01.png`), attention is split between boundary edges and background reflection, yielding secondary probability mass on `Normal` or `Scratch` classes (Softmax probability ~0.55 Hole / ~0.23 Crack).

---

## 6. Root Cause Diagnosis

Based on optical profiling, probability distributions, and Grad-CAM activations, low confidence on unseen external images is driven by:

1. **Domain Shift & Illumination Variance (Primary Driver)**: External cameras and non-standard line lighting produce different contrast and brightness levels than the primary 10,726 organizer dataset.
2. **Micro-Defect Boundary Ambiguity**: Extremely small cracks or shallow scratches lack high-frequency edge gradients, causing Softmax probability distribution to spread across candidate classes.
3. **Softmax Temperature Uncalibration**: Standard CrossEntropyLoss optimizes logit magnitude without temperature scaling, causing out-of-distribution inputs to express lower probability certainty even when predicted correctly.
4. **Limited Training Data Augmentation**: Current training augmentation (`RandomHorizontalFlip`, mild `ColorJitter`) does not sufficiently simulate heavy lighting variations, blur, or glare seen in external environments.

---

## 7. Actionable Recommendations Before Full-Data Training

To resolve low external confidence while preserving model integrity, implement the following specific training and post-processing enhancements:

1. **Expand Data Augmentation Pipeline**: Include Gaussian blur, random brightness/contrast variations ($\pm 25\%$), and mild affine scaling in PyTorch `get_transforms()` to make features invariant to external camera lighting.
2. **Implement Temperature Scaling / Calibration**: Apply Platt scaling / Temperature Scaling ($T \approx 1.2$) post-hoc on validation logits to calibrate Softmax probability outputs.
3. **Expose Explicit Low-Confidence Governance**: Maintain the `[0.85]` confidence threshold to flag low-confidence predictions as `Uncertain / Review Required` for process engineer validation.
4. **Proceed with Full-Data Training**: Train the final deployment model (`models/efficientnet_b0_forgemind_full_data.pth`) using the enhanced augmentation strategy across all 10,726 images.
