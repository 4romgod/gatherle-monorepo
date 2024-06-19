import click

@click.group()
def farewell():
    """ Perform farewell operations """

@farewell.command()
@click.option('-c', '--count', default=1, help='Number of farewells.')
@click.option('-n', '--name', prompt='Your name', help='The name of the person to send farewell.')
def say_goodbye(count, name):
    """Simple program that farewells NAME for a total of COUNT times."""
    for x in range(count):
        click.echo(f"Goodbye {name}!")
