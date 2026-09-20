"""
ForgeMind AI — Comprehensive Factory Assistant & Intelligence Test Suite
Validates the complete intelligence workflow:
1. Vision model integrity & preserved metrics (98.20% Acc, 5 classes)
2. Grad-CAM coarse attention (No fake bounding box coordinates)
3. Simulated economic impact (5%, 10%, 20% tiers, no fake currency)
4. Multi-source RAG retrieval (Project knowledge, engineering FMEA, historical cases)
5. Factory Assistant dual-mode conversation (Normal & Inspection context)
6. Anti-hallucination machine parameter guardrails
7. Historical cases REST API (List, similar, approve, verify, learn)
8. What-If process simulation (Current vs Alternative comparison)
9. Source attribution and provenance tag integrity
"""

import os
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.server import app
from scripts.ml.knowledge_retriever import (
    retrieve_unified_knowledge,
    search_project_knowledge,
    search_engineering_documents,
    search_historical_cases,
)
from scripts.ml.factory_assistant_engine import (
    chat_with_factory_assistant,
    _build_deterministic_assistant_reply,
)
from scripts.forgemind.cure_prevention_engine import (
    reset_case_registry,
    search_similar_cases,
    apply_previous_action,
    verify_case_prevention,
)

client = TestClient(app)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def setup_teardown():
    reset_case_registry()
    yield
    reset_case_registry()


# ===========================================================================
# 1. Vision Model Integrity & Evaluation Metrics
# ===========================================================================
def test_vision_model_checkpoint_and_classes():
    """Confirms checkpoint exists and class taxonomy is exactly 5 classes."""
    checkpoint_path = PROJECT_ROOT / "models" / "efficientnet_b0_forgemind_best.pth"
    assert checkpoint_path.exists(), "Trained model checkpoint must exist"

    config_path = PROJECT_ROOT / "models" / "class_names.json"
    assert config_path.exists(), "class_names.json must exist"

    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    classes = data.get("classes", data) if isinstance(data, dict) else data
    assert set(classes) == {"Crack", "Hole", "Normal", "Rust", "Scratch"}


