"""
ForgeMind AI — Production Visual Defect Inference Service
Integrates OpenCV quality validation, EfficientNet-B0 inference, and Grad-CAM explanations.
Zero mock/fake predictions.
"""

import os
import io
import json
import base64
from typing import Dict, Any, Union, Optional
import numpy as np
import cv2
from PIL import Image

import torch
import torch.nn.functional as F

from scripts.ml.opencv_quality import analyze_image_quality, ImageQualityStatus
from scripts.ml.model import (
    load_trained_model,
    get_transforms,
    CLASS_NAMES,
    INDEX_TO_CLASS,
)
from scripts.ml.gradcam import GradCAM


EVALUATED_CHECKPOINT = "models/efficientnet_b0_forgemind_best.pth"
FULL_DATA_CHECKPOINT = "models/efficientnet_b0_forgemind_full_data.pth"


class DefectInferenceEngine:
    """
    Production inference engine for ForgeMind AI defect classification.
    Supports selecting between:
    - Full-data deployment model (v1.0.0-full-data)
    - Evaluated benchmark model (v1.0.0-evaluated)
    """

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        model_variant: str = "full_data",
        device_name: Optional[str] = None,
        confidence_threshold: float = 0.85,
    ):
        self.model_variant = model_variant.lower()
        if checkpoint_path is None:
            if self.model_variant == "full_data" and os.path.exists(FULL_DATA_CHECKPOINT):
                self.checkpoint_path = FULL_DATA_CHECKPOINT
            elif os.path.exists(EVALUATED_CHECKPOINT):
                self.checkpoint_path = EVALUATED_CHECKPOINT
            elif os.path.exists(FULL_DATA_CHECKPOINT):
                self.checkpoint_path = FULL_DATA_CHECKPOINT
            else:
                self.checkpoint_path = EVALUATED_CHECKPOINT
        else:
            self.checkpoint_path = checkpoint_path

        self.device = torch.device(device_name or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.confidence_threshold = confidence_threshold

        self.model = None
        self.gradcam = None
        self._load_transform()
        self._load_model()

    def _load_transform(self):
        _, self.eval_transform = get_transforms(image_size=224)

    def _load_model(self):
        """Loads trained PyTorch model weights if available."""
        if not os.path.exists(self.checkpoint_path):
            self.model = None
            self.gradcam = None
            return

        try:
            current_mtime = os.path.getmtime(self.checkpoint_path)
            self.model, _ = load_trained_model(
                checkpoint_path=self.checkpoint_path,
                device=self.device,
            )
            self.gradcam = GradCAM(self.model)
            self._last_loaded_mtime = current_mtime
            print(f"DefectInferenceEngine: Loaded checkpoint from {self.checkpoint_path} on {self.device}")
        except Exception as e:
            print(f"DefectInferenceEngine: Error loading model checkpoint: {e}")
            self.model = None
            self.gradcam = None

    def is_available(self) -> bool:
        """Returns True only if real trained model is loaded in memory."""
        if os.path.exists(self.checkpoint_path):
            current_mtime = os.path.getmtime(self.checkpoint_path)
            if self.model is None or current_mtime > getattr(self, "_last_loaded_mtime", 0):
                self._load_model()
        return self.model is not None

    def classify_image(
        self,
        image_input: Union[str, bytes, np.ndarray, Image.Image],
        include_gradcam: bool = True,
        threshold_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end classification pipeline:
        OpenCV Quality Gate -> Preprocessing -> EfficientNet-B0 -> Probabilities -> Grad-CAM
        """
        threshold = threshold_override if threshold_override is not None else self.confidence_threshold

        # Step 1: Normalize input to (PIL.Image, np.ndarray BGR, np.ndarray RGB)
        pil_img = None
        rgb_arr = None

        if isinstance(image_input, Image.Image):
            pil_img = image_input.convert("RGB")
            rgb_arr = np.array(pil_img)
        elif isinstance(image_input, str):
            if not os.path.exists(image_input):
                return {
                    "error": f"Image file not found: {image_input}",
                    "is_valid": False,
                }
            pil_img = Image.open(image_input).convert("RGB")
            rgb_arr = np.array(pil_img)
        elif isinstance(image_input, bytes):
            nparr = np.frombuffer(image_input, np.uint8)
            bgr_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if bgr_cv is None:
                return {
                    "error": "Failed to decode image from byte buffer.",
                    "is_valid": False,
                }
            rgb_arr = cv2.cvtColor(bgr_cv, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_arr)
        elif isinstance(image_input, np.ndarray):
            if len(image_input.shape) == 2:
                rgb_arr = cv2.cvtColor(image_input, cv2.COLOR_GRAY2RGB)
            elif image_input.shape[2] == 3:
                # Assume RGB
                rgb_arr = image_input
            pil_img = Image.fromarray(rgb_arr)
        else:
            return {
                "error": f"Unsupported image input type: {type(image_input)}",
                "is_valid": False,
            }

        # Step 2: OpenCV Quality Validation
        quality_res = analyze_image_quality(rgb_arr)

        if quality_res["status"] == ImageQualityStatus.CORRUPTED:
            return {
                "is_valid": False,
                "error": f"Corrupted or invalid image: {quality_res['reason']}",
                "quality": quality_res,
            }

        # Step 3: Check Model Availability (Strictly No Fake AI)
        if not self.is_available():
            self._load_model()
            if not self.is_available():
                return {
                    "error": "AI model unavailable. Please load/train the EfficientNet-B0 model.",
                    "is_valid": True,
                    "model_available": False,
                    "quality": quality_res,
                }

        # Step 4: Preprocessing for EfficientNet-B0 (224x224 RGB, Normalized)
        tensor_img = self.eval_transform(pil_img).unsqueeze(0).to(self.device)

        # Step 5: Forward pass
        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor_img)
            probs = F.softmax(logits, dim=1).cpu().numpy()[0]

        pred_idx = int(np.argmax(probs))
        top1_class_raw = CLASS_NAMES[pred_idx]
        confidence = float(probs[pred_idx])

        # Step 6: Probabilities Breakdown for all 5 classes
        all_probabilities = {
            c_name: round(float(probs[i]), 4)
            for i, c_name in enumerate(CLASS_NAMES)
        }

        # Step 7: Margin and Softmax Entropy calculation
        sorted_probs = np.sort(probs)
        margin = float(sorted_probs[-1] - sorted_probs[-2])
        # Normalized Shannon entropy: H / ln(K)
        k_classes = len(CLASS_NAMES)
        entropy = float(-np.sum(probs * np.log(probs + 1e-12)))
        normalized_entropy = float(entropy / np.log(k_classes))
        normalized_entropy = max(0.0, min(1.0, normalized_entropy))

        # Step 8: Uncertainty & Novel Defect Detection
        is_uncertain = (confidence < threshold) or (margin < 0.15) or (normalized_entropy > 0.6)

        if is_uncertain:
            pred_class = "Uncertain / Novel"
            is_low_confidence = True
            report_text = "needs human review, possible novel defect"
        else:
            pred_class = top1_class_raw
            is_low_confidence = False
            report_text = f"Model classified specimen as {pred_class} with confidence {confidence * 100:.1f}%."

        # Step 9: Grad-CAM Attention Heatmap (using raw top-1 class index for feature attribution)
        gradcam_data = None
        if include_gradcam and self.gradcam is not None:
            try:
                grad_tensor = tensor_img.clone().detach().requires_grad_(True)
                cam_res = self.gradcam.generate_base64_overlay(
                    original_image_rgb=rgb_arr,
                    input_tensor=grad_tensor,
                    target_class=pred_idx,
                )
                gradcam_data = {
                    "overlay_base64": cam_res["overlay_base64"],
                    "heatmap_base64": cam_res["heatmap_base64"],
                    "description": "Grad-CAM model visual attention heatmap indicating primary contributing features.",
                }
            except Exception as e:
                print(f"Grad-CAM generation notice: {e}")

        is_full_data = "full_data" in self.checkpoint_path.lower()
        model_title = (
            "ForgeMind EfficientNet-B0 — Full Data Deployment Model"
            if is_full_data
            else "ForgeMind EfficientNet-B0 — Evaluated Model"
        )
        model_ver = "v1.0.0-full-data" if is_full_data else "v1.0.0-evaluated"

        # Step 10: Assembly of final production payload
        return {
            "prediction": pred_class,
            "top1_class_raw": top1_class_raw,
            "confidence": round(confidence, 4),
            "margin": round(margin, 4),
            "normalized_entropy": round(normalized_entropy, 4),
            "entropy": round(entropy, 4),
            "probabilities": all_probabilities,
            "is_low_confidence": is_low_confidence,
            "confidence_threshold": threshold,
            "is_defective": pred_class != "Normal",
            "report": report_text,
            "quality": quality_res,
            "gradcam": gradcam_data,
            "model": model_title,
            "model_version": model_ver,
            "checkpoint_path": self.checkpoint_path,
            "num_classes": 5,
        }


# Engines cache for FastAPI backend
_ENGINE_CACHE: Dict[str, DefectInferenceEngine] = {}


def get_inference_engine(model_variant: str = "full_data") -> DefectInferenceEngine:
    variant_key = model_variant.lower()
    if variant_key not in ["full_data", "evaluated", "best"]:
        variant_key = "full_data"
    
    if variant_key not in _ENGINE_CACHE or not _ENGINE_CACHE[variant_key].is_available():
        _ENGINE_CACHE[variant_key] = DefectInferenceEngine(model_variant=variant_key)
    return _ENGINE_CACHE[variant_key]

