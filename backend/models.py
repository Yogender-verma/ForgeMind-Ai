"""
ForgeMind AI — PostgreSQL SQLAlchemy ORM Models
Defines schema for simulation runs, economic presets, and analysis records.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from backend.database import Base


class SimulationRunRecord(Base):
    """Stores executed what-if simulations in PostgreSQL."""
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_key = Column(String(50), nullable=False, index=True)
    scenario_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    change_type = Column(String(50), default="multiply")
    parameter_changes = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=False)
    delta = Column(JSON, nullable=False)
    assumptions = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "model_key": self.model_key,
            "scenario_name": self.scenario_name,
            "description": self.description,
            "change_type": self.change_type,
            "parameter_changes": self.parameter_changes,
            "confidence": self.confidence,
            "delta": self.delta,
            "assumptions": self.assumptions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EconomicPresetRecord(Base):
    """Stores user-saved financial models and presets in PostgreSQL."""
    __tablename__ = "economic_presets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    unit_revenue = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    operating_cost_per_hour = Column(Float, nullable=False)
    downtime_cost_per_hour = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "unit_revenue": self.unit_revenue,
            "unit_cost": self.unit_cost,
            "operating_cost_per_hour": self.operating_cost_per_hour,
            "downtime_cost_per_hour": self.downtime_cost_per_hour,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AnalysisSnapshotRecord(Base):
    """Stores high-level pipeline run snapshots in PostgreSQL."""
    __tablename__ = "analysis_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_key = Column(String(50), nullable=False, index=True)
    bottleneck_station = Column(String(100), nullable=False)
    bottleneck_score = Column(Float, nullable=False)
    estimated_profit = Column(Float, nullable=True)
    evidence_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "model_key": self.model_key,
            "bottleneck_station": self.bottleneck_station,
            "bottleneck_score": self.bottleneck_score,
            "estimated_profit": self.estimated_profit,
            "evidence_summary": self.evidence_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
