# Gatherle Operations CLI

A Python CLI for common Gatherle operational tasks — seeding the database, running migrations, and more.

## Requirements

- Python 3.11+
- A running MongoDB instance (local or remote)

## Setup

### 1. Create and activate a virtual environment

```bash
cd apps/ops-cli
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install the CLI

```bash
pip install .
```

The `gatherle` command is now available in your shell while the virtual environment is active.

### 3. Configure environment variables

Create a `.env` file inside `apps/ops-cli/` (or use the monorepo root `.env`):

```env
MONGO_DB_URL=mongodb://localhost:27017/gatherle
```

## Usage

```
gatherle [COMMAND GROUP] [COMMAND] [OPTIONS]
```

To see all supported commands:

```bash
gatherle --help
gatherle db --help
```

## Commands

### `db seed` — Seed reference data

Inserts event categories (and in future: category groups, venues, etc.) into MongoDB.

```bash
# Seed the database — idempotent, safe to re-run
gatherle db seed

# Drop existing collections first, then seed fresh
gatherle db seed --drop

# Override the connection string inline
gatherle db seed --mongo-url "mongodb://localhost:27017/gatherle"
```

The command is **idempotent by default**: records are matched by `slug` and skipped if they already exist. Use `--drop`
only when you need a completely clean slate.

## Deactivating the virtual environment

```bash
deactivate
```

## Adding new commands

1. Create a new file in `gatherle/commands/` (e.g. `gatherle/commands/migrate.py`).
2. Define a `@click.group()` and its subcommands.
3. Register it in `gatherle/commands/__init__.py`.
