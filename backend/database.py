"""
ForgeMind AI — PostgreSQL Database Session & Engine
Configured for PostgreSQL on Render / Local using SQLAlchemy and psycopg2.
"""

import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import settings

log = logging.getLogger("forgemind.database")

Base = declarative_base()

# Initialize PostgreSQL engine
_engine = None
_session_local = None
_db_connected = False

try:
    _engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    _session_local = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    # Test connection
    with _engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    _db_connected = True
    log.info("PostgreSQL database connected successfully via %s", settings.DATABASE_URL.split("@")[-1])
except Exception as e:
    log.warning("PostgreSQL connection note: %s (will initialize tables when PostgreSQL server is ready)", e)
    _db_connected = False


def is_database_connected() -> bool:
    """Return whether PostgreSQL connection is alive."""
    global _db_connected
    if not _engine:
        return False
    try:
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _db_connected = True
        return True
    except Exception:
        _db_connected = False
        return False


def get_db() -> Generator[Session | None, None, None]:
    """FastAPI dependency for yielding database sessions."""
    if _session_local and is_database_connected():
        db = _session_local()
        try:
            yield db
        finally:
            db.close()
    else:
        yield None


def init_db():
    """Create all PostgreSQL tables if connected."""
    if _engine and is_database_connected():
        try:
            Base.metadata.create_all(bind=_engine)
            log.info("PostgreSQL tables created successfully.")
        except Exception as err:
            log.warning("Could not auto-create PostgreSQL tables: %s", err)
