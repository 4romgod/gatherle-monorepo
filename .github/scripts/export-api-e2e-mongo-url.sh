#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${SECRET_ARN:-}" ]]; then
  echo "SECRET_ARN is required to export MONGO_DB_URL for API e2e tests." >&2
  exit 1
fi

if [[ -z "${GITHUB_ENV:-}" ]]; then
  echo "GITHUB_ENV is required to export MONGO_DB_URL for API e2e tests." >&2
  exit 1
fi

attempts=3
secret_string=""

for attempt in $(seq 1 "$attempts"); do
  if secret_string=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query 'SecretString' --output text); then
    break
  fi

  if [[ "$attempt" -eq "$attempts" ]]; then
    echo "Failed to retrieve backend secret payload from Secrets Manager after ${attempts} attempts." >&2
    exit 1
  fi

  echo "Retrying backend secret fetch for API e2e Mongo URL (${attempt}/${attempts})..." >&2
  sleep $((attempt * 2))
done

mongo_db_url=$(printf '%s' "$secret_string" | jq -r '.MONGO_DB_URL // empty')

if [[ -z "$mongo_db_url" ]]; then
  echo "MONGO_DB_URL was not present in the backend secret payload." >&2
  exit 1
fi

echo "MONGO_DB_URL=$mongo_db_url" >> "$GITHUB_ENV"
