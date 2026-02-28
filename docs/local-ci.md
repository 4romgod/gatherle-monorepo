# Running GitHub Actions Workflows Locally

This project uses [`act`](https://github.com/nektos/act) to run GitHub Actions workflows locally via Docker, allowing
you to validate CI changes without pushing to GitHub.

## Prerequisites

- **Docker** must be running
- **`act`** must be installed — see [installation instructions](https://nektosact.com/installation/index.html)

  ```bash
  # macOS
  brew install act

  # Linux (via GitHub releases)
  curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
  ```

## Available Workflows

| File                  | Trigger                 | Purpose                                         |
| --------------------- | ----------------------- | ----------------------------------------------- |
| `pr-check.yaml`       | `pull_request` → `main` | Lint, typecheck, build, unit tests              |
| `deploy-trigger.yaml` | `push` → `main`         | Orchestrates DNS + runtime deploys to Beta/Prod |
| `deploy.yaml`         | Reusable                | Runtime CDK deploy + e2e tests                  |
| `deploy-dns.yaml`     | Reusable                | DNS CDK deploy                                  |

## Troubleshooting

### Docker auth errors on image pull

If you see `unauthorized: incorrect username or password` when `act` tries to pull an image, you have stale Docker
credentials stored locally. Clear them and retry:

```bash
docker logout
act pull_request -W .github/workflows/pr-check.yaml
```

Public images (like `catthehacker/ubuntu`) do not require a Docker Hub login. If you want to stay authenticated, run
`docker login` with valid credentials before running `act`.

As a workaround, pull the image manually first and skip the registry check:

```bash
docker pull catthehacker/ubuntu:act-latest
act -j pr-check --pull=false
```

## Most Common Usage

### Step 1 — list available jobs

```bash
act --list
```

This shows all jobs across all workflows with their IDs, e.g.:

```
Stage  Job ID    Job name  Workflow name  Workflow file    Events
0      pr-check  PR Check  PR Check       pr-check.yaml    pull_request
0      deploy    Deploy    Deploy         deploy.yaml      ...
```

### Step 2 — run a job by ID

```bash
act -j pr-check
```

### Alternative: target a specific workflow file + event

```bash
act pull_request -W .github/workflows/pr-check.yaml
```

## Secrets & Environment Variables

The PR check workflow does not require AWS credentials and runs without secrets.

For the deploy workflows, `act` needs AWS credentials and app secrets. Create a local `.secrets` file (already in
`.gitignore`) in the repo root:

```
# .secrets  — never commit this file
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
JWT_SECRET=...
MONGO_DB_URL=...
```

Then pass it to `act`:

```bash
act push -W .github/workflows/deploy-trigger.yaml --secret-file .secrets
```

> **Note:** The deploy workflows assume AWS OIDC authentication (`ASSUME_ROLE_ARN`) which is not available locally.
> Running deploy workflows locally is generally not recommended — use them for inspection/debugging only.

## Docker Image Size

`act` supports three image sizes for `ubuntu-latest`. The default (`micro`) is fast but may be missing some tools.

| Image    | Size   | Flag                                                        |
| -------- | ------ | ----------------------------------------------------------- |
| `micro`  | ~200MB | `-P ubuntu-latest=catthehacker/ubuntu:act-latest` (default) |
| `medium` | ~500MB | `-P ubuntu-latest=catthehacker/ubuntu:full-latest`          |
| `large`  | ~18GB  | `-P ubuntu-latest=ubuntu:latest`                            |

If a step fails due to a missing tool (e.g., `node` not found), switch to the medium image:

```bash
act pull_request -W .github/workflows/pr-check.yaml \
  -P ubuntu-latest=catthehacker/ubuntu:full-latest
```

## Useful Flags

| Flag                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `--list`               | List all jobs in a workflow without running them |
| `--dry-run`            | Show what would run without executing            |
| `-j <job-id>`          | Run a specific job only                          |
| `-W <file>`            | Target a specific workflow file                  |
| `--secret-file <file>` | Load secrets from a file                         |
| `--env-file <file>`    | Load environment variables from a file           |
| `-v`                   | Verbose output                                   |
| `--reuse`              | Reuse containers between runs (faster iteration) |

## Workflow Step Reference (pr-check)

These are the steps executed in order by `pr-check.yaml`:

1. `commons` — Lint + TypeScript build
2. `api` — Lint + TypeScript build + unit tests
3. `webapp` — Lint → `emit-schema` → `codegen` → TypeScript build → Next.js build → unit tests

This means the **webapp steps require a running commons build** — `act` handles this automatically within the job, but
if running steps out of order manually via the terminal, run commons first:

```bash
npm run build:ts -w @gatherle/commons
npm run emit-schema -w @gatherle/api
npm run codegen -w @gatherle/webapp
```
