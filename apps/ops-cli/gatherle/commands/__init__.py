from gatherle.commands.commons import commons
from gatherle.commands.db import db
from gatherle.commands.events import events
from gatherle.commands.public_seed import public_seed
from gatherle.commands.seed import seed

command_groups = [
    seed,
    db,
    public_seed,
    events,
    commons,
]
