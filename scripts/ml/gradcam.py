"""
ForgeMind AI — Pure PyTorch Grad-CAM Attention Heatmap Engine
Visualizes model attention for visual defect explanations without external dependencies.
"""

import base64
import io
from typing import Tuple, Optional, Dict, Any
import numpy as np
import cv2
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F


class GradCAM:
    """
    Computes Gradient-weighted Class Activation Mapping (Grad-CAM)
    on the final convolutional feature layer of EfficientNet-B0.
    """

    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()

        # In EfficientNet-B0, model.features[-1] is the final 1x1 conv block (1280 channels)
        if target_layer is None:
            self.target_layer = self.model.features[-1]
        else:
            self.target_layer = target_layer

        self.activations = None
        self.gradients = None

        # Register forward and backward hooks
        self.forward_handle = self.target_layer.register_forward_hook(self._save_activation)
        self.backward_handle = self.target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(
        self,
        input_tensor: torch.Tensor,
        target_class: Optional[int] = None,
    ) -> Tuple[np.ndarray, int, float]:
        """
        Generates 2D normalized Grad-CAM activation heatmap [0..1].
        """
        self.model.zero_grad()

        # Forward pass
        logits = self.model(input_tensor)
        probs = F.softmax(logits, dim=1)

        if target_class is None:
            target_class = int(torch.argmax(logits, dim=1).item())

        score = logits[0, target_class]
        confidence = float(probs[0, target_class].item())

        # Backward pass for target class score
        score.backward(retain_graph=True)

        # Global average pooling on gradients: [B, C, H, W] -> [C]
        gradients = self.gradients[0]  # [C, H, W]
        activations = self.activations[0]  # [C, H, W]

        weights = torch.mean(gradients, dim=(1, 2), keepdim=True)  # [C, 1, 1]

        # Weighted combination of activation maps
        cam = torch.sum(weights * activations, dim=0)  # [H, W]
        cam = F.relu(cam)  # Apply ReLU to keep features that positively contribute

        # Normalize to [0, 1]
        cam = cam.cpu().numpy()
        cam_min, cam_max = np.min(cam), np.max(cam)
        if cam_max - cam_min > 1e-8:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        return cam, target_class, confidence

    def generate_overlay(
        self,
        original_image_rgb: np.ndarray,
        input_tensor: torch.Tensor,
        target_class: Optional[int] = None,
        alpha: float = 0.45,
    ) -> Tuple[np.ndarray, np.ndarray, int, float]:
        """
        Generates resized heatmap and combined RGB overlay.
        Returns: (overlay_rgb, heatmap_rgb, target_class, confidence)
        """
        cam, pred_class, confidence = self.generate(input_tensor, target_class)

        orig_h, orig_w = original_image_rgb.shape[:2]

        # Resize heatmap to match original image dimensions
        resized_cam = cv2.resize(cam, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        uint8_cam = np.uint8(255 * resized_cam)

        # Apply JET colormap
        heatmap_bgr = cv2.applyColorMap(uint8_cam, cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

        # Create blended overlay
        overlay_rgb = cv2.addWeighted(original_image_rgb, 1.0 - alpha, heatmap_rgb, alpha, 0)

        return overlay_rgb, heatmap_rgb, pred_class, confidence

    def generate_base64_overlay(
        self,
        original_image_rgb: np.ndarray,
        input_tensor: torch.Tensor,
        target_class: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Produces base64 encoded data URI strings for overlay and heatmap.
        """
        overlay_rgb, heatmap_rgb, pred_class, conf = self.generate_overlay(
            original_image_rgb, input_tensor, target_class
        )

        def to_base64(img_rgb: np.ndarray) -> str:
            pil_img = Image.fromarray(img_rgb)
            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=90)
            return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "overlay_base64": to_base64(overlay_rgb),
            "heatmap_base64": to_base64(heatmap_rgb),
            "target_class": pred_class,
            "confidence": round(conf, 4),
        }

    def close(self):
        """Removes hook handles to prevent memory leaks."""
        self.forward_handle.remove()
        self.backward_handle.remove()
