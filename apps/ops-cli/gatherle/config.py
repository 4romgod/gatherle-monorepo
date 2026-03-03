"""Configuration helpers – load env vars from .env if present."""

import os
from pathlib import Path


def _load_dotenv() -> None:
    """
    Load a .env file from the ops-cli directory (or the directory two levels
    up i.e. the monorepo root) if python-dotenv is available.
    """
    try:
        from dotenv import load_dotenv  # type: ignore[import]

        # Try: apps/ops-cli/.env  →  repo-root/.env.local  →  repo-root/.env
        candidates = [
            Path(__file__).parent.parent / ".env",
            Path(__file__).parent.parent.parent.parent / ".env.local",
            Path(__file__).parent.parent.parent.parent / ".env",
        ]
        for path in candidates:
            if path.exists():
                load_dotenv(dotenv_path=path, override=False)
                break
    except ImportError:
        pass


_load_dotenv()


def get_mongo_url() -> str | None:
    return os.environ.get("MONGO_DB_URL")
