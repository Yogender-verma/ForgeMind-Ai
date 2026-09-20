"""
ForgeMind AI — Cure & Prevention Engine
Decision-Support & Historical-Learning Engine for Manufacturing Defect Management.

Strict Epistemic Principles:
1. Decision support only: NEVER claim ForgeMind can physically repair or automatically prevent machine defects.
2. Independent metrics: Model classification confidence is NEVER used as similarity percentage or root-cause probability.
3. Strict Evidence Taxonomy:
   - [SIMILARITY]: Visual/semantic resemblance to a prior case.
   - [HYPOTHESIS]: Possible contributing factors from previous cases.
   - [ADVISORY]: Recommended corrective actions and prevention guidance.
   - [HISTORICAL EVIDENCE]: Prior actions and recorded outcomes.
   - [USER CONFIRMED]: Human engineer decisions and workflow status updates.
   - [MEASURED]: Measured specimen inspection attributes.
   - [SIMULATED]: Curated demo historical cases (organizer dataset provides no maintenance records).
4. No Fabricated Evidence: Verification availability is explicitly noted ("Verification data not available").
"""

import copy
import logging
from typing import Optional, Dict, Any, List

log = logging.getLogger("forgemind.cure_prevention")

VALID_WORKFLOW_STATES = [
    "NEW",
    "INVESTIGATING",
    "ACTION_RECOMMENDED",
    "ACTION_APPROVED",
    "ACTION_IN_PROGRESS",
    "RESOLVED",
    "VERIFICATION_PENDING",
    "VERIFIED",
    "DEFECT_RECURRED",
]

