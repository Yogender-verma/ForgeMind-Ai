# ForgeMind AI — EfficientNet-B0 Model Training Run Log

**Execution Timestamp**: 2026-09-19 15:29:09 UTC
**Compute Platform**: cpu (Intel/AMD x86_64 CPU)
**PyTorch Version**: 2.12.1+cpu
**Random Seed**: 42
**Total Training Duration**: 938.4 seconds (15.6 minutes)

---

## 1. Hyperparameters & Architecture

- **Backbone Model**: `EfficientNet-B0` (ImageNet-pretrained `EfficientNet_B0_Weights.DEFAULT`)
- **Classification Head**: `Linear(1280, 5)` preceded by `Dropout(p=0.2)`
- **Classes**: `0: Crack, 1: Normal, 2: Hole, 3: Scratch, 4: Rust`
- **Loss Function**: `CrossEntropyLoss` with inverse-frequency class weighting (Rust balancing)
- **Optimizer**: `AdamW(weight_decay=1e-4)`
- **Input Resolution**: 224x224 RGB (ImageNet mean & std normalization)
- **Primary Selection Metric**: Validation Macro F1 Score

## 2. Epoch-by-Epoch Progress

| Epoch | Train Loss | Train Acc | Val Loss | Val Acc | Val Macro F1 | LR | Notes |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | 0.4639 | 90.80% | 0.1816 | 97.82% | 97.72% | 1.0e-03 |  |
| 2 | 0.1678 | 96.22% | 0.1163 | 98.26% | 98.32% | 1.0e-03 | [*] Best Checkpoint Saved |

**Best Model Achieved at Epoch 2 with Validation Macro F1 = 98.32%**

---
