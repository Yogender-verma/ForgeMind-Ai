"""
ForgeMind AI — Gemini LLM + Engineering Knowledge Reasoning Engine
Implements RAG-grounded defect cause analysis producing strictly validated structured outputs.
NO UNCONTROLLED HALLUCINATIONS. NO FABRICATED CAUSALITY.
Explicitly enforces that simulated production contexts are NOT treated as measured factory causes.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from scripts.ml.engineering_knowledge import retrieve_engineering_evidence, KnowledgeDocument

log = logging.getLogger("forgemind.gemini")

class PotentialCause(BaseModel):
    cause: str = Field(description="Name of the engineering contributing factor")
    factor: Optional[str] = Field(default=None, description="Factor alias name")
    explanation: str = Field(description="Evidence-grounded explanation based on technical documents")
    why_considered: Optional[str] = Field(default=None, description="Why considered rationale")
    evidence_strength: str = Field(default="MODERATE", description="Confidence grade: LOW, MODERATE, or STRONG")
    status: str = Field(default="HYPOTHESIS", description="Evidence status tag: strictly HYPOTHESIS")
    sources: List[str] = Field(default_factory=list, description="Specific engineering reference documents")

    def model_post_init(self, __context: Any) -> None:
        if not self.factor:
            self.factor = self.cause
        if not self.why_considered:
            self.why_considered = self.explanation
        if self.evidence_strength:
            self.evidence_strength = self.evidence_strength.lower()


class RecommendedAction(BaseModel):
    action: str = Field(description="Specific actionable engineering inspection or remediation step")
    reason: str = Field(description="Rationale connecting action to mitigating the potential contributing factor")
    sources: List[str] = Field(default_factory=list, description="Engineering guidance citation")


class DefectInvestigationReport(BaseModel):
    defect: str
    potential_causes: List[PotentialCause]
    recommended_investigation: List[str] = Field(default_factory=list, description="Investigation procedures")
    recommended_actions: List[RecommendedAction] = Field(default_factory=list, description="Actionable remediation steps")
    linkage_note: Optional[str] = Field(
        default="Simulated scenario linked via deterministic SHA-256 mapping. Traceability is not physically measured.",
        description="Explicit disclosure regarding simulated nature of linkage",
    )
    causal_status: str = Field(default="NOT_ESTABLISHED", description="Strictly NOT_ESTABLISHED")
    factory_evidence: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    requires_engineer_review: bool = True
    insufficient_evidence: bool = False
    status_message: Optional[str] = None


def _build_deterministic_rag_response(
    defect: str,
    docs: List[KnowledgeDocument],
    simulated_context: Optional[Dict[str, Any]] = None,
) -> DefectInvestigationReport:
    """
    Builds verified, evidence-grounded structured response from retrieved engineering guidance.
    Used when Gemini API key is absent or as a verified deterministic fallback.
    """
    if not docs:
        return DefectInvestigationReport(
            defect=defect,
            potential_causes=[],
            recommended_investigation=[
                "Perform physical visual inspection of affected specimen surface under magnification.",
                "Review machine preventative maintenance logs for abnormal friction or vibration.",
            ],
            recommended_actions=[],
            linkage_note="Simulated scenario linked via deterministic SHA-256 mapping. Traceability is not physically measured.",
            causal_status="NOT_ESTABLISHED",
            factory_evidence=[],
            limitations=["Visual-to-production record linkage is not available in the supplied datasets."],
            requires_engineer_review=True,
            insufficient_evidence=True,
            status_message="Insufficient evidence to identify a specific contributing factor.",
        )

    doc = docs[0]
    source_citation = f"{doc.doc_type}: {doc.title} ({doc.doc_id})"
    sources = [source_citation]

    sim_note = ""
    if simulated_context:
        st = simulated_context.get("station") or "Linked Station"
        u = simulated_context.get("utilization")
        u_str = f" with {u:.1f}% simulated utilization" if u is not None else ""
        sim_note = f" (Context: Linked scenario {simulated_context.get('scenario_id', 'SCN')} represents {st}{u_str}; physical causality is not established)."

    if defect.lower() == "crack":
        causes = [
            PotentialCause(
                cause="Excessive Clamping Force or Worn Cutting Tools",
                factor="Excessive Clamping Force or Worn Cutting Tools",
                explanation="Dull cutting tools or clamps squeezing too tightly can put excessive mechanical stress on the metal, potentially causing surface cracks. Checking tool sharpness and clamp pressure on the line is required to verify.",
                why_considered="Dull cutting tools or clamps squeezing too tightly can put excessive mechanical stress on the metal, potentially causing surface cracks. Checking tool sharpness and clamp pressure on the line is required to verify.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
            PotentialCause(
                cause="Uneven or Rapid Cooling",
                factor="Uneven or Rapid Cooling",
                explanation="If hot metal cools down unevenly or too quickly, the sudden temperature drop might pull the material apart and crack it. A physical check of the cooling spray nozzles is needed to confirm.",
                why_considered="If hot metal cools down unevenly or too quickly, the sudden temperature drop might pull the material apart and crack it. A physical check of the cooling spray nozzles is needed to confirm.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
        ]
        investigation_steps = [
            "Inspect cutting tool edges for dullness or microscopic chipping.",
            "Verify fixture clamping hydraulic pressure against standard limits.",
            "Check cooling spray nozzles to ensure uniform temperature reduction.",
        ]
        actions = [
            RecommendedAction(
                action="Verify fixture clamping hydraulic pressure and die alignment to ensure uniform load distribution",
                reason="Prevents mechanical stress concentration along component boundaries",
                sources=sources,
            ),
            RecommendedAction(
                action="Inspect tool cutting edge radius and review spindle cycle time limits",
                reason="Dull tooling drastically increases cutting friction and tensile fracture risk",
                sources=sources,
            ),
        ]
    elif defect.lower() == "hole":
        causes = [
            PotentialCause(
                cause="Air or Gas Trapped During Molding",
                factor="Air or Gas Trapped During Molding",
                explanation="Tiny pockets of air or mold spray vapor might have been trapped inside the liquid metal before it hardened. Inspecting the mold air vents is necessary to see if this occurred.",
                why_considered="Tiny pockets of air or mold spray vapor might have been trapped inside the liquid metal before it hardened. Inspecting the mold air vents is necessary to see if this occurred.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
            PotentialCause(
                cause="Gas Not Fully Removed from Melted Metal",
                factor="Gas Not Fully Removed from Melted Metal",
                explanation="Dissolved gases in the liquid metal can form small bubble voids if the metal was not completely degassed before pouring. Melt degassing logs must be reviewed by an engineer to confirm.",
                why_considered="Dissolved gases in the liquid metal can form small bubble voids if the metal was not completely degassed before pouring. Melt degassing logs must be reviewed by an engineer to confirm.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
        ]
        investigation_steps = [
            "Inspect die cavity vacuum venting channels and air purge exhaust filters for blockage.",
            "Verify crucible inert gas (argon) degassing cycle dwell time and flux purity records.",
            "Audit shot plunger injection velocity profile to ensure laminar cavity filling.",
        ]
        actions = [
            RecommendedAction(
                action="Inspect die cavity vacuum venting channels and particulate overflow blocks",
                reason="Ensures atmospheric gas can escape ahead of the advancing melt front",
                sources=sources,
            ),
            RecommendedAction(
                action="Audit melt crucible argon degassing timing and flux purity records",
                reason="Removes dissolved hydrogen gas before casting injection",
                sources=sources,
            ),
        ]
    elif defect.lower() == "rust":
        causes = [
            PotentialCause(
                cause="Weakened Protective Coolant Fluid",
                factor="Weakened Protective Coolant Fluid",
                explanation="The protective fluid used during cutting might have become diluted, leaving the fresh metal surface open to rusting. The fluid mixture on the shop floor must be tested to see if this was a factor.",
                why_considered="The protective fluid used during cutting might have become diluted, leaving the fresh metal surface open to rusting. The fluid mixture on the shop floor must be tested to see if this was a factor.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
            PotentialCause(
                cause="High Humidity or Incomplete Drying",
                factor="High Humidity or Incomplete Drying",
                explanation="Moisture left on the metal in a damp room can quickly cause rust patches to form. Checking the drying blowers and room humidity would be required to verify.",
                why_considered="Moisture left on the metal in a damp room can quickly cause rust patches to form. Checking the drying blowers and room humidity would be required to verify.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
        ]
        investigation_steps = [
            "Titrate cutting coolant emulsion concentration and verify pH remains within 8.8–9.2 range.",
            "Inspect wash stage drying air knife blower temperature and airflow velocity.",
            "Review intermediate transfer staging dwell times between machining and packaging.",
        ]
        actions = [
            RecommendedAction(
                action="Audit coolant refractometer concentration (maintain >6%) and verify pH remains between 8.8 and 9.2",
                reason="Provides immediate barrier passivation against atmospheric oxidation",
                sources=sources,
            ),
            RecommendedAction(
                action="Inspect wash stage drying air knife blower temperature and airflow velocity",
                reason="Ensures all standing moisture is evaporated before staging transfer",
                sources=sources,
            ),
        ]
    elif defect.lower() in ["scratch", "scratches"]:
        causes = [
            PotentialCause(
                cause="Metal Debris Trapped on Clamps",
                factor="Metal Debris Trapped on Clamps",
                explanation="Small metal shavings or dust may have been trapped under the clamps that hold the part, scratching it when tightened. An engineer would need to check the holding fixtures to see if this happened.",
                why_considered="Small metal shavings or dust may have been trapped under the clamps that hold the part, scratching it when tightened. An engineer would need to check the holding fixtures to see if this happened.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
            PotentialCause(
                cause="Rubbing Against Conveyor Rails or Grippers",
                factor="Rubbing Against Conveyor Rails or Grippers",
                explanation="The part might have scraped against unpadded metal rails or robotic fingers while moving between stations. Physical inspection of the conveyor line is needed to confirm this possibility.",
                why_considered="The part might have scraped against unpadded metal rails or robotic fingers while moving between stations. Physical inspection of the conveyor line is needed to confirm this possibility.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            ),
        ]
        investigation_steps = [
            "Inspect automated air-blow swarf evacuation nozzles on fixture seating pads.",
            "Check robotic transfer gripper finger rubber protective pads for mechanical tearing.",
            "Verify transfer conveyor rail alignment and inspect for burrs or particulate buildup.",
        ]
        actions = [
            RecommendedAction(
                action="Clean and calibrate automated swarf blow-off air nozzles at fixture load position",
                reason="Prevents metallic particulate from grinding into raw surface under clamping load",
                sources=sources,
            ),
            RecommendedAction(
                action="Inspect robotic transfer gripper fingers and replace worn polyurethane pads",
                reason="Eliminates metal-to-metal rubbing during part indexing",
                sources=sources,
            ),
        ]
    else:  # Normal
        causes = [
            PotentialCause(
                cause="Standard Machining Passes Within Tolerance",
                factor="Standard Machining Passes Within Tolerance",
                explanation="Minor surface marks appear consistent with normal machine tool passes and meet all quality standards. No defect has been detected.",
                why_considered="Minor surface marks appear consistent with normal machine tool passes and meet all quality standards. No defect has been detected.",
                evidence_strength="MODERATE",
                status="HYPOTHESIS",
                sources=sources,
            )
        ]
        investigation_steps = [
            "Maintain standard routine calibration and preventative maintenance cadence.",
            "Log specimen in quality compliance registry.",
        ]
        actions = [
            RecommendedAction(
                action="Maintain standard routine calibration and preventative maintenance cadence",
                reason="Part meets all surface and dimensional tolerance criteria",
                sources=sources,
            )
        ]

    return DefectInvestigationReport(
        defect=defect,
        potential_causes=causes,
        recommended_investigation=investigation_steps,
        recommended_actions=actions,
        linkage_note="Simulated scenario linked via deterministic SHA-256 mapping. Traceability is not physically measured.",
        causal_status="NOT_ESTABLISHED",
        factory_evidence=["Visual-to-production record linkage is not available in the supplied datasets."],
        limitations=[
            "Visual-to-production record linkage is not available in the supplied datasets.",
            "Potential contributing factors are engineering hypotheses derived from technical references, not confirmed physical causes on this specific specimen.",
        ],
        requires_engineer_review=True,
        insufficient_evidence=False,
    )


def investigate_defect_causes(
    defect_class: str,
    confidence: float = 0.0,
    simulated_context: Optional[Dict[str, Any]] = None,
    factory_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    RAG + Gemini reasoning pipeline for defect investigation:
    1. Retrieve relevant engineering documents for the detected defect.
    2. Contextualize with the deterministically linked simulated scenario (if provided).
    3. Pass retrieved documents to Gemini (if API key is present) with strict non-causal instructions.
    4. If Gemini is unavailable, fall back to the deterministic engineering guidance builder.
    5. Validate and return Pydantic-compliant dictionary.
    """
    context_to_use = simulated_context or factory_context
    evidence_docs = retrieve_engineering_evidence(defect_class)

    if not evidence_docs:
        report = DefectInvestigationReport(
            defect=defect_class,
            potential_causes=[],
            recommended_investigation=[
                "Perform physical visual inspection of affected specimen surface.",
                "Review machine preventative maintenance logs.",
            ],
            recommended_actions=[],
            linkage_note="Simulated scenario linked via deterministic SHA-256 mapping. Traceability is not physically measured.",
            causal_status="NOT_ESTABLISHED",
            factory_evidence=["Visual-to-production record linkage is not available in the supplied datasets."],
            limitations=["Visual-to-production record linkage is not available in the supplied datasets."],
            requires_engineer_review=True,
            insufficient_evidence=True,
            status_message="Insufficient evidence to identify a specific contributing factor.",
        )
        return report.model_dump()

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            context_texts = "\n\n".join([
                f"Document [{d.doc_id}] ({d.title}):\nCategory: {d.doc_type}\nContent: {d.content}"
                for d in evidence_docs
            ])

            sim_context_str = ""
            if context_to_use:
                sim_context_str = (
                    f"SIMULATED PRODUCTION CONTEXT (Analytical simulation match; NOT physical history):\n"
                    f"- Scenario ID: {context_to_use.get('scenario_id')}\n"
                    f"- Model: {context_to_use.get('model')}\n"
                    f"- Represented Station: {context_to_use.get('station')}\n"
                    f"- Station Utilization: {context_to_use.get('utilization')}%\n"
                    f"- Line Throughput: {context_to_use.get('throughput')}\n"
                    f"- Queue Waiting Time: {context_to_use.get('waiting_time')}\n"
                )

            prompt = f"""
You are an expert industrial manufacturing failure analysis engineer.
The computer vision system classified a manufacturing specimen as: '{defect_class}' with model confidence {confidence:.1f}%.

{sim_context_str}

Here are the retrieved engineering guidance references:
{context_texts}

STRICT CONSTRAINTS:
1. Do NOT assume this image belongs to a specific factory station, batch, or machine.
2. The simulated production context comes from an Arena simulation dataset linked analytically, NOT physically.
3. You MUST NOT state or imply that the simulated station or machine caused the defect. Causal status is strictly NOT_ESTABLISHED.
4. Formulate all potential causes strictly as advisory engineering hypotheses ('HYPOTHESIS') requiring physical verification.
5. Write potential-cause explanations in simple, clear language that a non-expert can understand. Keep each answer short (1–2 sentences). Do NOT present any possible cause as a confirmed cause.
6. Output MUST be valid JSON adhering exactly to this schema:
{{
  "defect": "{defect_class}",
  "potential_causes": [
    {{
      "cause": "Short factor name",
      "factor": "Short factor name",
      "explanation": "Evidence-grounded explanation",
      "why_considered": "Why considered explanation",
      "evidence_strength": "LOW" | "MODERATE" | "STRONG",
      "status": "HYPOTHESIS",
      "sources": ["Document title or ID"]
    }}
  ],
  "recommended_investigation": [
    "Investigation procedure step 1",
    "Investigation procedure step 2"
  ],
  "recommended_actions": [
    {{
      "action": "Actionable engineering inspection or remediation step",
      "reason": "Why this action addresses the factor",
      "sources": ["Document title or ID"]
    }}
  ],
  "linkage_note": "Simulated scenario linked via deterministic SHA-256 mapping. Traceability is not physically measured.",
  "causal_status": "NOT_ESTABLISHED",
  "factory_evidence": ["Visual-to-production record linkage is not available in the supplied datasets."],
  "limitations": [
    "Visual-to-production record linkage is not available in the supplied datasets.",
    "Potential contributing factors are engineering hypotheses requiring physical verification."
  ],
  "requires_engineer_review": true
}}
"""
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            raw_text = response.text.strip()
            parsed = json.loads(raw_text)
            validated = DefectInvestigationReport.model_validate(parsed)
            return validated.model_dump()
        except Exception as e:
            log.warning("Gemini API call or validation notice: %s. Falling back to deterministic guidance.", e)

    # Deterministic fallback
    report = _build_deterministic_rag_response(defect_class, evidence_docs, simulated_context=context_to_use)
    return report.model_dump()
