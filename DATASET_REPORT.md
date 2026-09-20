# ForgeMind AI — Dataset Inspection & Quality Report

**Dataset Provenance**: Organizer Manufacturing Image Dataset (Visual Defect Classification)

**Audit Status**: Verified across 5 target defect categories.


---

## 1. Class Distribution

| Class | Category Index | File Count | Percentage | Class Balance Status |
| :--- | :---: | :---: | :---: | :--- |
| **Crack** | `0` | 2,400 | 22.4% | Balanced |
| **Normal** | `1` | 2,400 | 22.4% | Balanced |
| **Hole** | `2` | 2,400 | 22.4% | Balanced |
| **Scratch** | `3` | 2,400 | 22.4% | Balanced |
| **Rust** | `4` | 1,126 | 10.5% | Imbalanced (~10.5% - Class Weighted Loss applied) |
| **Total** | — | **10,726** | **100.0%** | **Audit Complete** |


## 2. Image Physical Specifications

| Attribute | Distribution / Values | Industrial Specification |
| :--- | :--- | :--- |
| **File Formats** | .png: 10,726 | Standard Lossless PNG |
| **Dimensions** | 256x256: 10,726 | Preprocessed to 224x224 for EfficientNet-B0 |
| **Color Channels** | 3 channels: 10,726 | Standard 3-Channel RGB |
| **Aspect Ratio** | 1.0: 10,726 | 1.0 (Square Specimen) |


## 3. OpenCV Quality Verification

- **VALID Images**: 3,959 (36.9%)
- **LOW_QUALITY Images**: 6,767 (63.1%)
- **CORRUPTED / Unreadable**: 0 (0.0%)
- **Empty Directories**: 0 detected.
- **Unexpected Files**: 0 detected.


## 4. Duplicate & Data-Leakage Audit

- **Exact Hash Duplicates**: 0 clusters (0 duplicate files).
- **Near-Duplicate Clusters (dHash)**: 180 potential clusters.
- **Leakage Protection Protocol**: Every duplicate and near-duplicate cluster is bound to the same split partition during dataset preparation so that no image or near-replica crosses between Training, Validation, or Test sets.


## 5. Stratified 70 / 15 / 15 Partition Plan

- **Training Set (70%)**: ~7,508 images
- **Validation Set (15%)**: ~1,609 images
- **Held-Out Test Set (15%)**: ~1,609 images
- **Random Seed**: `SEED = 42` (Deterministic, reproducible)
