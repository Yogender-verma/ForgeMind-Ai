"""
ForgeMind AI — Engineering Knowledge Base & Retrieval System
Physically reads engineering reference guidance documents from data/engineering_knowledge/.
Truthfully labels guidance documents as:
"Engineering Guidance — Source Pending Verification"
Zero fabricated ISO/AIAG/VDA/NADCA citations.
"""

from typing import List, Dict, Any, Optional
from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
KNOWLEDGE_DIR = PROJECT_ROOT / "data" / "engineering_knowledge"

class KnowledgeDocument:
    def __init__(
        self,
        doc_id: str,
        title: str,
        doc_type: str,
        standard: str,
        content: str,
        applicable_defects: List[str],
        file_path: Optional[str] = None,
    ):
        self.doc_id = doc_id
        self.title = title
        self.doc_type = doc_type
        self.standard = standard
        self.content = content
        self.applicable_defects = applicable_defects
        self.file_path = file_path

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doc_id": self.doc_id,
            "title": self.title,
            "doc_type": self.doc_type,
            "standard": self.standard,
            "content": self.content,
            "applicable_defects": self.applicable_defects,
            "file_path": self.file_path,
        }


def _load_knowledge_corpus() -> List[KnowledgeDocument]:
    """
    Reads physical markdown reference files from data/engineering_knowledge/
    and constructs the KnowledgeDocument corpus.
    """
    docs = []
    
    doc_meta = [
        {
            "filename": "KB-GUIDE-CRK-01.md",
            "doc_id": "KB-GUIDE-CRK-01",
            "title": "Engineering Guidance: Mechanical Tool Shock & Surface Cracking",
            "doc_type": "Engineering Guidance — Source Pending Verification",
            "standard": "Industry General Failure Analysis Reference (Verification Pending)",
            "defects": ["Crack"],
        },
        {
            "filename": "KB-GUIDE-CAST-02.md",
            "doc_id": "KB-GUIDE-CAST-02",
            "title": "Engineering Guidance: Porosity & Gas Void Formation",
            "doc_type": "Engineering Guidance — Source Pending Verification",
            "standard": "Industry General Failure Analysis Reference (Verification Pending)",
            "defects": ["Hole"],
        },
        {
            "filename": "KB-GUIDE-CLT-03.md",
            "doc_id": "KB-GUIDE-CLT-03",
            "title": "Engineering Guidance: Surface Rust & Ferrous Oxidation",
            "doc_type": "Engineering Guidance — Source Pending Verification",
            "standard": "Industry General Failure Analysis Reference (Verification Pending)",
            "defects": ["Rust"],
        },
        {
            "filename": "KB-GUIDE-FIX-04.md",
            "doc_id": "KB-GUIDE-FIX-04",
            "title": "Engineering Guidance: Surface Scratches & Mechanical Abrasions",
            "doc_type": "Engineering Guidance — Source Pending Verification",
            "standard": "Industry General Failure Analysis Reference (Verification Pending)",
            "defects": ["Scratch", "Scratches"],
        },
        {
            "filename": "KB-GUIDE-TOL-05.md",
            "doc_id": "KB-GUIDE-TOL-05",
            "title": "Engineering Guidance: Surface Integrity & Tolerance Verification",
            "doc_type": "Engineering Guidance — Source Pending Verification",
            "standard": "Industry General Failure Analysis Reference (Verification Pending)",
            "defects": ["Normal"],
        },
    ]

    for item in doc_meta:
        file_p = KNOWLEDGE_DIR / item["filename"]
        content_text = ""
        if file_p.exists():
            with open(file_p, "r", encoding="utf-8") as f:
                content_text = f.read()
        else:
            content_text = f"Physical file {item['filename']} pending verification."

        docs.append(
            KnowledgeDocument(
                doc_id=item["doc_id"],
                title=item["title"],
                doc_type=item["doc_type"],
                standard=item["standard"],
                content=content_text,
                applicable_defects=item["defects"],
                file_path=str(file_p) if file_p.exists() else None,
            )
        )

    return docs


ENGINEERING_KNOWLEDGE_CORPUS: List[KnowledgeDocument] = _load_knowledge_corpus()


def retrieve_engineering_evidence(defect_class: str) -> List[KnowledgeDocument]:
    """
    Retrieves verified engineering reference guidance applicable to the detected defect class.
    Only returns documents specifically mapped to the defect class.
    """
    clean_defect = (defect_class or "").strip().lower()
    matches = []

    for doc in ENGINEERING_KNOWLEDGE_CORPUS:
        applicable_lower = [d.lower() for d in doc.applicable_defects]
        if clean_defect in applicable_lower:
            matches.append(doc)

    return matches
