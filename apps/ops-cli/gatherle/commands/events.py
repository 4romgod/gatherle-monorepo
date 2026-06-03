from __future__ import annotations

import click

from gatherle.runtime import run_api_script


@click.group()
def events():
    """Run event maintenance operations from the API workspace."""


@events.command(name="geocode")
def geocode_events():
    """Geocode event locations that are missing coordinates."""

    run_api_script("geocode-events")


@events.command(name="maintain-occurrences")
@click.option(
    "--limit", type=int, default=None, help="Maximum number of event series to process."
)
@click.option(
    "--after-event-id",
    type=str,
    default=None,
    help="Resume after this event series id.",
)
@click.option(
    "--threshold-days", type=int, default=None, help="Future horizon threshold in days."
)
@click.option(
    "--event-series-id",
    type=str,
    default=None,
    help="Maintain a single event series window.",
)
@click.option(
    "--dry-run",
    is_flag=True,
    default=False,
    help="Preview maintenance without writing changes.",
)
def maintain_occurrences(
    limit: int | None,
    after_event_id: str | None,
    threshold_days: int | None,
    event_series_id: str | None,
    dry_run: bool,
):
    """Run the event-occurrence maintenance script."""

    script_args: list[str] = []
    if limit is not None:
        script_args.extend(["--limit", str(limit)])
    if after_event_id:
        script_args.extend(["--after-event-id", after_event_id])
    if threshold_days is not None:
        script_args.extend(["--threshold-days", str(threshold_days)])
    if event_series_id:
        script_args.extend(["--event-series-id", event_series_id])
    if dry_run:
        script_args.append("--dry-run")

    run_api_script("maintain-event-occurrences", script_args=script_args)
