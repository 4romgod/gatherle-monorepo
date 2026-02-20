import click

from gatherle.commands import command_groups

@click.group()
def cli_entry():
    """ Gatherle Operations CLI """

for command_group in command_groups:
    cli_entry.add_command(command_group)