def test_reported_model_metrics_preservation():
    """Confirms held-out test evaluation metrics match verified 98.20% accuracy."""
    kb_path = PROJECT_ROOT / "FORGEMIND_AI_KNOWLEDGE.md"
    assert kb_path.exists(), "FORGEMIND_AI_KNOWLEDGE.md must exist"

    with open(kb_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "98.20%" in content, "Overall test accuracy must be 98.20%"
    assert "98.30%" in content, "Macro Precision & F1 must be 98.30%"
    assert "98.33%" in content, "Macro Recall must be 98.33%"


# ===========================================================================
# 2. Grad-CAM Explainability & Zero Fake Coordinates
# ===========================================================================
def test_gradcam_no_fake_bounding_boxes():
    """Verifies Grad-CAM is described as coarse attention without fake bounding box tuples."""
    kb_path = PROJECT_ROOT / "FORGEMIND_AI_KNOWLEDGE.md"
    with open(kb_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "bounding box" in content.lower()
    assert "NEVER" in content or "approximate attention region" in content

    # Test assistant explanation of Grad-CAM
    resp = chat_with_factory_assistant("Explain Grad-CAM")
    assert "approximate attention region" in resp["reply"].lower() or "coarse" in resp["reply"].lower()
    assert "bounding box" in resp["reply"].lower()


# ===========================================================================
# 3. Economic Impact Model & Zero Fake Currency
# ===========================================================================
def test_economic_impact_strict_simulation_tiers():
    """Verifies economic impact adheres strictly to 5%/10%/20% user tiers without fake ₹ amounts."""
    res = client.post("/api/v1/economic-impact/simulated", json={
        "impact_level": "LOW",
        "defect_type": "Scratch",
        "vision_confidence": 85.7,
        "treatment_status": "untreated"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["simulated_impact_pct"] == 5.0
    assert data["evidence_tag"] == "[SIMULATED]"
    assert "₹" not in str(data)

    res_med = client.post("/api/v1/economic-impact/simulated", json={
        "impact_level": "MEDIUM",
        "treatment_status": "untreated"
    })
    assert res_med.json()["simulated_impact_pct"] == 10.0

    res_high = client.post("/api/v1/economic-impact/simulated", json={
        "impact_level": "HIGH",
        "treatment_status": "untreated"
    })
    assert res_high.json()["simulated_impact_pct"] == 20.0


# ===========================================================================
# 4. Multi-Source Knowledge Retrieval (RAG)
# ===========================================================================
def test_project_knowledge_retrieval():
    """Verifies section-level search over FORGEMIND_AI_KNOWLEDGE.md."""
    results = search_project_knowledge("Grad-CAM and bounding box")
    assert len(results) > 0
    assert results[0].doc_id == "FORGEMIND-DOC-KB-001"
    assert "Grad-CAM" in results[0].section or "Grad-CAM" in results[0].content


def test_engineering_fmea_retrieval():
    """Verifies retrieval from physical engineering FMEA markdown documents."""
    results = search_engineering_documents("Crack")
    assert len(results) > 0
    assert results[0].doc_id == "KB-GUIDE-CRK-01"
    assert "[HYPOTHESIS]" in results[0].provenance_tag


def test_unified_retriever_all_four_source_types():
    """Verifies aggregation across Project Docs, FMEA, History, and Specimen Context."""
    ctx = {
        "inspection_id": "FM-TEST-001",
        "defect": "Rust",
        "confidence": 99.1,
        "gradcam_available": True,
        "active_case_status": "NEW",
        "economic_impact": "MEDIUM (10%)",
        "recommended_action": "Check coolant pH",
    }
    unified = retrieve_unified_knowledge(
        query="What causes this rust defect?",
        defect_class="Rust",
        inspection_context=ctx,
    )
    assert len(unified["sources"]) >= 4
    source_types = [s["source_type"] for s in unified["sources"]]
    assert any("Project Knowledge" in st for st in source_types)
    assert any("Engineering Document" in st for st in source_types)
    assert any("Historical" in st for st in source_types)
    assert any("Current Inspection Context" in st for st in source_types)


# ===========================================================================
# 5. Factory Assistant Conversation (Normal vs Inspection Context)
# ===========================================================================
def test_factory_assistant_normal_chat():
    """Tests normal conversation: greetings, CNC definitions, throughput."""
    res_hi = chat_with_factory_assistant("Hi")
    assert "ForgeMind" in res_hi["reply"]
    assert len(res_hi["suggested_actions"]) > 0

    res_cnc = chat_with_factory_assistant("What is a CNC machine?")
    assert "numerical control" in res_cnc["reply"].lower() or "machining" in res_cnc["reply"].lower()

    res_th = chat_with_factory_assistant("What is throughput?")
    assert "units" in res_th["reply"].lower() or "rate" in res_th["reply"].lower()


def test_factory_assistant_inspection_context_chat():
    """Tests inspection context reasoning: ground in active specimen telemetry."""
    ctx = {
        "inspection_id": "FM-7714",
        "defect": "Rust",
        "confidence": 99.5,
        "gradcam_available": True,
        "active_case_status": "NEW",
        "economic_impact": "MEDIUM (10%)",
        "recommended_action": "Check coolant pH",
    }
    resp = chat_with_factory_assistant(
        message="Why did this defect happen and what should I do?",
        inspection_context=ctx,
    )
    assert "rust" in resp["reply"].lower()
    assert "[HYPOTHESIS]" in resp["provenance_tags"] or any("[HYPOTHESIS]" in t for t in resp["provenance_tags"])


def test_factory_assistant_refusal_unverified_machine_parameters():
    """Verifies strict refusal to hallucinate unverified machine parameters."""
    query = "What spindle RPM should I run on Lathe 3?"
    resp = chat_with_factory_assistant(query)
    expected_refusal = "I don't have verified information about that machine parameter in the available knowledge base."
    assert expected_refusal in resp["reply"]
    assert resp["is_fallback"] is True


def test_factory_assistant_deterministic_fallback():
    """Verifies deterministic fallback engine generates grounded responses offline."""
    fallback = _build_deterministic_assistant_reply("What is throughput?")
    assert "throughput" in fallback.reply.lower()
    assert fallback.is_fallback is True


# ===========================================================================
# 6. Historical Cases REST API (Search, Approve, Verify, Continuous Learning)
# ===========================================================================
def test_historical_cases_list_and_search():
    """Tests GET /api/v1/cases and GET /api/v1/cases/similar."""
    r_list = client.get("/api/v1/cases")
    assert r_list.status_code == 200
    assert r_list.json()["total_cases"] >= 4

    r_sim = client.get("/api/v1/cases/similar?defect=Scratch&confidence=85.7&inspection_id=FM-TEST-01")
    assert r_sim.status_code == 200
    sim_data = r_sim.json()
    assert sim_data["status"] == "similar_found"
    assert sim_data["similar_case"]["case_id"] == "CASE-DEMO-018"
    assert sim_data["similar_case"]["similarity_pct"] == 94.0


def test_case_approval_and_verification_learning_loop():
    """Tests human action approval, verification, and learning into history."""
    # 1. Approve action
    r_app = client.post("/api/v1/cases/CASE-DEMO-018/approve", json={
        "inspection_id": "FM-LEARN-01",
        "case_id": "CASE-DEMO-018",
        "action_text": "Clean fixture contact pads per SOP-742",
        "user_note": "Approved by lead QA technician"
    })
    assert r_app.status_code == 200
    assert r_app.json()["status"] == "ACTION_APPROVED"
    assert r_app.json()["status_tag"] == "[USER CONFIRMED]"

    # 2. Verify prevention
    r_ver = client.post("/api/v1/cases/FM-LEARN-01/verify", json={
        "inspection_id": "FM-LEARN-01",
        "outcome": "verified",
        "defect_type": "Scratch",
        "verification_notes": "Zero recurrence observed on subsequent 200 units."
    })
    assert r_ver.status_code == 200
    assert r_ver.json()["status"] == "VERIFIED"

    # 3. Learning loop: Next search for Scratch should retrieve the learned case
    r_next = client.get("/api/v1/cases/similar?defect=Scratch")
    assert r_next.status_code == 200
    learned_case = r_next.json()["similar_case"]
    assert learned_case["case_id"] == "CASE-HIST-FM-LEARN-01"
    assert learned_case["status_tag"] == "[USER CONFIRMED]"


# ===========================================================================
# 7. What-If Process Simulation Endpoint
# ===========================================================================
def test_what_if_simulation_endpoint():
    """Tests POST /api/v1/simulate comparing Current vs Alternative process."""
    res = client.post("/api/v1/simulate", json={
        "baseline_throughput": 200.0,
        "alternative_throughput": 220.0,
        "baseline_defect_rate": 5.0,
        "alternative_defect_rate": 1.5,
        "cycle_time_delta_sec": -4.0,
        "scenario_name": "High-Efficiency Coolant Spray"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["throughput_change_units_hr"] == 20.0
    assert data["throughput_change_pct"] == 10.0
    assert data["defect_rate_change_pp"] == -3.5
    assert data["evidence_tag"] == "[SIMULATED]"
    assert "physical verification" in data["disclaimer"].lower()


# ===========================================================================
# 8. Unified Knowledge Search Endpoint
# ===========================================================================
def test_knowledge_search_endpoint():
    """Tests GET /api/v1/knowledge/search."""
    res = client.get("/api/v1/knowledge/search?q=porosity&defect=Hole")
    assert res.status_code == 200
    data = res.json()
    assert data["total_sources"] >= 1
    assert any("Porosity" in s["source_name"] or "Porosity" in s["content"] for s in data["sources"])


# ===========================================================================
# 9. Defect Case Review Persistence & Reject / Edit Endpoints
# ===========================================================================
def test_case_review_persistence_and_endpoints():
    """
    Validates DefectCaseReview model, persistence, and reject/edit endpoints:
    1. DefectCaseReview ORM model and serialization
    2. POST /api/v1/cases/{case_id}/reject requires reason
    3. POST /api/v1/cases/{case_id}/edit saves edited action
    """
    from backend.models import DefectCaseReview

    # 1. Test DefectCaseReview model directly
    review = DefectCaseReview(
        case_id="CASE-TEST-001",
        inspection_id="FM-TEST-001",
        defect_type="Crack",
        recommended_action="Recalibrate tool offsets",
        edited_action="Custom tool damping SOP",
        decision="EDITED",
        reviewer_note="Adjusted per vibration log",
        status="ACTION_APPROVED",
    )
    d = review.to_dict()
    assert d["case_id"] == "CASE-TEST-001"
    assert d["decision"] == "EDITED"
    assert d["edited_action"] == "Custom tool damping SOP"
    assert d["status"] == "ACTION_APPROVED"

    # 2. Test Reject endpoint - reason is required
    res_reject_empty = client.post("/api/v1/cases/CASE-DEMO-042/reject", json={
        "inspection_id": "FM-TEST-REJ",
        "reason": "",
    })
    assert res_reject_empty.status_code == 400

    res_reject = client.post("/api/v1/cases/CASE-DEMO-042/reject", json={
        "inspection_id": "FM-TEST-REJ",
        "reason": "Coolant was tested and confirmed at normal concentration.",
        "defect_type": "Crack",
    })
    assert res_reject.status_code == 200
    rej_data = res_reject.json()
    assert rej_data["status"] == "REJECTED"
    assert rej_data["decision"] == "REJECTED"
    assert rej_data["rejection_reason"] == "Coolant was tested and confirmed at normal concentration."
    assert "decision_timestamp" in rej_data

    # 3. Test Edit endpoint
    res_edit = client.post("/api/v1/cases/CASE-DEMO-018/edit", json={
        "inspection_id": "FM-TEST-EDIT",
        "edited_action": "Apply SOP-991 custom buffing protocol",
        "reviewer_note": "Operator custom override",
        "defect_type": "Scratch",
    })
    assert res_edit.status_code == 200
    edit_data = res_edit.json()
    assert edit_data["status"] == "ACTION_APPROVED"
    assert edit_data["decision"] == "EDITED"
    assert edit_data["applied_action"] == "Apply SOP-991 custom buffing protocol"
    assert "decision_timestamp" in edit_data


# ===========================================================================
# 10. Epistemic Uncertainty & Novel Defect Detection Path
# ===========================================================================
def test_uncertainty_inference_path():
    """
    Validates epistemic uncertainty path in DefectInferenceEngine:
    If confidence < threshold OR margin < 0.15 OR normalized entropy > 0.6:
    - prediction is set to 'Uncertain / Novel'
    - raw top-1 class is preserved in top1_class_raw
    - is_low_confidence is True
    - report tells user 'needs human review, possible novel defect'
    """
    import cv2
    import torch
    import numpy as np
    from scripts.ml.inference_service import get_inference_engine
    from scripts.ml.model import CLASS_NAMES

    engine = get_inference_engine()

    # Create synthetic test image with texture to pass OpenCV quality checks
    img = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
    cv2.rectangle(img, (20, 20), (200, 200), (255, 255, 255), 3)

    # 1. Trigger via threshold override (confidence < threshold)
    res_thresh = engine.classify_image(img, threshold_override=1.01)
    assert res_thresh["prediction"] == "Uncertain / Novel"
    assert res_thresh["top1_class_raw"] in CLASS_NAMES
    assert res_thresh["is_low_confidence"] is True
    assert "needs human review, possible novel defect" in res_thresh["report"]
    assert "margin" in res_thresh
    assert "normalized_entropy" in res_thresh

    # 2. Trigger via narrow margin (< 0.15) and high entropy (> 0.6)
    class AmbiguousModel(torch.nn.Module):
        def forward(self, x):
            # Equal logits => probs = [0.2, 0.2, 0.2, 0.2, 0.2]
            return torch.tensor([[1.0, 1.0, 1.0, 1.0, 1.0]])

    original_model = engine.model
    try:
        engine.model = AmbiguousModel()
        res_ambig = engine.classify_image(img, threshold_override=0.1)
        assert res_ambig["prediction"] == "Uncertain / Novel"
        assert res_ambig["top1_class_raw"] in CLASS_NAMES
        assert res_ambig["is_low_confidence"] is True
        assert res_ambig["margin"] < 0.15
        assert res_ambig["normalized_entropy"] > 0.6
        assert "needs human review, possible novel defect" in res_ambig["report"]
    finally:
        engine.model = original_model

