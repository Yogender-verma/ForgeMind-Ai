"""
ForgeMind AI — Multi-Source Knowledge Retrieval Pipeline (RAG)
Separates and indexes 4 distinct knowledge source types:
- SOURCE TYPE 1: ForgeMind project documentation (FORGEMIND_AI_KNOWLEDGE.md)
- SOURCE TYPE 2: Approved engineering documents (data/engineering_knowledge/*.md)
- SOURCE TYPE 3: Historical ForgeMind cases (cure_prevention_engine historical store)
- SOURCE TYPE 4: Current inspection context (specimen runtime metadata)

Preserves exact citations without fabricating non-existent ISO or engineering documents.
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECT_KB_PATH = PROJECT_ROOT / "FORGEMIND_AI_KNOWLEDGE.md"
ENGINEERING_KB_DIR = PROJECT_ROOT / "data" / "engineering_knowledge"

from scripts.ml.engineering_knowledge import retrieve_engineering_evidence, KnowledgeDocument
from scripts.forgemind.cure_prevention_engine import _HISTORICAL_LIBRARY, _CASE_REGISTRY


class RetrievedSourceItem:
    def __init__(
        self,
        source_type: str,
        source_name: str,
        doc_id: str,
        section: str,
        content: str,
        provenance_tag: str,
    ):
        self.source_type = source_type
        self.source_name = source_name
        self.doc_id = doc_id
        self.section = section
        self.content = content
        self.provenance_tag = provenance_tag

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "source_name": self.source_name,
            "doc_id": self.doc_id,
            "section": self.section,
            "content": self.content,
            "provenance_tag": self.provenance_tag,
        }


def _load_project_knowledge_sections() -> List[Dict[str, str]]:
    """Parses FORGEMIND_AI_KNOWLEDGE.md into queryable section chunks."""
    if not PROJECT_KB_PATH.exists():
        return []

    sections = []
    current_title = "Overview"
    current_content = []

    with open(PROJECT_KB_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("## "):
                if current_content:
                    sections.append({
                        "title": current_title.strip(),
                        "content": "\n".join(current_content).strip(),
                    })
                    current_content = []
                current_title = line.replace("## ", "").strip()
            else:
                current_content.append(line)

    if current_content:
        sections.append({
            "title": current_title.strip(),
            "content": "\n".join(current_content).strip(),
        })

    return sections


_PROJECT_SECTIONS_CACHE = _load_project_knowledge_sections()


def search_project_knowledge(query: str, max_results: int = 2) -> List[RetrievedSourceItem]:
    """
    Searches SOURCE TYPE 1 (ForgeMind project documentation).
    Returns relevant section items with provenance [MEASURED / SPECIFICATION].
    """
    global _PROJECT_SECTIONS_CACHE
    if not _PROJECT_SECTIONS_CACHE:
        _PROJECT_SECTIONS_CACHE = _load_project_knowledge_sections()

    q_tokens = set(re.findall(r"\w+", query.lower()))
    if not q_tokens:
        return []

    scored_sections = []
    for sec in _PROJECT_SECTIONS_CACHE:
        sec_text = (sec["title"] + " " + sec["content"]).lower()
        score = sum(1 for t in q_tokens if t in sec_text)
        if score > 0:
            scored_sections.append((score, sec))

    scored_sections.sort(key=lambda x: x[0], reverse=True)
    results = []
    for _, sec in scored_sections[:max_results]:
        results.append(
            RetrievedSourceItem(
                source_type="SOURCE TYPE 1: Project Knowledge",
                source_name="ForgeMind AI Authoritative Project Knowledge (FORGEMIND_AI_KNOWLEDGE.md)",
                doc_id="FORGEMIND-DOC-KB-001",
                section=sec["title"],
                content=sec["content"][:800],
                provenance_tag="[SPECIFICATION]",
            )
        )
    return results


def search_engineering_documents(defect_class: Optional[str], query: str = "") -> List[RetrievedSourceItem]:
    """
    Searches SOURCE TYPE 2 (Approved engineering guidance documents).
    Returns FMEA guidance with [HYPOTHESIS] and [ADVISORY] provenance.
    """
    results = []
    if defect_class:
        docs = retrieve_engineering_evidence(defect_class)
        for d in docs:
            results.append(
                RetrievedSourceItem(
                    source_type="SOURCE TYPE 2: Approved Engineering Document",
                    source_name=d.title,
                    doc_id=d.doc_id,
                    section=f"Failure Analysis Guidance: {d.applicable_defects}",
                    content=d.content[:800],
                    provenance_tag="[HYPOTHESIS]",
                )
            )
    return results


def search_historical_cases(defect_class: Optional[str]) -> List[RetrievedSourceItem]:
    """
    Searches SOURCE TYPE 3 (Historical ForgeMind cases).
    Returns similar resolved or verified cases.
    """
    results = []
    if not defect_class:
        return results

    clean_defect = defect_class.strip().capitalize()
    if clean_defect in _HISTORICAL_LIBRARY:
        case = _HISTORICAL_LIBRARY[clean_defect]
        content_summary = (
            f"Previous Case ID: {case['case_id']} (Status: {case['status']} {case['status_tag']})\n"
            f"Similarity: {case['similarity_pct']}% {case['similarity_tag']}\n"
            f"Prior Investigation: {case['previous_investigation']}\n"
            f"Possible Cause: {case['previous_possible_cause']} {case['cause_tag']}\n"
            f"Recommended Action: {case['previous_recommended_action']} {case['action_tag']}\n"
            f"Outcome: {case['previous_outcome']} {case['outcome_tag']}"
        )
        results.append(
            RetrievedSourceItem(
                source_type="SOURCE TYPE 3: Historical ForgeMind Cases",
                source_name=f"Historical Case Dossier ({case['case_id']})",
                doc_id=case["case_id"],
                section=f"Defect Precedent: {clean_defect}",
                content=content_summary,
                provenance_tag="[HISTORICAL EVIDENCE]",
            )
        )
    return results


def retrieve_unified_knowledge(
    query: str,
    defect_class: Optional[str] = None,
    inspection_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Multi-source retrieval aggregator.
    Returns categorized sources and pre-formatted prompt context for LLM synthesis.
    """
    sources_type_1 = search_project_knowledge(query)
    sources_type_2 = search_engineering_documents(defect_class, query)
    sources_type_3 = search_historical_cases(defect_class)

    # Ingest SOURCE TYPE 4 (Inspection context)
    sources_type_4 = []
    if inspection_context:
        ctx_summary = (
            f"Inspection ID: {inspection_context.get('inspection_id', 'Unknown')}\n"
            f"Detected Defect: {inspection_context.get('defect', 'Unknown')} [MEASURED]\n"
            f"Vision Confidence: {inspection_context.get('confidence', 0.0)}% [MODEL]\n"
            f"Grad-CAM Attention Region: {inspection_context.get('gradcam_available', False)}\n"
            f"Workflow Status: {inspection_context.get('active_case_status', 'NEW')} [USER CONFIRMED]\n"
            f"Selected Economic Impact: {inspection_context.get('economic_impact', 'Not assessed')} [SIMULATED]\n"
            f"Recommended Action: {inspection_context.get('recommended_action', 'None')}"
        )
        sources_type_4.append(
            RetrievedSourceItem(
                source_type="SOURCE TYPE 4: Current Inspection Context",
                source_name=f"Inspection Specimen {inspection_context.get('inspection_id', '')}",
                doc_id=str(inspection_context.get("inspection_id", "FM-CURRENT")),
                section="Active Telemetry",
                content=ctx_summary,
                provenance_tag="[MEASURED]",
            )
        )

    all_items = sources_type_1 + sources_type_2 + sources_type_3 + sources_type_4

    return {
        "query": query,
        "defect_class": defect_class,
        "sources": [item.to_dict() for item in all_items],
        "project_sources": [item.to_dict() for item in sources_type_1],
        "engineering_sources": [item.to_dict() for item in sources_type_2],
        "historical_sources": [item.to_dict() for item in sources_type_3],
        "inspection_context": [item.to_dict() for item in sources_type_4],
    }
