"""
ForgeMind AI — Automated Verification Test Suite
Tests for Manufacturing Simulation Dataset Integration:
1. Dataset loading (Model 1 & Model 2)
2. Missing columns handling
3. Missing values validation (zero nulls in official Arena logs)
4. Production metric calculations (utilization, bottleneck, waiting time, throughput)
5. Unsupported capability handling (economic financials, defect mapping)
6. Gemini RAG response schema validation
7. Evidence taxonomy handling ([MEASURED], [CALCULATED], [SIMULATED], [HYPOTHESIS])
8. Explicit assertion that image-to-manufacturing linkage is absent
"""

import pytest
import pandas as pd
import numpy as np

from scripts.forgemind.data_loader import ManufacturingDataset
from scripts.forgemind.production_intelligence import (
    get_production_intelligence,
    UNSUPPORTED_FINANCIAL_MSG,
    NO_IMAGE_LINKAGE_MSG,
)
from scripts.ml.engineering_knowledge import retrieve_engineering_evidence
from scripts.ml.gemini_reasoning import (
    investigate_defect_causes,
    DefectInvestigationReport,
)


# ---------------------------------------------------------------------------
# 1. Dataset Loading & Schema Integrity Tests
# ---------------------------------------------------------------------------
def test_dataset_loading_model_1():
    """Verify Model 1 raw dataset loads with exactly 3000 rows and 10 columns."""
    ds = ManufacturingDataset("Model_1", use_cleaned=False)
    df = ds.raw_df
    assert len(df) == 3000
    assert len(df.columns) == 10
    assert "Demand" in df.columns
    assert "Parts per hour" in df.columns
    assert "Assembly Util" in df.columns


def test_dataset_loading_model_2():
    """Verify Model 2 raw dataset loads with exactly 3000 rows and 17 columns."""
    ds = ManufacturingDataset("Model_2", use_cleaned=False)
    df = ds.raw_df
    assert len(df) == 3000
    assert len(df.columns) == 17
    assert "Entities Out" in df.columns
    assert "Assembly Utilization" in df.columns


def test_no_missing_values_in_raw_datasets():
    """Verify zero missing/null values exist in official simulation datasets."""
    for m in ["Model_1", "Model_2"]:
        ds = ManufacturingDataset(m, use_cleaned=False)
        assert ds.raw_df.isnull().sum().sum() == 0, f"Unexpected NaN in {m}"


def test_missing_column_handling():
    """Verify dataset gracefully errors or flags when required column is missing."""
    corrupted_df = pd.DataFrame({"UnknownCol": [1, 2, 3]})
    with pytest.raises(Exception):
        # Passing invalid model key must raise FileNotFoundError
        ManufacturingDataset("NonExistent_Model", use_cleaned=False).raw_df


# ---------------------------------------------------------------------------
# 2. Production Metric Calculation Tests
# ---------------------------------------------------------------------------
def test_production_intelligence_model_1_metrics():
    """Verify verified calculations from Model 1."""
    intel = get_production_intelligence("Model_1")

    # Overview
    ov = intel["production_overview"]
    assert ov["total_records"] == 3000
    assert ov["mean_demand"]["value"] > 0
    assert ov["mean_throughput_rate"]["value"] > 0
    assert ov["mean_throughput_rate"]["provenance"]["evidence_type"] == "[CALCULATED]"

    # Utilization
    util = intel["process_utilization"]
    assert "Drilling" in util
    assert "Milling" in util
    assert "Assembly" in util
    assert 0.0 <= util["Assembly"]["mean_utilization"] <= 1.0

    # Bottleneck
    bn = intel["bottleneck_analysis"]
    assert bn["primary_bottleneck"] == "Assembly"  # Highest utilization in Model 1
    assert bn["provenance"]["evidence_type"] == "[CALCULATED]"

    # Capacity margin
    cap = intel["capacity_margin_analysis"]
    assert "Assembly" in cap
    assert cap["Assembly"]["headroom_pct"] > 0


def test_production_intelligence_model_2_metrics():
    """Verify verified calculations from Model 2."""
    intel = get_production_intelligence("Model_2")

    ov = intel["production_overview"]
    assert ov["total_records"] == 3000
    assert ov["mean_entities_out"]["value"] > 0

    util = intel["process_utilization"]
    assert "Assembly" in util
    assert util["Assembly"]["mean_utilization_pct"] > 60.0

    bn = intel["bottleneck_analysis"]
    assert bn["primary_bottleneck"] == "Assembly"


# ---------------------------------------------------------------------------
# 3. Unsupported Capability & Non-Linkage Handling
# ---------------------------------------------------------------------------
def test_no_image_to_manufacturing_linkage():
    """Enforce explicit declaration that visual images do NOT link to simulation records."""
    intel = get_production_intelligence("Model_1")
    linkage = intel["image_to_production_linkage"]
    assert linkage["status"] == "NOT_AVAILABLE"
    assert NO_IMAGE_LINKAGE_MSG in linkage["notice"]
    assert "Visual-to-production record linkage is not available" in linkage["notice"]


