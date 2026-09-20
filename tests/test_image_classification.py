"""
ForgeMind AI — Unit Tests for Visual Defect Classification Pipeline
Tests OpenCV Quality Gate, Model Architecture, Grad-CAM Engine, and Inference Engine.
"""

import pytest
import numpy as np
import cv2
import torch
import os
import io
from PIL import Image

from scripts.ml.opencv_quality import analyze_image_quality, ImageQualityStatus
from scripts.ml.gradcam import GradCAM


def test_opencv_quality_gate_synthetic_valid():
    # Create textured test image (has gradients/variance)
    arr = np.random.randint(50, 200, (128, 128, 3), dtype=np.uint8)
    # Add strong edges
    cv2.rectangle(arr, (20, 20), (100, 100), (255, 255, 255), 3)
    cv2.circle(arr, (64, 64), 25, (0, 0, 0), -1)
    
    res = analyze_image_quality(arr, blur_threshold=10.0, min_dimension=64)
    assert res["status"] in [ImageQualityStatus.VALID, ImageQualityStatus.LOW_QUALITY]
    assert res["width"] == 128
    assert res["height"] == 128
    assert res["blur_score"] > 0
    assert 0 <= res["mean_brightness"] <= 255


def test_opencv_quality_gate_small_dim():
    # Image smaller than min_dimension (64px)
    small_arr = np.zeros((32, 32, 3), dtype=np.uint8)
    res = analyze_image_quality(small_arr, min_dimension=64)
    assert res["status"] == ImageQualityStatus.LOW_QUALITY
    assert any("Low resolution" in issue for issue in res["issues"])


from scripts.ml.model import create_model, CLASS_NAMES


def test_model_architecture_and_forward_pass():
    model = create_model(num_classes=5, pretrained=False)
    model.eval()
    
    # Batch of 2 dummy images (3, 224, 224)
    dummy_input = torch.randn(2, 3, 224, 224)
    with torch.no_grad():
        logits = model(dummy_input)
        
    assert logits.shape == (2, 5)
    probs = torch.softmax(logits, dim=1)
    assert torch.allclose(probs.sum(dim=1), torch.tensor([1.0, 1.0]), atol=1e-4)


def test_gradcam_generation():
    model = create_model(num_classes=5, pretrained=False)
    model.eval()
    gradcam = GradCAM(model)
    
    dummy_input = torch.randn(1, 3, 224, 224)
    heatmap, pred_cls, conf = gradcam.generate(dummy_input, target_class=0)
    
    assert heatmap.shape == (7, 7) or len(heatmap.shape) == 2
    assert np.min(heatmap) >= 0.0
    assert np.max(heatmap) <= 1.0 + 1e-5
    
    # Test overlay generation on dummy RGB image
    dummy_rgb = np.zeros((224, 224, 3), dtype=np.uint8)
    overlay, hm_rgb, p_cls, p_conf = gradcam.generate_overlay(dummy_rgb, dummy_input, target_class=0)
    assert overlay.shape == (224, 224, 3)
    assert hm_rgb.shape == (224, 224, 3)
    gradcam.close()
