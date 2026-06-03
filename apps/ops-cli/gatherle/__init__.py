"""Gatherle operations CLI entrypoint."""

import click

from gatherle.commands import command_groups
from gatherle.config import load_env

load_env()


@click.group()
def cli_entry():
    """Gatherle Operations CLI."""


for command_group in command_groups:
    cli_entry.add_command(command_group)
