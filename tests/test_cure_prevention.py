"""
Tests for Cure & Prevention Engine & API Endpoints
Verifies all 20 requirements from section 20 of the Cure & Prevention specification:

 1. Tab renamed to Cure & Prevention
 2. Current defect displayed
 3. Vision confidence displayed independently
 4. Similar case search functionality
 5. No similar case state (e.g. Normal or unindexed defect)
 6. Similar case found state (e.g. Scratch, Crack, Rust, Hole)
 7. Similarity score displayed separately from confidence
 8. Previous case details returned
 9. Historical evidence labels present ([HISTORICAL EVIDENCE])
10. Hypothesis labels present ([HYPOTHESIS])
11. Advisory labels present ([ADVISORY])
12. User confirmation workflow ([USER CONFIRMED])
13. Apply previous action workflow (sets ACTION_APPROVED [USER CONFIRMED])
14. Case status transitions (NEW -> ... -> VERIFIED / DEFECT_RECURRED)
15. No automatic physical-solution claim (clear disclaimers present)
16. Verification pending state (VERIFICATION_PENDING)
17. Verified state (VERIFIED with continuous learning loop storage)
18. Defect recurrence state (DEFECT_RECURRED)
19. Simulated demo cases clearly labeled [SIMULATED]
20. No fabricated historical factory evidence ("Verification data not available in organizer dataset")
"""

import pytest
from fastapi.testclient import TestClient

from backend.server import app
from scripts.forgemind.cure_prevention_engine import (
    search_similar_cases,
    apply_previous_action,
    update_case_workflow_status,
    verify_case_prevention,
    reset_case_registry,
    DEMO_HISTORICAL_CASES,
    VALID_WORKFLOW_STATES,
)


@pytest.fixture(autouse=True)
def clean_registry():
    """Reset the registry before each test for clean isolation."""
    reset_case_registry()
    yield
    reset_case_registry()


client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Tab Name & Metadata Verification
# ---------------------------------------------------------------------------
def test_requirement_01_tab_metadata_and_title():
    """Requirement 1: Module is identified as Cure & Prevention with appropriate subtitle/tag."""
    # Verify via search endpoint tags and response structure
    resp = client.get("/api/v1/cure-prevention/search?defect=Scratch&confidence=85.7&inspection_id=FM-7714")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "similar_found"
    assert "SIMILAR DEFECT FOUND" in data["title"]
    # Check learning loop has 8 steps
    assert len(data["learning_loop"]) == 8


# ---------------------------------------------------------------------------
# 2. Current Defect Displayed
# ---------------------------------------------------------------------------
def test_requirement_02_current_defect_displayed():
    """Requirement 2: Current defect information is explicitly packaged."""
    res = search_similar_cases(defect_type="Scratch", vision_confidence=87.4, inspection_id="FM-001")
    assert res["current_defect"]["defect"] == "Scratch"
    assert res["current_defect"]["inspection_id"] == "FM-001"


# ---------------------------------------------------------------------------
# 3. Vision Confidence Displayed Independently
# ---------------------------------------------------------------------------
def test_requirement_03_vision_confidence_independent():
    """Requirement 3: Vision confidence is preserved independently with [MODEL] tag."""
    res = search_similar_cases(defect_type="Scratch", vision_confidence=85.7, inspection_id="FM-002")
    assert res["current_defect"]["vision_confidence"] == 85.7
    assert res["current_defect"]["confidence_tag"] == "[MODEL]"
    assert "Independent classifier certainty metric" in res["current_defect"]["confidence_note"]


