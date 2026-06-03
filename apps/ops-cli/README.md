# Gatherle Operations CLI

A Python CLI for common Gatherle operational tasks — seeding the database, running migrations, and more.

## Requirements

- Python 3.11+
- `uv`
- Node.js + `npm`
- A running MongoDB instance (local or remote)
- Monorepo dependencies installed from the repository root with `npm install`

## Setup

### 1. Sync the project with `uv`

```bash
cd apps/ops-cli
uv sync
```

That creates a local `.venv` and installs the CLI plus its dependencies.

If you want an interactive shell inside the environment:

```bash
source .venv/bin/activate
```

### 2. Configure environment variables

Create a `.env.local` or `.env` file inside `apps/ops-cli/` (or use the monorepo root `.env.local` / `.env`):

```env
MONGO_DB_URL=mongodb://localhost:27017/gatherle
```

`MONGO_DB_URL` must include the database name. `mongodb://localhost:27017` is not enough.

For API-backed commands such as `seed`, `events`, and `commons`, the backend runtime env must also be available, most
commonly:

```env
JWT_SECRET=...
STAGE=Dev
AWS_REGION=af-south-1
```

For `gatherle seed ...`, `gatherle events ...`, and `gatherle commons ...`, the CLI now loads the ops-cli dotenv file
first and passes those values through to the API workspace subprocess. If `apps/ops-cli/.env.local` exists, it wins over
the repo-root dotenv files and any inherited conflicting values from the shell.

### 3. Run the CLI

```bash
uv run gatherle --help
uv run gatherle seed --help
```

## Usage

```
gatherle [COMMAND GROUP] [COMMAND] [OPTIONS]
```

To see all supported commands:

```bash
uv run gatherle --help
uv run gatherle seed --help
uv run gatherle events --help
uv run gatherle commons --help
uv run gatherle public-seed --help
```

## Commands

### `seed catalog` — Seed the current API catalog

Seeds the event categories and category groups from `apps/api/lib/mongodb/data/catalog`.

```bash
# Seed the current API catalog
uv run gatherle seed catalog

# Legacy alias
uv run gatherle db seed
```

### `seed system-users` — Seed the reusable imports and test accounts

```bash
uv run gatherle seed system-users
```

### `seed mock` / `seed demo` / `seed dev`

```bash
# Only mock/demo data; requires the catalog first
uv run gatherle seed mock

# Convenience flow: catalog, then mock/demo data
uv run gatherle seed demo

# Convenience flow: catalog, system users, then mock/demo data
uv run gatherle seed dev
```

### `seed public-events` — Import curated public-event JSON into MongoDB

```bash
# Use PUBLIC_SEED_DATA_DIR from your ops-cli env file
uv run gatherle seed public-events

# Pass the directory explicitly
uv run gatherle seed public-events --data-dir /abs/path/to/public-seed
```

### `seed launch-like` — Run the public launch-like flow from the API runbook

This runs:

1. `seed:catalog`
2. `seed:system-users`
3. `seed:public-events`
4. `geocode-events` by default

```bash
# Launch-like seed flow using an imported public seed payload
uv run gatherle seed launch-like --data-dir /abs/path/to/public-seed

# Skip geocoding if you only want the import step
uv run gatherle seed launch-like --data-dir /abs/path/to/public-seed --no-geocode
```

### `public-seed harvest-gauteng-events` — Refresh the external public-event JSON payload

Harvests Gauteng events from multiple external sources into the external JSON payload used by the API public-event seed.
The command now exits non-zero if any selected source fails.

```bash
# Harvest using PUBLIC_SEED_DATA_DIR from your ops-cli env file
uv run gatherle public-seed harvest-gauteng-events

# Harvest only a weak source while iterating on parsing
uv run gatherle public-seed harvest-gauteng-events --source Joburg
uv run gatherle public-seed harvest-gauteng-events --source Webtickets --source Ticketpro

# Harvest into a custom external payload directory
uv run gatherle public-seed harvest-gauteng-events --data-dir /abs/path/to/public-seed

# Override the harvest window
uv run gatherle public-seed harvest-gauteng-events --window-start 2026-06-01 --window-end 2026-12-31
```

The public seed directory is always required, either via `--data-dir` or `PUBLIC_SEED_DATA_DIR`. The harvest window
defaults to today through December 31 in the Africa/Johannesburg timezone.

### `public-seed sync-gauteng-events` — Harvest and then import the public-events flow

This command bridges the Python harvester and the current API seed flow:

1. harvest Gauteng events into JSON
2. run `seed catalog`
3. run `seed system-users`
4. run `seed public-events`
5. run `events geocode` by default

```bash
PUBLIC_SEED_DATA_DIR=/abs/path/to/public-seed uv run gatherle public-seed sync-gauteng-events

uv run gatherle public-seed sync-gauteng-events --source Joburg --no-geocode
```

### `events geocode` / `events maintain-occurrences`

```bash
uv run gatherle events geocode

uv run gatherle events maintain-occurrences --dry-run
uv run gatherle events maintain-occurrences --limit 200 --threshold-days 21
uv run gatherle events maintain-occurrences --event-series-id <eventSeriesId>
```

### `commons emit-schema`

```bash
uv run gatherle commons emit-schema
```

## Linting

From the repository root:

```bash
npm run lint
npm run lint:fix
```

That now includes `apps/ops-cli` via:

```bash
uv run --project apps/ops-cli ruff check apps/ops-cli
uv run --project apps/ops-cli ruff check --fix apps/ops-cli
uv run --project apps/ops-cli ruff format apps/ops-cli
```

## Deactivating the virtual environment

```bash
deactivate
```

## Legacy `pip` setup

If you need the older workflow, it still works:

```bash
cd apps/ops-cli
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
```

## Adding new commands

1. Create a new file in `gatherle/commands/` (e.g. `gatherle/commands/migrate.py`).
2. Define a `@click.group()` and its subcommands.
3. Register it in `gatherle/commands/__init__.py`.
