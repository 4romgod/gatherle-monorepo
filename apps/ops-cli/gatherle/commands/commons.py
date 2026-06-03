import click

from gatherle.runtime import run_api_script


@click.group()
def commons():
    """Run shared contract and commons-related operations."""


@commons.command(name="emit-schema")
def emit_schema():
    """Emit the GraphQL schema into packages/commons/schema.graphql."""

    run_api_script("emit-schema")