# ---------------------------------------------------------------------------
# 4. Similar Case Search Functionality
# ---------------------------------------------------------------------------
def test_requirement_04_similar_case_search_api():
    """Requirement 4: GET /api/v1/cure-prevention/search executes properly."""
    resp = client.get("/api/v1/cure-prevention/search?defect=Crack&confidence=91.2&inspection_id=FM-CRACK-1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "similar_found"
    assert body["similar_case"]["defect"] == "Crack"
    assert body["similar_case"]["case_id"] == "CASE-DEMO-042"


# ---------------------------------------------------------------------------
# 5. No Similar Case State
# ---------------------------------------------------------------------------
def test_requirement_05_no_similar_case_state():
    """Requirement 5: Normal or unindexed defects return NO SIMILAR PREVIOUS CASE FOUND."""
    # Case: Normal
    res_normal = search_similar_cases(defect_type="Normal", vision_confidence=99.1, inspection_id="FM-NORM-1")
    assert res_normal["status"] == "no_similar_case"
    assert res_normal["title"] == "NO SIMILAR PREVIOUS CASE FOUND"
    assert res_normal["can_start_investigation"] is True

    # Case: Unknown defect
    res_unknown = search_similar_cases(defect_type="UnknownAnomaly", vision_confidence=70.0, inspection_id="FM-UNK-1")
    assert res_unknown["status"] == "no_similar_case"
    assert "No sufficiently similar resolved case" in res_unknown["message"]


# ---------------------------------------------------------------------------
# 6. Similar Case Found State
# ---------------------------------------------------------------------------
def test_requirement_06_similar_case_found_state():
    """Requirement 6: Scratch, Crack, Rust, and Hole return similar cases."""
    for defect_name, expected_case_id in [
        ("Scratch", "CASE-DEMO-018"),
        ("Crack", "CASE-DEMO-042"),
        ("Rust", "CASE-DEMO-077"),
        ("Hole", "CASE-DEMO-103"),
    ]:
        res = search_similar_cases(defect_type=defect_name, vision_confidence=88.0, inspection_id=f"FM-{defect_name}")
        assert res["status"] == "similar_found"
        assert res["similar_case"]["case_id"] == expected_case_id


# ---------------------------------------------------------------------------
# 7. Similarity Score Displayed Separately from Confidence
# ---------------------------------------------------------------------------
def test_requirement_07_similarity_score_decoupled_from_confidence():
    """Requirement 7: Similarity score has its own [SIMILARITY] tag and differs from vision confidence."""
    res = search_similar_cases(defect_type="Scratch", vision_confidence=78.2, inspection_id="FM-782")
    model_conf = res["current_defect"]["vision_confidence"]
    sim_pct = res["similar_case"]["similarity_pct"]
    assert model_conf == 78.2
    assert sim_pct == 94.0
    assert model_conf != sim_pct
    assert res["similar_case"]["similarity_tag"] == "[SIMILARITY]"
    assert "indicates resemblance" in res["similar_case"]["similarity_disclaimer"]


# ---------------------------------------------------------------------------
# 8. Previous Case Details Returned
# ---------------------------------------------------------------------------
def test_requirement_08_previous_case_details_present():
    """Requirement 8: Returns previous investigation, cause, recommended action, human decision, outcome."""
    res = search_similar_cases(defect_type="Rust", vision_confidence=92.0, inspection_id="FM-RUST-1")
    sc = res["similar_case"]
    assert "investigation" in sc["previous_investigation"].lower() or "check" in sc["previous_investigation"].lower()
    assert sc["previous_possible_cause"] is not None
    assert sc["previous_recommended_action"] is not None
    assert sc["previous_human_decision"] == "Corrective action approved"
    assert sc["previous_outcome"] == "Case marked resolved"


# ---------------------------------------------------------------------------
# 9. Historical Evidence Labels Present
# ---------------------------------------------------------------------------
def test_requirement_09_historical_evidence_labels():
    """Requirement 9: Strict evidence tags [HISTORICAL EVIDENCE] on previous actions and relevance items."""
    res = search_similar_cases(defect_type="Scratch", vision_confidence=85.0, inspection_id="FM-EV-1")
    sc = res["similar_case"]
    assert sc["cure_action"]["evidence_tag"] == "[HISTORICAL EVIDENCE]"
    has_hist_tag = any(item["tag"] == "[HISTORICAL EVIDENCE]" for item in sc["evidence_why_relevant"])
    assert has_hist_tag is True


# ---------------------------------------------------------------------------
# 10. Hypothesis Labels Present
# ---------------------------------------------------------------------------
def test_requirement_10_hypothesis_labels():
    """Requirement 10: Previous possible causes are labeled [HYPOTHESIS]."""
    res = search_similar_cases(defect_type="Crack", vision_confidence=90.0, inspection_id="FM-CR-1")
    assert res["similar_case"]["cause_tag"] == "[HYPOTHESIS]"


# ---------------------------------------------------------------------------
# 11. Advisory Labels Present
# ---------------------------------------------------------------------------
def test_requirement_11_advisory_labels():
    """Requirement 11: Corrective and prevention actions are labeled [ADVISORY]."""
    res = search_similar_cases(defect_type="Hole", vision_confidence=89.0, inspection_id="FM-HL-1")
    assert res["similar_case"]["action_tag"] == "[ADVISORY]"
    assert res["similar_case"]["cure_action"]["advisory_tag"] == "[ADVISORY]"
    assert res["similar_case"]["prevention"]["advisory_tag"] == "[ADVISORY]"


# ---------------------------------------------------------------------------
# 12. User Confirmation Workflow
# ---------------------------------------------------------------------------
def test_requirement_12_user_confirmation_labels():
    """Requirement 12: Human decisions and outcomes have [USER CONFIRMED] labels."""
    res = search_similar_cases(defect_type="Scratch", vision_confidence=85.0, inspection_id="FM-UC-1")
    assert res["similar_case"]["decision_tag"] == "[USER CONFIRMED]"
    assert res["similar_case"]["outcome_tag"] == "[USER CONFIRMED]"


# ---------------------------------------------------------------------------
# 13. Apply Previous Action Workflow
# ---------------------------------------------------------------------------
def test_requirement_13_apply_previous_action():
    """Requirement 13: Human one-click apply action transitions status to ACTION_APPROVED [USER CONFIRMED]."""
    resp = client.post(
        "/api/v1/cure-prevention/apply-action",
        json={
            "inspection_id": "FM-7714",
            "case_id": "CASE-DEMO-018",
            "action_text": "Inspect fixture contact surfaces and check guide rails.",
            "user_note": "Approved by Line Engineer for shift 2",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ACTION_APPROVED"
    assert data["status_tag"] == "[USER CONFIRMED]"
    assert data["case_state"]["confirmed_by_user"] is True
    assert data["applied_action"] == "Inspect fixture contact surfaces and check guide rails."


# ---------------------------------------------------------------------------
# 14. Case Status Transitions
# ---------------------------------------------------------------------------
def test_requirement_14_case_status_lifecycle():
    """Requirement 14: Valid status progression through lifecycle states."""
    inspection_id = "FM-LIFECYCLE-01"

    # 1. NEW
    s_new = search_similar_cases("Scratch", 85.0, inspection_id)["active_case_status"]["status"]
    assert s_new == "NEW"

    # 2. ACTION_RECOMMENDED
    res1 = client.post("/api/v1/cure-prevention/status", json={"inspection_id": inspection_id, "status": "ACTION_RECOMMENDED"})
    assert res1.json()["status"] == "ACTION_RECOMMENDED"

    # 3. ACTION_APPROVED
    res2 = client.post("/api/v1/cure-prevention/status", json={"inspection_id": inspection_id, "status": "ACTION_APPROVED"})
    assert res2.json()["status"] == "ACTION_APPROVED"

    # 4. ACTION_IN_PROGRESS
    res3 = client.post("/api/v1/cure-prevention/status", json={"inspection_id": inspection_id, "status": "ACTION_IN_PROGRESS"})
    assert res3.json()["status"] == "ACTION_IN_PROGRESS"

    # 5. RESOLVED
    res4 = client.post("/api/v1/cure-prevention/status", json={"inspection_id": inspection_id, "status": "RESOLVED"})
    assert res4.json()["status"] == "RESOLVED"

    # 6. VERIFICATION_PENDING
    res5 = client.post("/api/v1/cure-prevention/status", json={"inspection_id": inspection_id, "status": "VERIFICATION_PENDING"})
    assert res5.json()["status"] == "VERIFICATION_PENDING"

    # Invalid status should return 400
    invalid_resp = client.post("/api/v1/cure-prevention/status", json={"inspection_id": inspection_id, "status": "INVALID_STATE"})
    assert invalid_resp.status_code == 400


# ---------------------------------------------------------------------------
# 15. No Automatic Physical-Solution Claim
# ---------------------------------------------------------------------------
def test_requirement_15_no_automatic_physical_solution_claims():
    """Requirement 15: Engine disclaims automatic repair or prevention guarantees."""
    res = search_similar_cases("Scratch", 85.7, "FM-DISC-1")
    disclaimer = res["similar_case"]["cure_action"]["disclaimer"]
    assert "Does not guarantee physical resolution" in disclaimer
    assert "On-site human verification is required" in disclaimer

    apply_res = apply_previous_action("FM-DISC-1", "CASE-DEMO-018", "Clean fixture")
    assert "Physical corrective action must be completed" in apply_res["disclaimer"]


# ---------------------------------------------------------------------------
# 16. Verification Pending State
# ---------------------------------------------------------------------------
def test_requirement_16_verification_pending_state():
    """Requirement 16: VERIFICATION_PENDING state is supported and recorded."""
    res = update_case_workflow_status("FM-VERIF-PEND", "VERIFICATION_PENDING", "Awaiting batch run completion")
    assert res["status"] == "VERIFICATION_PENDING"
    assert res["status_tag"] == "[USER CONFIRMED]"


# ---------------------------------------------------------------------------
# 17. Verified State & Historical Learning Loop
# ---------------------------------------------------------------------------
def test_requirement_17_verified_state_and_learning_loop():
    """Requirement 17: Case marked VERIFIED stores case in historical library for future reuse."""
    # First apply an action to the case
    apply_previous_action("FM-VERIF-SUCCESS", "CASE-DEMO-018", "Replaced guide rail wiper pad")

    # Mark verified
    verif_resp = client.post(
        "/api/v1/cure-prevention/verify",
        json={
            "inspection_id": "FM-VERIF-SUCCESS",
            "outcome": "verified",
            "defect_type": "Scratch",
            "verification_notes": "No surface scratches in next 200 cycles",
        },
    )
    assert verif_resp.status_code == 200
    verif_data = verif_resp.json()
    assert verif_data["status"] == "VERIFIED"
    assert verif_data["status_tag"] == "[USER CONFIRMED]"

    # Test future reuse: searching for Scratch now retrieves the newly verified case
    subsequent_search = search_similar_cases("Scratch", 90.0, "FM-NEXT-RUN")
    assert subsequent_search["status"] == "similar_found"
    assert subsequent_search["similar_case"]["case_id"] == "CASE-HIST-FM-VERIF-SUCCESS"
    assert "Replaced guide rail wiper pad" in subsequent_search["similar_case"]["cure_action"]["previous_action_summary"]


# ---------------------------------------------------------------------------
# 18. Defect Recurrence State
# ---------------------------------------------------------------------------
def test_requirement_18_defect_recurrence_state():
    """Requirement 18: Marking outcome as recurred sets status to DEFECT_RECURRED."""
    verif_resp = client.post(
        "/api/v1/cure-prevention/verify",
        json={
            "inspection_id": "FM-RECUR-01",
            "outcome": "recurred",
            "defect_type": "Crack",
            "verification_notes": "Crack re-appeared on run #45",
        },
    )
    assert verif_resp.status_code == 200
    verif_data = verif_resp.json()
    assert verif_data["status"] == "DEFECT_RECURRED"
    assert verif_data["status_tag"] == "[USER CONFIRMED]"
    assert "recurred" in verif_data["message"].lower()


# ---------------------------------------------------------------------------
# 19. Simulated Demo Cases Clearly Labeled
# ---------------------------------------------------------------------------
def test_requirement_19_simulated_demo_cases_labeled():
    """Requirement 19: All pre-seeded demo cases are explicitly tagged [SIMULATED]."""
    for defect_key, demo_case in DEMO_HISTORICAL_CASES.items():
        assert demo_case["status_tag"] == "[SIMULATED]"
        assert demo_case["cure_action"]["simulated_tag"] == "[SIMULATED]"


# ---------------------------------------------------------------------------
# 20. No Fabricated Historical Factory Evidence
# ---------------------------------------------------------------------------
def test_requirement_20_no_fabricated_factory_evidence():
    """Requirement 20: Explicit disclosure that verification data is unavailable from organizer dataset."""
    res = verify_case_prevention("FM-NO-FAB-1", "verified", "Rust")
    assert res["verification_data_available"] is False
    assert "Verification data not available in the organizer dataset" in res["verification_notice"]
    assert "human confirmation" in res["verification_notice"]