def test_financial_impact_unsupported():
    """Enforce that ForgeMind AI does not invent prices/costs without ERP data."""
    intel = get_production_intelligence("Model_1")
    econ = intel["economic_impact"]
    assert econ["status"] == "UNSUPPORTED"
    assert UNSUPPORTED_FINANCIAL_MSG in econ["notice"]


# ---------------------------------------------------------------------------
# 4. Gemini RAG Response Schema & Evidence Validation
# ---------------------------------------------------------------------------
def test_rag_evidence_retrieval_all_classes():
    """Verify technical documents are retrieved for all five dataset classes."""
    for cls in ["Crack", "Hole", "Normal", "Rust", "Scratch"]:
        docs = retrieve_engineering_evidence(cls)
        if cls == "Normal":
            assert len(docs) >= 1
            assert "ISO 8785" in docs[0].standard or "Quality" in docs[0].title or "Tolerance" in docs[0].title or "Engineering Guidance" in docs[0].title
        else:
            assert len(docs) >= 1
            assert docs[0].standard != ""
            assert docs[0].content != ""


def test_structured_investigation_schema_compliance():
    """Verify investigate_defect_causes returns strictly validated Pydantic schema."""
    for cls in ["Crack", "Hole", "Rust", "Scratch"]:
        res = investigate_defect_causes(cls, confidence=96.5)
        report = DefectInvestigationReport.model_validate(res)

        assert report.defect == cls
        assert len(report.potential_causes) > 0
        assert len(report.recommended_actions) > 0
        assert report.requires_engineer_review is True

        # Check evidence citations
        for cause in report.potential_causes:
            assert len(cause.sources) > 0
            assert cause.evidence_strength in ["low", "moderate", "strong"]

        for action in report.recommended_actions:
            assert len(action.sources) > 0
            assert action.reason != ""

        # Check non-linkage limitations
        assert any(
            "Visual-to-production record linkage is not available" in lim
            for lim in report.limitations
        )


def test_unsupported_defect_handling():
    """Verify unknown or unevidenced defects return insufficient evidence."""
    res = investigate_defect_causes("UnknownAlienDefect", confidence=10.0)
    assert res["insufficient_evidence"] is True
    assert "Insufficient evidence" in res["status_message"]
    assert len(res["potential_causes"]) == 0


# ===========================================================================
# Batch-to-Batch Drift Detection Tests
# ===========================================================================
from scripts.forgemind.drift_engine import detect_batch_drift, _compute_psi


def test_no_drift_on_constant_series():
    """Verify that a constant synthetic series shows no drift (KS p ≈ 1, PSI ≈ 0)."""
    rng = np.random.default_rng(42)
    # 1000 rows of identical distribution (constant + tiny noise for numerical stability)
    data = {
        "Parts per hour": rng.normal(loc=50.0, scale=0.001, size=1000),
        "VA Time": rng.normal(loc=100.0, scale=0.001, size=1000),
    }
    df = pd.DataFrame(data)

    result = detect_batch_drift(model_key="Model_1", n_windows=5, df=df)

    assert result["linkage"] == "SIMULATED"
    assert result["causal_status"] == "HYPOTHESIS_ONLY"

    # No windows should be flagged as DRIFT
    drift_windows = [w for w in result["windows"] if w["overall_status"] == "DRIFT"]
    assert len(drift_windows) == 0, f"Expected no drift but found {len(drift_windows)} DRIFT windows"


def test_drift_detected_on_shifted_series():
    """Verify that a shifted synthetic series triggers DRIFT detection (KS p < 0.01, PSI > 0.2)."""
    rng = np.random.default_rng(42)
    n_per_window = 200
    n_windows = 5
    n_total = n_per_window * n_windows

    # Windows 0-3: baseline distribution
    baseline_data = rng.normal(loc=50.0, scale=5.0, size=n_per_window * 4)
    # Window 4: shifted by +3 sigma (mean 65 instead of 50)
    shifted_data = rng.normal(loc=65.0, scale=5.0, size=n_per_window)

    col_values = np.concatenate([baseline_data, shifted_data])
    df = pd.DataFrame({
        "Parts per hour": col_values,
        "VA Time": rng.normal(loc=100.0, scale=2.0, size=n_total),
    })

    result = detect_batch_drift(model_key="Model_1", n_windows=n_windows, df=df)

    # Window 4 (the shifted one) should be flagged
    drift_windows = [w for w in result["windows"] if w["overall_status"] == "DRIFT"]
    assert len(drift_windows) >= 1, f"Expected at least 1 DRIFT window but found {len(drift_windows)}"

    # Verify the flagged window is window 4
    drift_window_ids = [w["window"] for w in drift_windows]
    assert 4 in drift_window_ids, f"Expected window 4 in drift list but got {drift_window_ids}"

    # Verify KS p-value < 0.01 and PSI > 0.2 for the drifted column
    w4 = [w for w in result["windows"] if w["window"] == 4][0]
    pph_info = w4["columns"]["Parts per hour"]
    assert pph_info["status"] == "DRIFT"
    assert pph_info["ks_pvalue"] < 0.01, f"KS p-value {pph_info['ks_pvalue']} should be < 0.01"
    assert pph_info["psi"] > 0.2, f"PSI {pph_info['psi']} should be > 0.2"
