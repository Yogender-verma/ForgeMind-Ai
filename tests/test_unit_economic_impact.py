"""
Tests for ForgeMind AI — Simulated User-Selected Economic Impact Engine.
Covers all 14 required test cases:
1. Default state = Not assessed
2. User can select Low
3. Low = 5% [SIMULATED]
4. User can select Medium
5. Medium = 10% [SIMULATED]
6. User can select High
7. High = 20% [SIMULATED]
8. No monetary values generated (no ₹, cost, loss)
9. Vision confidence is never used in calculation
10. User selection is independent of model confidence
11. No Factory ERP claim exists
12. No fabricated financial values exist
13. Correct [SIMULATED] labels are displayed
14. What-If scenarios do not generate fake ₹ losses
"""

import pytest
from scripts.forgemind.economic_engine import (
    get_simulated_economic_impact,
    get_simulated_what_if_scenarios,
    SIMULATED_IMPACT_MAP,
)


# 1. Default state = Not assessed
def test_default_state_not_assessed():
    """Verify default state before user selection is 'not_assessed' with 'Not assessed' impact."""
    res = get_simulated_economic_impact(impact_level=None)
    assert res["status"] == "not_assessed"
    assert res["impact_level"] is None
    assert res["simulated_impact_pct"] is None
    assert res["formatted_impact"] == "Not assessed"
    assert res["evidence_tag"] == "[SIMULATED]"


# 2. User can select Low
def test_user_can_select_low():
    """Verify user selection of LOW is accepted and recorded."""
    res = get_simulated_economic_impact(impact_level="low")
    assert res["impact_level"] == "LOW"
    assert res["status"] == "assessed"


# 3. Low = 5% [SIMULATED]
def test_low_is_5_percent_simulated():
    """Verify LOW maps to exactly 5% [SIMULATED]."""
    res = get_simulated_economic_impact(impact_level="LOW")
    assert res["simulated_impact_pct"] == 5.0
    assert res["formatted_impact"] == "5%"
    assert res["evidence_tag"] == "[SIMULATED]"


# 4. User can select Medium
def test_user_can_select_medium():
    """Verify user selection of MEDIUM is accepted and recorded."""
    res = get_simulated_economic_impact(impact_level="medium")
    assert res["impact_level"] == "MEDIUM"
    assert res["status"] == "assessed"


# 5. Medium = 10% [SIMULATED]
def test_medium_is_10_percent_simulated():
    """Verify MEDIUM maps to exactly 10% [SIMULATED]."""
    res = get_simulated_economic_impact(impact_level="MEDIUM")
    assert res["simulated_impact_pct"] == 10.0
    assert res["formatted_impact"] == "10%"
    assert res["evidence_tag"] == "[SIMULATED]"


# 6. User can select High
def test_user_can_select_high():
    """Verify user selection of HIGH is accepted and recorded."""
    res = get_simulated_economic_impact(impact_level="high")
    assert res["impact_level"] == "HIGH"
    assert res["status"] == "assessed"


# 7. High = 20% [SIMULATED]
def test_high_is_20_percent_simulated():
    """Verify HIGH maps to exactly 20% [SIMULATED]."""
    res = get_simulated_economic_impact(impact_level="HIGH")
    assert res["simulated_impact_pct"] == 20.0
    assert res["formatted_impact"] == "20%"
    assert res["evidence_tag"] == "[SIMULATED]"


# 8. No monetary values generated (no ₹, cost, loss)
def test_no_monetary_values_generated():
    """Verify no monetary keys or currency symbols (₹, INR, USD, loss, cost) are generated."""
    res = get_simulated_economic_impact(impact_level="MEDIUM")
    for key, val in res.items():
        assert "₹" not in str(val), f"Currency symbol ₹ found in {key}: {val}"
        assert "INR" not in str(val), f"Currency code INR found in {key}: {val}"
    # Verify monetary loss/cost fields are absent
    forbidden_keys = [
        "manufacturing_cost", "rework_cost", "scrap_cost", "downtime_cost",
        "estimated_loss", "total_loss", "currency", "currency_symbol"
    ]
    for k in forbidden_keys:
        assert k not in res, f"Forbidden monetary key {k} present in result"


