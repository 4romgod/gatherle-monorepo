from __future__ import annotations

from pathlib import Path

import click

from gatherle.scripts.harvest_gauteng_events import resolve_public_seed_data_dir
from gatherle.runtime import run_api_script


def _public_seed_args(data_dir: Path | None) -> tuple[list[str], dict[str, str]]:
    try:
        resolved = resolve_public_seed_data_dir(data_dir)
    except ValueError as error:
        raise click.ClickException(str(error)) from error

    return [f"--data-dir={resolved}"], {"PUBLIC_SEED_DATA_DIR": str(resolved)}


@click.group()
def seed():
    """Seed API data using the current backend scripts."""


@seed.command(name="catalog")
def seed_catalog():
    """Seed the event category catalog and category groups."""

    run_api_script("seed:catalog")


@seed.command(name="system-users")
def seed_system_users():
    """Seed the reusable system and test users."""

    run_api_script("seed:system-users")


@seed.command(name="mock")
def seed_mock():
    """Seed mock/demo data. Requires the catalog to exist first."""

    run_api_script("seed:mock")


@seed.command(name="demo")
def seed_demo():
    """Seed the catalog and then the mock/demo dataset."""

    run_api_script("seed:catalog")
    run_api_script("seed:mock")


@seed.command(name="dev")
def seed_dev():
    """Seed the convenience local dev dataset."""

    run_api_script("seed:dev")


@seed.command(name="public-events")
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Directory containing organizations.json, organization-media.json, events.json, and event-media.json.",
)
def seed_public_events(data_dir: Path | None):
    """Seed imported public events from external JSON payload files."""

    script_args, env_overrides = _public_seed_args(data_dir)
    run_api_script(
        "seed:public-events", script_args=script_args, env_overrides=env_overrides
    )


@seed.command(name="imported-events", hidden=True)
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Alias for public-events. Directory containing the imported public seed payload files.",
)
def seed_imported_events(data_dir: Path | None):
    """Alias for seed public-events."""

    script_args, env_overrides = _public_seed_args(data_dir)
    run_api_script(
        "seed:imported-events", script_args=script_args, env_overrides=env_overrides
    )


@seed.command(name="launch-like")
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Directory containing the imported public seed payload files.",
)
@click.option(
    "--geocode/--no-geocode",
    default=True,
    show_default=True,
    help="Geocode imported events after the public-event seed completes.",
)
def seed_launch_like(data_dir: Path | None, geocode: bool):
    """Seed the launch-like public-events flow from the API runbook."""

    script_args, env_overrides = _public_seed_args(data_dir)
    run_api_script("seed:catalog")
    run_api_script("seed:system-users")
    run_api_script(
        "seed:public-events", script_args=script_args, env_overrides=env_overrides
    )
    if geocode:
        run_api_script("geocode-events")
