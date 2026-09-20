"""
ForgeMind AI — Factory Assistant Engine
Dual-Category Conversational Intelligence for Manufacturing Quality Operations:
- Category A: Normal Conversation (Greetings, manufacturing concepts, CNC, throughput, Grad-CAM, page usage)
- Category B: ForgeMind Inspection Conversation (Contextual defect Q&A, hypotheses, similar cases, approvals)

Strict Epistemic Guardrails:
- Refuses to hallucinate machine parameters (RPM, feed rate, pressure, tolerance) when unverified in documents.
- Uses Gemini 2.5 Flash with robust prompt engineering and verified deterministic fallback.
- Never fabricates currency losses or automatic machine repair claims.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from scripts.ml.knowledge_retriever import retrieve_unified_knowledge

log = logging.getLogger("forgemind.factory_assistant")


class AssistantMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class FactoryAssistantChatResponse(BaseModel):
    reply: str
    evidence: str = ""
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    provenance_tags: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    is_fallback: bool = False


# Common parameter patterns to protect against unverified hallucination
UNVERIFIED_MACHINE_PARAM_KEYWORDS = [
    "what rpm", "spindle rpm", "what feed rate", "feed speed",
    "clamping pressure bar", "hydraulic pressure psi", "exact temperature limit",
    "machine tolerance limit", "feed per tooth"
]


def _build_deterministic_assistant_reply(
    message: str,
    defect: Optional[str] = None,
    inspection_context: Optional[Dict[str, Any]] = None,
    retrieved: Optional[Dict[str, Any]] = None,
) -> FactoryAssistantChatResponse:
    """
    Deterministic rule-based response engine.
    Guarantees that the assistant always responds even if Gemini API is unreachable or offline.
    """
    lower = message.lower().strip()
    tags = ["[ADVISORY]"]
    suggested = []
    sources = retrieved.get("sources", []) if retrieved else []

    # Check for unverified machine parameters first
    for kw in UNVERIFIED_MACHINE_PARAM_KEYWORDS:
        if kw in lower:
            return FactoryAssistantChatResponse(
                reply="I don't have verified information about that machine parameter in the available knowledge base. Please consult the OEM machine maintenance manual or plant electrical/mechanical specifications before making physical parameter changes.",
                evidence="Verified machine parameter documents are not loaded in the active knowledge base.",
                sources=sources[:1],
                provenance_tags=["[ADVISORY]", "[UNCERTAIN]"],
                suggested_actions=[
                    "Check OEM machine manual",
                    "Contact plant maintenance lead",
                    "Review SOP documentation"
                ],
                is_fallback=True,
            )

    # 1. Greetings
    if lower in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon"]:
        return FactoryAssistantChatResponse(
            reply="Hello! I am the ForgeMind Factory Assistant. I can help you interpret inspection results, understand manufacturing concepts (like CNC, throughput, and takt time), review historical cases, and navigate the Cure & Prevention workflow. How can I assist your shift today?",
            evidence="General system capability overview.",
            sources=sources[:1],
            provenance_tags=["[ADVISORY]"],
            suggested_actions=[
                "Explain current defect inspection",
                "What is Grad-CAM explainability?",
                "How does Cure & Prevention work?"
            ],
            is_fallback=True,
        )

    # 2. What can you do?
    if "what can you do" in lower or "who are you" in lower or "help" == lower:
        return FactoryAssistantChatResponse(
            reply="I am your industrial visual quality co-pilot. I can:\n• Explain visual defect classifications (Crack, Hole, Rust, Scratch, Normal) and model confidence.\n• Clarify Grad-CAM coarse attention areas without claiming exact pixel bounding boxes.\n• Retrieve engineering failure hypotheses from FMEA guides.\n• Guide human-in-the-loop SOP approvals and prevention verification.\n• Answer shop-floor manufacturing questions (throughput, takt time, CNC, OEE).",
            evidence="Authoritative project knowledge (FORGEMIND_AI_KNOWLEDGE.md).",
            sources=sources[:1],
            provenance_tags=["[SPECIFICATION]"],
            suggested_actions=[
                "How do I use this page?",
                "Explain model confidence",
                "Show similar previous cases"
            ],
            is_fallback=True,
        )

    # 3. CNC machine definition
    if "cnc" in lower or "what is a cnc" in lower:
        return FactoryAssistantChatResponse(
            reply="A CNC (Computer Numerical Control) machine is an automated manufacturing tool that executes pre-programmed sequential machining operations (milling, turning, drilling) with high precision using G-code instructions. In ForgeMind, machining parameters and tool wear are evaluated during FMEA investigations when surface scratches or stress cracks are detected.",
            evidence="Manufacturing terminology standard.",
            sources=[],
            provenance_tags=["[SPECIFICATION]"],
            suggested_actions=["What causes mechanical tool cracks?", "Explain spindle feed rate impact"],
            is_fallback=True,
        )

    # 4. Throughput definition
    if "throughput" in lower:
        return FactoryAssistantChatResponse(
            reply="Throughput is the rate at which a production system generates finished, non-defective units over a given period (e.g., 200 units/hour). In ForgeMind's simulation module, baseline throughput is compared against alternative operating scenarios to assess the capacity impact of quality defects without fabricating financial loss figures.",
            evidence="Rockwell Arena discrete-event simulation dataset.",
            sources=[],
            provenance_tags=["[CALCULATED]"],
            suggested_actions=["What is takt time?", "How does What-If simulation work?"],
            is_fallback=True,
        )

    # 5. Grad-CAM explanation
    if "grad-cam" in lower or "gradcam" in lower:
        return FactoryAssistantChatResponse(
            reply="Grad-CAM (Gradient-weighted Class Activation Mapping) produces a 2D coarse heat map highlighting the convolutional feature regions that influenced the model's classification. Important: Grad-CAM represents an approximate attention region, NOT an exact coordinate bounding box or pixel segmentation. ForgeMind does not generate artificial coordinate boxes.",
            evidence="EfficientNet-B0 final layer features[8] gradient activations.",
            sources=sources[:1],
            provenance_tags=["[MODEL]", "[SPECIFICATION]"],
            suggested_actions=["Why are exact coordinates not shown?", "Explain visual confidence"],
            is_fallback=True,
        )

    # 6. Inspection context-specific questions (e.g. "Why did this happen?")
    active_defect = defect or (inspection_context.get("defect") if inspection_context else None)
    if active_defect and active_defect != "Normal":
        clean_d = active_defect.capitalize()
        causes_map = {
            "Rust": "surface oxidation from diluted water-soluble coolant (pH < 8.8) or insufficient hot-air drying knife dwell time in the wash stage.",
            "Crack": "mechanical tool chatter from worn cutting inserts or thermal shock from uneven quench/coolant spray nozzle delivery.",
            "Scratch": "abrasion against conveyor guide rails without polyurethane padding or metallic chips (swarf) trapped under fixture clamps.",
            "Hole": "air entrainment during die-casting cavity fill or trapped gas voids from insufficient crucible argon degassing dwell time.",
        }
        cause_desc = causes_map.get(clean_d, "mechanical or process irregularities on the machining line.")

        return FactoryAssistantChatResponse(
            reply=f"For this {clean_d} inspection (confidence {inspection_context.get('confidence', 95.0) if inspection_context else 95.0}% [MODEL]), engineering technical references suggest potential contributing factors including {cause_desc} Note that these are engineering hypotheses requiring on-site verification, not confirmed root causes.",
            evidence=f"Retrieved from FMEA technical guidance for {clean_d}.",
            sources=sources[:2],
            provenance_tags=["[HYPOTHESIS]", "[ADVISORY]", "[HISTORICAL EVIDENCE]"],
            suggested_actions=[
                f"Show similar historical cases for {clean_d}",
                "Why is this cause only a hypothesis?",
                "What SOP action is recommended?"
            ],
            is_fallback=True,
        )

    # Generic fallback
    return FactoryAssistantChatResponse(
        reply="I understand your question regarding industrial quality operations. I can assist you with understanding detected defects, exploring similar historical resolutions, or explaining manufacturing metrics. Could you specify if you are asking about the current inspection specimen or general shop-floor procedures?",
        evidence="Factory assistant general operational prompt.",
        sources=sources[:1],
        provenance_tags=["[ADVISORY]"],
        suggested_actions=[
            "Explain current inspection",
            "What is Cure & Prevention?",
            "What is takt time vs throughput?"
        ],
        is_fallback=True,
    )


def chat_with_factory_assistant(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    inspection_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Main entry point for Factory Assistant conversation.
    1. Checks unverified machine parameter guardrail.
    2. Retrieves multi-source knowledge (project docs, FMEA guides, historical cases, inspection context).
    3. Invokes Gemini 2.5 Flash with strict grounding instructions.
    4. Falls back gracefully to deterministic guidance if API key is missing or call fails.
    """
    history = history or []
    lower_msg = message.lower().strip()

    # Determine defect class from inspection context if available
    defect_class = None
    if inspection_context and inspection_context.get("defect"):
        defect_class = inspection_context.get("defect")

    # Guardrail: Check for unverified machine parameters
    for kw in UNVERIFIED_MACHINE_PARAM_KEYWORDS:
        if kw in lower_msg:
            resp = _build_deterministic_assistant_reply(
                message=message,
                defect=defect_class,
                inspection_context=inspection_context,
            )
            return resp.model_dump()

    # Step 1: Multi-source RAG retrieval
    retrieved = retrieve_unified_knowledge(
        query=message,
        defect_class=defect_class,
        inspection_context=inspection_context,
    )

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            try:
                model = genai.GenerativeModel("gemini-2.5-flash")
            except Exception:
                model = genai.GenerativeModel("gemini-flash-latest")

            # Format retrieved sources into prompt
            sources_text = "\n\n".join([
                f"[{item['source_type']}] Doc ID: {item['doc_id']} | Title: {item['source_name']}\nSection: {item['section']}\nProvenance Tag: {item['provenance_tag']}\nContent: {item['content']}"
                for item in retrieved["sources"]
            ])

            # Format conversation history
            hist_text = ""
            if history:
                hist_lines = []
                for h in history[-4:]:  # last 4 turns
                    r = "User" if h.get("role") == "user" else "Assistant"
                    hist_lines.append(f"{r}: {h.get('content')}")
                hist_text = "RECENT CONVERSATION HISTORY:\n" + "\n".join(hist_lines)

            # Format inspection context
            ctx_str = ""
            if inspection_context:
                ctx_str = f"""
ACTIVE INSPECTION SPECIMEN CONTEXT:
- Inspection ID: {inspection_context.get('inspection_id', 'FM-CURRENT')}
- Classified Defect: {inspection_context.get('defect', 'Unknown')} [MEASURED]
- Vision Confidence: {inspection_context.get('confidence', 0.0)}% [MODEL] (Classifier certainty only; not similarity or root cause)
- Grad-CAM Attention: {inspection_context.get('gradcam_available', False)} (Coarse attention region only; no exact bounding boxes)
- Active Workflow Status: {inspection_context.get('active_case_status', 'NEW')} [USER CONFIRMED]
- Selected Economic Impact: {inspection_context.get('economic_impact', 'Not assessed')} [SIMULATED] (User-selected tier; no fake financial numbers)
- Recommended SOP Action: {inspection_context.get('recommended_action', 'Review technical guidance')}
"""

            prompt = f"""
You are the ForgeMind Factory Assistant, an expert industrial quality and manufacturing decision-support co-pilot.
Your tone is professional, helpful, concise, and grounded in engineering facts.

{ctx_str}

RETRIEVED KNOWLEDGE SOURCES:
{sources_text if sources_text else "No specific documents retrieved for this query."}

{hist_text}

USER INQUIRY:
{message}

STRICT BEHAVIORAL & EPISTEMIC CONSTRAINTS:
1. For NORMAL questions (greetings, 'what is CNC', 'what is throughput', 'explain Grad-CAM'):
   Answer naturally, concisely (2-4 sentences), and simply.
2. For INSPECTION questions ('why did this happen', 'show similar cases', 'what action should I take'):
   Ground your answer directly in the active inspection context and retrieved technical FMEA documents.
   Always label potential causes as hypotheses: '[HYPOTHESIS]'. Never claim 'Confirmed root cause' unless verified by on-site records.
3. Grad-CAM is an approximate coarse attention visualization only. Clarify that Grad-CAM produces coarse heatmaps rather than bounding boxes, and NEVER claim exact coordinates or bounding boxes.
4. ForgeMind is an advisory decision-support system. NEVER claim that ForgeMind physically repairs machines or acts autonomously.
5. If the user asks for specific unverified machine parameters (e.g. RPM, feed speed, pressure, temperature limit) not found in the retrieved documents, state clearly:
   "I don't have verified information about that machine parameter in the available knowledge base."
6. Output valid JSON adhering to this schema:
{{
  "reply": "Clear, concise direct answer to the user",
  "evidence": "Brief summary of evidence or source rationale",
  "provenance_tags": ["[SPECIFICATION]", "[HYPOTHESIS]", "[ADVISORY]", "[MODEL]", "[HISTORICAL EVIDENCE]"],
  "suggested_actions": ["Follow-up question 1", "Follow-up question 2"]
}}
"""
            try:
                gen_resp = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
            except Exception:
                gen_resp = model.generate_content(prompt)

            raw = gen_resp.text.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

            parsed = json.loads(raw)
            tags = parsed.get("provenance_tags", ["[ADVISORY]"])
            if not isinstance(tags, list):
                tags = [str(tags)]

            result = FactoryAssistantChatResponse(
                reply=parsed.get("reply", "I have processed your request based on retrieved engineering guidance."),
                evidence=parsed.get("evidence", ""),
                sources=retrieved.get("sources", []),
                provenance_tags=tags,
                suggested_actions=parsed.get("suggested_actions", []),
                is_fallback=False,
            )
            return result.model_dump()

        except Exception as err:
            log.warning("Factory Assistant Gemini call error: %s. Engaging deterministic fallback.", err)

    # Step 3: Deterministic fallback
    fallback_resp = _build_deterministic_assistant_reply(
        message=message,
        defect=defect_class,
        inspection_context=inspection_context,
        retrieved=retrieved,
    )
    return fallback_resp.model_dump()