# 9. Vision confidence is never used in calculation
def test_vision_confidence_never_used_in_calculation():
    """Verify that changing vision confidence never alters the simulated economic impact percentage."""
    confidences = [12.5, 50.0, 75.3, 99.9]
    for conf in confidences:
        res_low = get_simulated_economic_impact(impact_level="LOW", vision_confidence=conf)
        assert res_low["simulated_impact_pct"] == 5.0
        assert res_low["formatted_impact"] == "5%"

        res_med = get_simulated_economic_impact(impact_level="MEDIUM", vision_confidence=conf)
        assert res_med["simulated_impact_pct"] == 10.0
        assert res_med["formatted_impact"] == "10%"

        res_high = get_simulated_economic_impact(impact_level="HIGH", vision_confidence=conf)
        assert res_high["simulated_impact_pct"] == 20.0
        assert res_high["formatted_impact"] == "20%"


# 10. User selection is independent of model confidence
def test_user_selection_independent_of_model_confidence():
    """Verify high confidence can be LOW impact and low confidence can be HIGH impact."""
    res_a = get_simulated_economic_impact(impact_level="LOW", vision_confidence=99.9)
    assert res_a["impact_level"] == "LOW"
    assert res_a["simulated_impact_pct"] == 5.0
    assert res_a["vision_confidence"] == 99.9

    res_b = get_simulated_economic_impact(impact_level="HIGH", vision_confidence=15.0)
    assert res_b["impact_level"] == "HIGH"
    assert res_b["simulated_impact_pct"] == 20.0
    assert res_b["vision_confidence"] == 15.0


# 11. No Factory ERP claim exists
def test_no_factory_erp_claim():
    """Verify result does not claim measured Factory ERP source. Tag must be [SIMULATED]."""
    res = get_simulated_economic_impact(impact_level="HIGH")
    assert res["evidence_tag"] == "[SIMULATED]"
    assert "MEASURED" not in res["evidence_tag"]
    assert "ERP" not in res.get("input_tag", "")


# 12. No fabricated financial values exist
def test_no_fabricated_financial_values():
    """Verify mandatory disclosure explaining that no financial records exist in the dataset."""
    res = get_simulated_economic_impact(impact_level="MEDIUM")
    assert "Demo impact score only" in res["disclosure"]
    assert "does not contain product cost" in res["disclosure"]
    assert "not an actual monetary loss" in res["disclosure"]
    assert "Future Factory Integration" in res["future_integration_note"]


# 13. Correct [SIMULATED] labels are displayed
def test_correct_simulated_labels_displayed():
    """Verify evidence_tag is [SIMULATED] and optional user reason gets [USER INPUT]."""
    res_no_reason = get_simulated_economic_impact(impact_level="LOW")
    assert res_no_reason["evidence_tag"] == "[SIMULATED]"
    assert res_no_reason["reason_tag"] is None

    res_with_reason = get_simulated_economic_impact(
        impact_level="LOW",
        user_reason="Critical customer delivery"
    )
    assert res_with_reason["evidence_tag"] == "[SIMULATED]"
    assert res_with_reason["user_reason"] == "Critical customer delivery"
    assert res_with_reason["reason_tag"] == "[USER INPUT]"


# 14. What-If scenarios do not generate fake ₹ losses
def test_what_if_scenarios_do_not_generate_fake_rupee_losses():
    """Verify What-If comparison outputs scenarios A (5%), B (10%), C (20%) without currency symbols or fake costs."""
    what_if = get_simulated_what_if_scenarios()
    assert what_if["evidence_tag"] == "[SIMULATED]"
    assert len(what_if["scenarios"]) == 3

    scenario_map = {s["impact_level"]: s for s in what_if["scenarios"]}
    assert scenario_map["LOW"]["simulated_impact_pct"] == 5.0
    assert scenario_map["LOW"]["formatted_impact"] == "5%"

    assert scenario_map["MEDIUM"]["simulated_impact_pct"] == 10.0
    assert scenario_map["MEDIUM"]["formatted_impact"] == "10%"

    assert scenario_map["HIGH"]["simulated_impact_pct"] == 20.0
    assert scenario_map["HIGH"]["formatted_impact"] == "20%"

    # Check for absence of currency symbols
    what_if_str = str(what_if)
    assert "₹" not in what_if_str
    assert "INR" not in what_if_str


