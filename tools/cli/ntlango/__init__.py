import click

from ntlango.commands import command_groups

@click.group()
def cli_entry():
    """ Ntlango Operations CLI """

for command_group in command_groups:
    cli_entry.add_command(command_group)
