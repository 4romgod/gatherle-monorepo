from __future__ import annotations

import os
import shlex
import shutil
import subprocess
from pathlib import Path

import click

from gatherle.config import load_env


REPO_ROOT = Path(__file__).resolve().parents[3]
API_WORKSPACE_NAME = "@gatherle/api"
API_WORKSPACE_PATH = REPO_ROOT / "apps" / "api"


def ensure_repo_layout() -> None:
    if not API_WORKSPACE_PATH.exists():
        raise click.ClickException(f"API workspace not found at {API_WORKSPACE_PATH}.")


def ensure_command_available(command_name: str) -> None:
    if shutil.which(command_name):
        return
    raise click.ClickException(f"Required command not found on PATH: {command_name}")


def build_api_npm_command(
    script_name: str, script_args: list[str] | None = None
) -> list[str]:
    command = ["npm", "run", script_name, "-w", API_WORKSPACE_NAME]
    if script_args:
        command.extend(["--", *script_args])
    return command


def run_api_script(
    script_name: str,
    *,
    script_args: list[str] | None = None,
    env_overrides: dict[str, str] | None = None,
) -> None:
    load_env()
    ensure_repo_layout()
    ensure_command_available("npm")

    command = build_api_npm_command(script_name, script_args=script_args)
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)

    rendered = " ".join(shlex.quote(part) for part in command)
    click.echo(click.style(f"$ {rendered}", fg="cyan"))

    completed = subprocess.run(command, cwd=REPO_ROOT, env=env, check=False)
    if completed.returncode != 0:
        raise click.exceptions.Exit(completed.returncode)