# 15. Defect Cured Net Profit Recovery
def test_defect_cured_net_profit_recovery():
    """Verify that when a defect is cured, it computes avoided loss, treatment overhead, and net profit recovery."""
    res_med_cured = get_simulated_economic_impact(impact_level="MEDIUM", treatment_status="cured")
    assert res_med_cured["before_treatment_loss_pct"] == 10.0
    assert res_med_cured["formatted_before_treatment_loss"] == "-10%"
    assert res_med_cured["treatment_overhead_pct"] == 2.0
    assert res_med_cured["after_treatment_profit_pct"] == 8.0
    assert res_med_cured["formatted_after_treatment_profit"] == "+8%"
    assert res_med_cured["formatted_impact"] == "+8%"
    assert res_med_cured["treatment_status"] == "cured"

    res_low_cured = get_simulated_economic_impact(impact_level="LOW", treatment_status="cured")
    assert res_low_cured["before_treatment_loss_pct"] == 5.0
    assert res_low_cured["after_treatment_profit_pct"] == 4.0
    assert res_low_cured["formatted_impact"] == "+4%"

    res_high_cured = get_simulated_economic_impact(impact_level="HIGH", treatment_status="cured")
    assert res_high_cured["before_treatment_loss_pct"] == 20.0
    assert res_high_cured["after_treatment_profit_pct"] == 16.0
    assert res_high_cured["formatted_impact"] == "+16%"


# 16. Treatment status toggle between untreated and cured
def test_treatment_status_toggle():
    """Verify toggling treatment status switches between untreated loss display and cured profit display."""
    res_untreated = get_simulated_economic_impact(impact_level="MEDIUM", treatment_status="untreated")
    assert res_untreated["treatment_status"] == "untreated"
    assert res_untreated["formatted_impact"] == "10%"
    assert res_untreated["before_treatment_loss_pct"] == 10.0
    assert res_untreated["after_treatment_profit_pct"] == 8.0

    res_cured = get_simulated_economic_impact(impact_level="MEDIUM", treatment_status="cured")
    assert res_cured["treatment_status"] == "cured"
    assert res_cured["formatted_impact"] == "+8%"


# 17. What-If pathways: 4 alternative ways available
def test_what_if_pathways_count_and_content():
    """Verify What-If simulator provides 4 alternative treatment ways with no currency symbols."""
    what_if = get_simulated_what_if_scenarios(defect_type="Scratch")
    assert what_if["total_ways_available"] == 4
    assert len(what_if["pathways"]) == 4

    way_ids = [p["pathway_id"] for p in what_if["pathways"]]
    assert way_ids == ["WAY-1", "WAY-2", "WAY-3", "WAY-4"]

    recommended = [p for p in what_if["pathways"] if p["is_recommended"]]
    assert len(recommended) == 1
    assert recommended[0]["pathway_id"] == "WAY-1"
    assert recommended[0]["net_profit_recovery_pct"] == 8.5
    assert "₹" not in str(what_if["pathways"])


# 18. What-If decision rationale: Why we choose this way
def test_what_if_why_we_choose_this_way_rationale():
    """Verify What-If provides explicit engineering rationale explaining why Way 1 is chosen."""
    what_if = get_simulated_what_if_scenarios(defect_type="Scratch")
    rationale = what_if["why_we_choose_this_way"]
    assert rationale is not None
    assert rationale["recommended_pathway_id"] == "WAY-1"
    assert "Way 1" in rationale["recommended_pathway_name"]
    assert len(rationale["key_reasons"]) >= 4
    assert "summary" in rationale
    assert "Scratch" in rationale["defect_type"]

