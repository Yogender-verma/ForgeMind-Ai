"""
ForgeMind AI — EfficientNet-B0 Visual Defect Classifier
PyTorch architecture with ImageNet-pretrained weights and 5-class classification head.
"""

import os
import json
from typing import Tuple, Dict, Any, List
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms

CLASS_NAMES = ["Crack", "Normal", "Hole", "Scratch", "Rust"]
CLASS_TO_INDEX = {name.lower(): idx for idx, name in enumerate(CLASS_NAMES)}
INDEX_TO_CLASS = {idx: name for idx, name in enumerate(CLASS_NAMES)}

# Standard ImageNet normalization parameters
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def create_model(
    num_classes: int = 5,
    pretrained: bool = True,
    dropout_rate: float = 0.2,
) -> nn.Module:
    """
    Creates EfficientNet-B0 model with customized 5-class linear classification head.
    """
    weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
    model = models.efficientnet_b0(weights=weights)

    # In EfficientNet-B0, model.classifier is:
    # Sequential(
    #   (0): Dropout(p=0.2, inplace=True)
    #   (1): Linear(in_features=1280, out_features=1000, bias=True)
    # )
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=dropout_rate, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def get_transforms(image_size: int = 224) -> Tuple[transforms.Compose, transforms.Compose]:
    """
    Returns (train_transform, eval_transform).
    Controlled augmentations for training ONLY.
    Deterministic transforms for validation, test, and inference.
    """
    train_transform = transforms.Compose([
        transforms.Resize((image_size + 32, image_size + 32)),
        transforms.RandomCrop((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

    return train_transform, eval_transform


def save_model_artifacts(
    model: nn.Module,
    checkpoint_path: str = "models/efficientnet_b0_forgemind_best.pth",
    config_dir: str = "models",
    training_metrics: Dict[str, Any] = None,
) -> None:
    """
    Saves PyTorch weights, class mapping, model configuration, and normalization config.
    """
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    os.makedirs(config_dir, exist_ok=True)

    # Save model weights
    torch.save(model.state_dict(), checkpoint_path)
    print(f"Model checkpoint saved to: {checkpoint_path}")

    # Save class_names.json
    class_names_path = os.path.join(config_dir, "class_names.json")
    with open(class_names_path, "w", encoding="utf-8") as f:
        json.dump({
            "classes": CLASS_NAMES,
            "class_to_index": CLASS_TO_INDEX,
            "index_to_class": {str(k): v for k, v in INDEX_TO_CLASS.items()},
        }, f, indent=2)

    # Save normalization_config.json
    norm_path = os.path.join(config_dir, "normalization_config.json")
    with open(norm_path, "w", encoding="utf-8") as f:
        json.dump({
            "mean": IMAGENET_MEAN,
            "std": IMAGENET_STD,
            "input_size": [224, 224],
            "color_format": "RGB",
        }, f, indent=2)

    # Save model_config.json
    model_config_path = os.path.join(config_dir, "model_config.json")
    with open(model_config_path, "w", encoding="utf-8") as f:
        json.dump({
            "architecture": "EfficientNet-B0",
            "backbone_weights": "EfficientNet_B0_Weights.DEFAULT",
            "num_classes": 5,
            "classes": CLASS_NAMES,
            "classifier_in_features": 1280,
            "dropout_rate": 0.2,
            "training_metrics": training_metrics or {},
        }, f, indent=2)

    print(f"Model configurations saved in: {config_dir}")


def load_trained_model(
    checkpoint_path: str = "models/efficientnet_b0_forgemind_best.pth",
    device: torch.device = None,
) -> Tuple[nn.Module, Dict[str, Any]]:
    """
    Loads model checkpoint and configuration for production inference.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}. Train model first with train.py.")

    model = create_model(num_classes=5, pretrained=False)
    state_dict = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    config = {
        "classes": CLASS_NAMES,
        "index_to_class": INDEX_TO_CLASS,
        "device": str(device),
    }
    return model, config
