from datetime import datetime
from pathlib import Path

import click

from gatherle.scripts.harvest_gauteng_events import (
    SAST,
    harvest_public_seed,
    resolve_public_seed_data_dir,
)
from gatherle.runtime import run_api_script


def _parse_date_boundary(value: str, *, end_of_day: bool) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        if end_of_day:
            return parsed.replace(
                hour=23, minute=59, second=59, microsecond=999000, tzinfo=SAST
            )
        return parsed.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=SAST)
    normalized = parsed.astimezone(SAST)
    if end_of_day:
        return normalized.replace(hour=23, minute=59, second=59, microsecond=999000)
    return normalized.replace(hour=0, minute=0, second=0, microsecond=0)


@click.group(name="public-seed")
def public_seed():
    """Public seed harvesting utilities."""


def _resolve_required_data_dir(data_dir: Path | None) -> Path:
    try:
        return resolve_public_seed_data_dir(data_dir)
    except ValueError as error:
        raise click.ClickException(str(error)) from error


def _run_harvest(
    data_dir: Path | None,
    window_start: str | None,
    window_end: str | None,
    sources: tuple[str, ...],
) -> dict[str, object]:
    resolved_data_dir = _resolve_required_data_dir(data_dir)
    resolved_start = (
        _parse_date_boundary(window_start, end_of_day=False) if window_start else None
    )
    resolved_end = (
        _parse_date_boundary(window_end, end_of_day=True) if window_end else None
    )
    normalized_sources = [
        source.title() if source.lower() != "ticketpro" else "Ticketpro"
        for source in sources
    ]
    normalized_sources = [
        "Webtickets" if source == "Webtickets" else source
        for source in normalized_sources
    ]
    normalized_sources = [
        "Computicket" if source == "Computicket" else source
        for source in normalized_sources
    ]

    result = harvest_public_seed(
        data_dir=resolved_data_dir,
        window_start=resolved_start,
        window_end=resolved_end,
        sources=normalized_sources or None,
    )

    failed_sources = result.get("failed_sources", {})
    if isinstance(failed_sources, dict) and failed_sources:
        summary = ", ".join(
            f"{name}: {message}" for name, message in failed_sources.items()
        )
        raise click.ClickException(f"Harvest completed with source failures: {summary}")

    return result


@public_seed.command(name="harvest-gauteng-events")
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Directory containing organizations.json, organization-media.json, events.json, and event-media.json.",
)
@click.option(
    "--window-start",
    type=str,
    default=None,
    help="Inclusive ISO date or datetime boundary for harvested events. Defaults to today in Africa/Johannesburg.",
)
@click.option(
    "--window-end",
    type=str,
    default=None,
    help="Inclusive ISO date or datetime boundary for harvested events. Defaults to December 31 of the current year in Africa/Johannesburg.",
)
@click.option(
    "--source",
    "sources",
    multiple=True,
    type=click.Choice(
        ["Howler", "Webtickets", "Ticketpro", "Computicket", "Joburg"],
        case_sensitive=False,
    ),
    help="Limit the run to one or more specific sources. Repeat the flag to select multiple sources.",
)
def harvest_gauteng_events(
    data_dir: Path | None,
    window_start: str | None,
    window_end: str | None,
    sources: tuple[str, ...],
):
    """Harvest Gauteng events from multiple external sources into the external JSON seed payload."""

    result = _run_harvest(data_dir, window_start, window_end, sources)

    click.echo(
        click.style(
            f"Harvest complete: {result['final_events']} events in {result['data_dir']} "
            f"for window {result['window_start']} -> {result['window_end']}",
            fg="green",
        )
    )


@public_seed.command(name="sync-gauteng-events")
@click.option(
    "--data-dir",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Directory containing organizations.json, organization-media.json, events.json, and event-media.json.",
)
@click.option(
    "--window-start",
    type=str,
    default=None,
    help="Inclusive ISO date or datetime boundary for harvested events. Defaults to today in Africa/Johannesburg.",
)
@click.option(
    "--window-end",
    type=str,
    default=None,
    help="Inclusive ISO date or datetime boundary for harvested events. Defaults to December 31 of the current year in Africa/Johannesburg.",
)
@click.option(
    "--source",
    "sources",
    multiple=True,
    type=click.Choice(
        ["Howler", "Webtickets", "Ticketpro", "Computicket", "Joburg"],
        case_sensitive=False,
    ),
    help="Limit the run to one or more specific sources. Repeat the flag to select multiple sources.",
)
@click.option(
    "--geocode/--no-geocode",
    default=True,
    show_default=True,
    help="Geocode imported events after they are seeded into MongoDB.",
)
def sync_gauteng_events(
    data_dir: Path | None,
    window_start: str | None,
    window_end: str | None,
    sources: tuple[str, ...],
    geocode: bool,
):
    """Harvest public seed data and then run the launch-like public import flow."""

    result = _run_harvest(data_dir, window_start, window_end, sources)
    resolved_data_dir = Path(str(result["data_dir"])).resolve()
    seed_args = [f"--data-dir={resolved_data_dir}"]
    env_overrides = {"PUBLIC_SEED_DATA_DIR": str(resolved_data_dir)}

    click.echo(
        click.style("Importing harvested public events into MongoDB...", fg="cyan")
    )
    run_api_script("seed:catalog")
    run_api_script("seed:system-users")
    run_api_script(
        "seed:public-events", script_args=seed_args, env_overrides=env_overrides
    )
    if geocode:
        run_api_script("geocode-events")

    click.echo(
        click.style(
            f"Public sync complete for {resolved_data_dir}. Seeded data from {result['window_start']} -> {result['window_end']}.",
            fg="green",
        )
    )
