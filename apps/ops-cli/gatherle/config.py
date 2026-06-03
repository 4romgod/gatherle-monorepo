"""Configuration helpers – load env vars from .env if present."""

import os
from pathlib import Path

_env_loaded = False


def load_env() -> None:
    """
    Load a .env file from the ops-cli directory (or the directory two levels
    up i.e. the monorepo root) if python-dotenv is available.
    """
    global _env_loaded
    if _env_loaded:
        return

    try:
        from dotenv import load_dotenv  # type: ignore[import]

        ops_cli_root = Path(__file__).parent.parent

        # Try: apps/ops-cli/.env.local  →  apps/ops-cli/.env  →  repo-root/.env.local  →  repo-root/.env
        candidates = [
            ops_cli_root / ".env.local",
            ops_cli_root / ".env",
            Path(__file__).parent.parent.parent.parent / ".env.local",
            Path(__file__).parent.parent.parent.parent / ".env",
        ]
        for path in candidates:
            if path.exists():
                load_dotenv(dotenv_path=path, override=path.parent == ops_cli_root)
                break
    except ImportError:
        pass
    finally:
        _env_loaded = True


def get_mongo_url() -> str | None:
    return os.environ.get("MONGO_DB_URL")
