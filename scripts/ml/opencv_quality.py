"""
ForgeMind AI — OpenCV Image Quality & Preprocessing Layer
Evaluates physical image validity and quality indicators without defect classification.
"""

import os
from typing import Union, Dict, Any, Tuple
import cv2
import numpy as np


class ImageQualityStatus:
    VALID = "VALID"
    LOW_QUALITY = "LOW_QUALITY"
    CORRUPTED = "CORRUPTED"


def analyze_image_quality(
    image_input: Union[str, bytes, np.ndarray],
    blur_threshold: float = 80.0,
    dark_threshold: float = 30.0,
    bright_threshold: float = 230.0,
    min_dimension: int = 128,
) -> Dict[str, Any]:
    """
    Evaluates image validity, dimensions, blur, illumination, and quality indicators.
    Does NOT classify defects.
    """
    img: np.ndarray = None

    # Load from path, bytes, or existing array
    if isinstance(image_input, str):
        if not os.path.exists(image_input) or os.path.getsize(image_input) == 0:
            return {
                "status": ImageQualityStatus.CORRUPTED,
                "is_valid": False,
                "reason": "File does not exist or has 0 bytes",
                "issues": ["File missing or empty"],
                "width": 0,
                "height": 0,
                "channels": 0,
                "aspect_ratio": 0.0,
                "blur_score": 0.0,
                "mean_brightness": 0.0,
            }
        try:
            img = cv2.imread(image_input, cv2.IMREAD_COLOR)
        except Exception as e:
            return {
                "status": ImageQualityStatus.CORRUPTED,
                "is_valid": False,
                "reason": f"OpenCV read error: {str(e)}",
                "issues": ["Unreadable file format"],
                "width": 0,
                "height": 0,
                "channels": 0,
                "aspect_ratio": 0.0,
                "blur_score": 0.0,
                "mean_brightness": 0.0,
            }
    elif isinstance(image_input, bytes):
        try:
            nparr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            return {
                "status": ImageQualityStatus.CORRUPTED,
                "is_valid": False,
                "reason": f"Buffer decode error: {str(e)}",
                "issues": ["Corrupted image buffer"],
                "width": 0,
                "height": 0,
                "channels": 0,
                "aspect_ratio": 0.0,
                "blur_score": 0.0,
                "mean_brightness": 0.0,
            }
    elif isinstance(image_input, np.ndarray):
        img = image_input
    else:
        return {
            "status": ImageQualityStatus.CORRUPTED,
            "is_valid": False,
            "reason": f"Unsupported input type: {type(image_input)}",
            "issues": ["Invalid input type"],
            "width": 0,
            "height": 0,
            "channels": 0,
            "aspect_ratio": 0.0,
            "blur_score": 0.0,
            "mean_brightness": 0.0,
        }

    # Check unreadable/empty decode
    if img is None or img.size == 0:
        return {
            "status": ImageQualityStatus.CORRUPTED,
            "is_valid": False,
            "reason": "Image decoded to empty/None array",
            "issues": ["Corrupted or invalid image headers"],
            "width": 0,
            "height": 0,
            "channels": 0,
            "aspect_ratio": 0.0,
            "blur_score": 0.0,
            "mean_brightness": 0.0,
        }

    # Dimensions & Channels
    height, width = img.shape[:2]
    channels = img.shape[2] if len(img.shape) == 3 else 1
    aspect_ratio = round(float(width) / float(height), 3) if height > 0 else 0.0

    issues = []

    # Resolution check
    if height < min_dimension or width < min_dimension:
        issues.append(f"Low resolution ({width}x{height} < {min_dimension}px)")

    # Grayscale conversion for photometric and frequency analysis
    if channels == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img

    # Blur estimation: variance of Laplacian
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if laplacian_var < blur_threshold:
        issues.append(f"Potential excessive blur (Laplacian variance {laplacian_var:.1f} < {blur_threshold})")

    # Illumination estimation: mean pixel brightness [0..255]
    mean_brightness = float(np.mean(gray))
    if mean_brightness < dark_threshold:
        issues.append(f"Extremely dark/underexposed (Mean brightness {mean_brightness:.1f} < {dark_threshold})")
    elif mean_brightness > bright_threshold:
        issues.append(f"Extremely bright/overexposed (Mean brightness {mean_brightness:.1f} > {bright_threshold})")

    # Determine status
    if len(issues) == 0:
        status = ImageQualityStatus.VALID
    else:
        status = ImageQualityStatus.LOW_QUALITY

    return {
        "status": status,
        "is_valid": True,
        "reason": None if status == ImageQualityStatus.VALID else "; ".join(issues),
        "issues": issues,
        "width": int(width),
        "height": int(height),
        "channels": int(channels),
        "aspect_ratio": aspect_ratio,
        "blur_score": round(laplacian_var, 2),
        "mean_brightness": round(mean_brightness, 2),
    }