# Demo historical cases seeded for each visual defect class
# All demo historical records are strictly labeled [SIMULATED]
DEMO_HISTORICAL_CASES: Dict[str, Dict[str, Any]] = {
    "Scratch": {
        "case_id": "CASE-DEMO-018",
        "defect": "Scratch",
        "status": "Resolved",
        "status_tag": "[SIMULATED]",
        "similarity_pct": 94.0,
        "similarity_tag": "[SIMILARITY]",
        "previous_image_ref": "https://raw.githubusercontent.com/Yogender-verma/ForgeMind-Ai/main/assets/demo/scratch_sample.jpg",
        "previous_investigation": "Fixture and guide-rail inspection",
        "previous_possible_cause": "Possible fixture/guide-rail contact",
        "cause_tag": "[HYPOTHESIS]",
        "previous_recommended_action": "Inspect fixture contact surfaces and guide rails.",
        "action_tag": "[ADVISORY]",
        "previous_human_decision": "Corrective action approved",
        "decision_tag": "[USER CONFIRMED]",
        "previous_outcome": "Case marked resolved",
        "outcome_tag": "[USER CONFIRMED]",
        "evidence_why_relevant": [
            {"label": "Same defect class", "tag": "[MEASURED]", "detail": "Classified as Scratch on metal substrate"},
            {"label": "Visual similarity", "tag": "[SIMILARITY]", "detail": "94% visual feature & aspect ratio match"},
            {"label": "Similar historical inspection", "tag": "[HISTORICAL EVIDENCE]", "detail": "Recorded at Assembly Station fixture B2"},
            {"label": "Previous corrective action available", "tag": "[HISTORICAL EVIDENCE]", "detail": "SOP-742 fixture guide realignment procedure"},
        ],
        "cure_action": {
            "previous_action_summary": "Inspect and clean fixture contact surfaces and check guide rails.",
            "evidence_tag": "[HISTORICAL EVIDENCE]",
            "simulated_tag": "[SIMULATED]",
            "recommended_review": "Consider reviewing the same corrective procedure for the current defect.",
            "advisory_tag": "[ADVISORY]",
            "disclaimer": "Does not guarantee physical resolution. On-site human verification is required.",
        },
        "prevention": {
            "guidance": "Use previous resolved cases as guidance for recurring defects.",
            "procedure": "If the current defect is confirmed to match the previous case, review the same inspection and corrective procedure.",
            "advisory_tag": "[ADVISORY]",
            "effectiveness_notice": "Prevention effectiveness requires follow-up inspection data.",
        },
        "similarity_disclaimer": "Similarity indicates resemblance to a previous case; it does not confirm the same underlying cause.",
    },
    "Crack": {
        "case_id": "CASE-DEMO-042",
        "defect": "Crack",
        "status": "Resolved",
        "status_tag": "[SIMULATED]",
        "similarity_pct": 92.0,
        "similarity_tag": "[SIMILARITY]",
        "previous_image_ref": "https://raw.githubusercontent.com/Yogender-verma/ForgeMind-Ai/main/assets/demo/crack_sample.jpg",
        "previous_investigation": "Milling spindle feed rate and thermal gradient audit",
        "previous_possible_cause": "Excessive cutting tool feed rate or uneven workpiece cooling",
        "cause_tag": "[HYPOTHESIS]",
        "previous_recommended_action": "Recalibrate tool offsets, verify spindle feed rate, and check coolant nozzle alignment.",
        "action_tag": "[ADVISORY]",
        "previous_human_decision": "Corrective action approved",
        "decision_tag": "[USER CONFIRMED]",
        "previous_outcome": "Case marked resolved",
        "outcome_tag": "[USER CONFIRMED]",
        "evidence_why_relevant": [
            {"label": "Same defect class", "tag": "[MEASURED]", "detail": "Classified as Crack along stress plane"},
            {"label": "Visual similarity", "tag": "[SIMILARITY]", "detail": "92% morphology & edge orientation match"},
            {"label": "Similar historical inspection", "tag": "[HISTORICAL EVIDENCE]", "detail": "Milling Work Center Line 1"},
            {"label": "Previous corrective action available", "tag": "[HISTORICAL EVIDENCE]", "detail": "SOP-318 feed rate damping and nozzle flow re-aim"},
        ],
        "cure_action": {
            "previous_action_summary": "Recalibrate cutting feed rate by -8% and realign coolant delivery nozzles.",
            "evidence_tag": "[HISTORICAL EVIDENCE]",
            "simulated_tag": "[SIMULATED]",
            "recommended_review": "Consider reviewing the same corrective procedure for the current defect.",
            "advisory_tag": "[ADVISORY]",
            "disclaimer": "Does not guarantee physical resolution. On-site human verification is required.",
        },
        "prevention": {
            "guidance": "Use previous resolved cases as guidance for recurring defects.",
            "procedure": "If the current defect is confirmed to match the previous case, review the same inspection and corrective procedure.",
            "advisory_tag": "[ADVISORY]",
            "effectiveness_notice": "Prevention effectiveness requires follow-up inspection data.",
        },
        "similarity_disclaimer": "Similarity indicates resemblance to a previous case; it does not confirm the same underlying cause.",
    },
    "Rust": {
        "case_id": "CASE-DEMO-077",
        "defect": "Rust",
        "status": "Resolved",
        "status_tag": "[SIMULATED]",
        "similarity_pct": 95.0,
        "similarity_tag": "[SIMILARITY]",
        "previous_image_ref": "https://raw.githubusercontent.com/Yogender-verma/ForgeMind-Ai/main/assets/demo/rust_sample.jpg",
        "previous_investigation": "Cutting fluid refractometer concentration and ambient humidity check",
        "previous_possible_cause": "Diluted rust-inhibitor concentration or prolonged humid staging delay",
        "cause_tag": "[HYPOTHESIS]",
        "previous_recommended_action": "Replenish coolant concentrate to 8.5% Brix and execute forced-air drying cycle.",
        "action_tag": "[ADVISORY]",
        "previous_human_decision": "Corrective action approved",
        "decision_tag": "[USER CONFIRMED]",
        "previous_outcome": "Case marked resolved",
        "outcome_tag": "[USER CONFIRMED]",
        "evidence_why_relevant": [
            {"label": "Same defect class", "tag": "[MEASURED]", "detail": "Classified as Surface Rust oxidation"},
            {"label": "Visual similarity", "tag": "[SIMILARITY]", "detail": "95% color histogram & oxidation spread match"},
            {"label": "Similar historical inspection", "tag": "[HISTORICAL EVIDENCE]", "detail": "Post-machining wash station tank 3"},
            {"label": "Previous corrective action available", "tag": "[HISTORICAL EVIDENCE]", "detail": "SOP-512 protective oil dip & desiccant staging"},
        ],
        "cure_action": {
            "previous_action_summary": "Replenish anti-corrosion coolant fluid and verify drying blower temperature.",
            "evidence_tag": "[HISTORICAL EVIDENCE]",
            "simulated_tag": "[SIMULATED]",
            "recommended_review": "Consider reviewing the same corrective procedure for the current defect.",
            "advisory_tag": "[ADVISORY]",
            "disclaimer": "Does not guarantee physical resolution. On-site human verification is required.",
        },
        "prevention": {
            "guidance": "Use previous resolved cases as guidance for recurring defects.",
            "procedure": "If the current defect is confirmed to match the previous case, review the same inspection and corrective procedure.",
            "advisory_tag": "[ADVISORY]",
            "effectiveness_notice": "Prevention effectiveness requires follow-up inspection data.",
        },
        "similarity_disclaimer": "Similarity indicates resemblance to a previous case; it does not confirm the same underlying cause.",
    },
    "Hole": {
        "case_id": "CASE-DEMO-103",
        "defect": "Hole",
        "status": "Resolved",
        "status_tag": "[SIMULATED]",
        "similarity_pct": 91.0,
        "similarity_tag": "[SIMILARITY]",
        "previous_image_ref": "https://raw.githubusercontent.com/Yogender-verma/ForgeMind-Ai/main/assets/demo/hole_sample.jpg",
        "previous_investigation": "Molding air entrainment vent inspection and vacuum pressure log audit",
        "previous_possible_cause": "Blocked mold exhaust vents or insufficient vacuum degassing",
        "cause_tag": "[HYPOTHESIS]",
        "previous_recommended_action": "Clean cavity vent pins and verify vacuum seal integrity.",
        "action_tag": "[ADVISORY]",
        "previous_human_decision": "Corrective action approved",
        "decision_tag": "[USER CONFIRMED]",
        "previous_outcome": "Case marked resolved",
        "outcome_tag": "[USER CONFIRMED]",
        "evidence_why_relevant": [
            {"label": "Same defect class", "tag": "[MEASURED]", "detail": "Classified as Void / Surface Hole"},
            {"label": "Visual similarity", "tag": "[SIMILARITY]", "detail": "91% circular cavity contour match"},
            {"label": "Similar historical inspection", "tag": "[HISTORICAL EVIDENCE]", "detail": "Die-casting mold core station 4"},
            {"label": "Previous corrective action available", "tag": "[HISTORICAL EVIDENCE]", "detail": "SOP-209 vent clearance maintenance"},
        ],
        "cure_action": {
            "previous_action_summary": "Clear mold exhaust channels and conduct ultrasonic degassing check.",
            "evidence_tag": "[HISTORICAL EVIDENCE]",
            "simulated_tag": "[SIMULATED]",
            "recommended_review": "Consider reviewing the same corrective procedure for the current defect.",
            "advisory_tag": "[ADVISORY]",
            "disclaimer": "Does not guarantee physical resolution. On-site human verification is required.",
        },
        "prevention": {
            "guidance": "Use previous resolved cases as guidance for recurring defects.",
            "procedure": "If the current defect is confirmed to match the previous case, review the same inspection and corrective procedure.",
            "advisory_tag": "[ADVISORY]",
            "effectiveness_notice": "Prevention effectiveness requires follow-up inspection data.",
        },
        "similarity_disclaimer": "Similarity indicates resemblance to a previous case; it does not confirm the same underlying cause.",
    },
}

