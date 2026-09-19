"""
ForgeMind AI — Backend Configuration
Loads settings and environment variables from .env using python-dotenv.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Locate and load root .env file
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = "ForgeMind AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # PostgreSQL Database URL
    # Render sets DATABASE_URL automatically. If it starts with postgres://, convert to postgresql://
    raw_db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://forgemind_user:password@localhost:5432/forgemind"
    )
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg2://"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    DATABASE_URL: str = raw_db_url

    # CORS Origins (Vercel frontend domains + local dev)
    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if origin.strip()
    ]

settings = Settings()
