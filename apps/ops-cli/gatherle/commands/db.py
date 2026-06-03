"""Legacy aliases kept for compatibility while the grouped CLI settles."""

import click

from gatherle.runtime import run_api_script


@click.group(hidden=True)
def db():
    """Legacy database aliases."""


@db.command(name="seed")
def seed_catalog_alias():
    """Legacy alias for `gatherle seed catalog`."""

    click.echo(
        click.style(
            "Legacy alias detected. Use `gatherle seed catalog` going forward.",
            fg="yellow",
        )
    )
    run_api_script("seed:catalog")
