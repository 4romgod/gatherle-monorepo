import click

@click.group()
def greetings():
    """ Perform greetings operations """

@greetings.command()
@click.option('-c', '--count', default=1, help='Number of greetings.')
@click.option('-n', '--name', prompt='Your name', help='The name of the person to greet.')
def hello(count, name):
    """Simple program that greets NAME for a total of COUNT times."""
    for x in range(count):
        click.echo(f"Hello {name}!")

@greetings.command()
@click.option('-c', '--count', default=1, help='Number of greetings.')
@click.option('-n', '--name', prompt='Your name', help='The name of the person to greet.')
def kunjhani(count, name):
    """Simple program that greets NAME for a total of COUNT times."""
    for x in range(count):
        click.echo(f"Kunjhani {name}!")