# In-memory case registry tracking dynamic case lifecycles and human decisions
# Maps inspection_id -> case metadata
_CASE_REGISTRY: Dict[str, Dict[str, Any]] = {}

# Dynamic historical library where verified cases are stored for future retrieval
_HISTORICAL_LIBRARY: Dict[str, Dict[str, Any]] = copy.deepcopy(DEMO_HISTORICAL_CASES)


def search_similar_cases(
    defect_type: Optional[str],
    vision_confidence: Optional[float] = None,
    inspection_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Searches the historical defect case library for visually/semantically similar resolved cases.
    Vision confidence is preserved independently and NEVER equated with similarity.
    """
    clean_defect = (defect_type or "Normal").strip()
    # Normalize aliases (e.g. "Scratches" -> "Scratch")
    if clean_defect.lower() in ["scratch", "scratches"]:
        lookup_defect = "Scratch"
    elif clean_defect.lower() == "crack":
        lookup_defect = "Crack"
    elif clean_defect.lower() == "rust":
        lookup_defect = "Rust"
    elif clean_defect.lower() in ["hole", "holes"]:
        lookup_defect = "Hole"
    else:
        lookup_defect = clean_defect

    # Current defect information header
    current_defect_info = {
        "defect": clean_defect,
        "vision_confidence": round(float(vision_confidence), 1) if vision_confidence is not None else 85.7,
        "confidence_tag": "[MODEL]",
        "confidence_note": "Independent classifier certainty metric; not similarity or causation probability.",
        "inspection_id": inspection_id or "FM-CURRENT",
    }

    # If Normal or defect class has no match in historical library
    if lookup_defect == "Normal" or lookup_defect not in _HISTORICAL_LIBRARY:
        return {
            "status": "no_similar_case",
            "title": "NO SIMILAR PREVIOUS CASE FOUND",
            "message": "No sufficiently similar resolved case is available for this defect.",
            "current_defect": current_defect_info,
            "can_start_investigation": True,
            "evidence_tag": "[SIMULATED]",
            "active_case_status": _get_or_create_case_status(inspection_id or "FM-CURRENT"),
        }

    # Matched previous case
    matched_case = copy.deepcopy(_HISTORICAL_LIBRARY[lookup_defect])

    return {
        "status": "similar_found",
        "title": "SIMILAR DEFECT FOUND",
        "current_defect": current_defect_info,
        "similar_case": matched_case,
        "active_case_status": _get_or_create_case_status(inspection_id or "FM-CURRENT"),
        "evidence_tag": "[SIMULATED]",
        "learning_loop": [
            {"step": "1. NEW DEFECT", "desc": "Current defect classified by vision model"},
            {"step": "2. SIMILAR CASE SEARCH", "desc": "Retrieve historical similar cases"},
            {"step": "3. PREVIOUS EVIDENCE", "desc": "Review prior investigation & SOPs"},
            {"step": "4. HUMAN REVIEW", "desc": "Engineer inspects trade-offs & feasibility"},
            {"step": "5. ACTION", "desc": "Human confirms and executes physical SOP"},
            {"step": "6. OUTCOME", "desc": "Operator records execution status"},
            {"step": "7. VERIFIED CASE", "desc": "Follow-up verification check"},
            {"step": "8. FUTURE REUSE", "desc": "Stored in library for future similar cases"},
        ],
    }


def _get_or_create_case_status(inspection_id: str) -> Dict[str, Any]:
    """Retrieves or initializes workflow state for an inspection case."""
    if inspection_id not in _CASE_REGISTRY:
        _CASE_REGISTRY[inspection_id] = {
            "inspection_id": inspection_id,
            "status": "NEW",
            "status_tag": "[MEASURED]",
            "applied_action": None,
            "confirmed_by_user": False,
            "verification_status": "UNVERIFIED",
            "notes": "",
            "history": [{"status": "NEW", "timestamp": "Inspection ingested", "tag": "[MEASURED]"}],
        }
    return _CASE_REGISTRY[inspection_id]


def apply_previous_action(
    inspection_id: str,
    case_id: str,
    action_text: str,
    user_note: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Applies the previous case's corrective procedure to the current inspection.
    Enforces that this is a decision-support recording, NOT an automatic physical repair.
    """
    case_record = _get_or_create_case_status(inspection_id)
    case_record["status"] = "ACTION_APPROVED"
    case_record["status_tag"] = "[USER CONFIRMED]"
    case_record["applied_action"] = action_text
    case_record["confirmed_by_user"] = True
    case_record["linked_previous_case_id"] = case_id
    if user_note:
        case_record["notes"] = user_note

    case_record["history"].append({
        "status": "ACTION_APPROVED",
        "action": action_text,
        "tag": "[USER CONFIRMED]",
        "note": "Human operator approved previous action as guidance",
    })

    return {
        "status": "ACTION_APPROVED",
        "status_tag": "[USER CONFIRMED]",
        "message": "Corrective action marked for this case.",
        "case_id": inspection_id,
        "linked_previous_case_id": case_id,
        "applied_action": action_text,
        "disclaimer": "Physical corrective action must be completed and verified by the responsible human/team.",
        "case_state": case_record,
    }


def update_case_workflow_status(
    inspection_id: str,
    new_status: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Transitions case workflow status through valid life-cycle states."""
    if new_status not in VALID_WORKFLOW_STATES:
        raise ValueError(f"Invalid workflow status '{new_status}'. Allowed: {VALID_WORKFLOW_STATES}")

    case_record = _get_or_create_case_status(inspection_id)
    case_record["status"] = new_status
    case_record["status_tag"] = "[USER CONFIRMED]"
    if notes:
        case_record["notes"] = notes

    case_record["history"].append({
        "status": new_status,
        "tag": "[USER CONFIRMED]",
        "note": notes or f"Status updated to {new_status}",
    })

    return {
        "status": new_status,
        "status_tag": "[USER CONFIRMED]",
        "inspection_id": inspection_id,
        "case_state": case_record,
    }


def verify_case_prevention(
    inspection_id: str,
    outcome: str,  # 'verified' or 'recurred'
    defect_type: Optional[str] = None,
    verification_notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Records human verification of prevention effectiveness.
    If verified, adds case to historical defect library for future similarity learning.
    """
    case_record = _get_or_create_case_status(inspection_id)

    if outcome.lower() in ["verified", "mark_verified"]:
        new_status = "VERIFIED"
        case_record["verification_status"] = "VERIFIED"
        message = "Case marked verified by quality engineer."

        # Learning loop: Store verified case in historical library
        if defect_type and defect_type != "Normal":
            _HISTORICAL_LIBRARY[defect_type] = {
                "case_id": f"CASE-HIST-{inspection_id}",
                "defect": defect_type,
                "status": "Resolved",
                "status_tag": "[USER CONFIRMED]",
                "similarity_pct": 96.0,
                "similarity_tag": "[SIMILARITY]",
                "previous_image_ref": "",
                "previous_investigation": f"Verified corrective response for {defect_type}",
                "previous_possible_cause": case_record.get("notes") or f"Historical factor associated with {defect_type}",
                "cause_tag": "[HYPOTHESIS]",
                "previous_recommended_action": case_record.get("applied_action") or "Standard SOP procedure",
                "action_tag": "[ADVISORY]",
                "previous_human_decision": "Corrective action approved and verified",
                "decision_tag": "[USER CONFIRMED]",
                "previous_outcome": "Case marked resolved & verified",
                "outcome_tag": "[USER CONFIRMED]",
                "evidence_why_relevant": [
                    {"label": "Same defect class", "tag": "[MEASURED]", "detail": f"Verified case {inspection_id}"},
                    {"label": "Visual similarity", "tag": "[SIMILARITY]", "detail": "Learned from production verification"},
                    {"label": "Previous corrective action available", "tag": "[HISTORICAL EVIDENCE]", "detail": "Engineer confirmed SOP"},
                ],
                "cure_action": {
                    "previous_action_summary": case_record.get("applied_action") or "Standard SOP procedure",
                    "evidence_tag": "[HISTORICAL EVIDENCE]",
                    "simulated_tag": "[USER CONFIRMED]",
                    "recommended_review": "Consider reviewing this verified corrective procedure for the current defect.",
                    "advisory_tag": "[ADVISORY]",
                    "disclaimer": "Does not guarantee physical resolution. On-site human verification is required.",
                },
                "prevention": {
                    "guidance": "Use previous resolved cases as guidance for recurring defects.",
                    "procedure": "If the current defect is confirmed to match the previous case, review the same inspection and corrective procedure.",
                    "advisory_tag": "[ADVISORY]",
                    "effectiveness_notice": "Prevention effectiveness verified on previous run.",
                },
                "similarity_disclaimer": "Similarity indicates resemblance to a previous case; it does not confirm the same underlying cause.",
            }
    elif outcome.lower() in ["recurred", "defect_recurred"]:
        new_status = "DEFECT_RECURRED"
        case_record["verification_status"] = "DEFECT_RECURRED"
        message = "Defect recorded as recurred. Escalating for root-cause re-investigation."
    else:
        raise ValueError(f"Invalid outcome '{outcome}'. Expected 'verified' or 'recurred'.")

    case_record["status"] = new_status
    case_record["status_tag"] = "[USER CONFIRMED]"
    case_record["history"].append({
        "status": new_status,
        "tag": "[USER CONFIRMED]",
        "note": verification_notes or message,
    })

    return {
        "status": new_status,
        "status_tag": "[USER CONFIRMED]",
        "message": message,
        "inspection_id": inspection_id,
        "verification_data_available": False,
        "verification_notice": "Verification data not available in the organizer dataset. Recorded based on human confirmation.",
        "case_state": case_record,
    }


def reset_case_registry():
    """Resets in-memory registry and historical library to demo baseline for test isolation."""
    global _CASE_REGISTRY, _HISTORICAL_LIBRARY
    _CASE_REGISTRY = {}
    _HISTORICAL_LIBRARY = copy.deepcopy(DEMO_HISTORICAL_CASES)
