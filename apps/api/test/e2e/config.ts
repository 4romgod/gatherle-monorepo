import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

const graphQlUrl = process.env.GRAPHQL_URL ?? '';
const isRemoteGraphQlTarget = Boolean(graphQlUrl) && !/localhost|127\.0\.0\.1/i.test(graphQlUrl);
const DEFAULT_REMOTE_API_E2E_MAX_WORKERS = 2;
const DEFAULT_LOCAL_API_E2E_MAX_WORKERS = 4;

const parsePositiveInteger = (value?: string): number | null => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const readWorkerEnvOverride = (): number | null => {
  return (
    parsePositiveInteger(process.env.API_E2E_MAX_WORKERS) ??
    parsePositiveInteger(
      isRemoteGraphQlTarget ? process.env.API_E2E_REMOTE_MAX_WORKERS : process.env.API_E2E_LOCAL_MAX_WORKERS,
    )
  );
};

const DEFAULT_API_E2E_MAX_WORKERS = isRemoteGraphQlTarget
  ? DEFAULT_REMOTE_API_E2E_MAX_WORKERS
  : DEFAULT_LOCAL_API_E2E_MAX_WORKERS;

const parseCliWorkerOverride = (): number | null => {
  const args = process.argv;

  if (args.includes('--runInBand')) {
    return 1;
  }

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (arg.startsWith('--maxWorkers=')) {
      const value = Number.parseInt(arg.split('=')[1] ?? '', 10);
      return Number.isFinite(value) && value > 0 ? value : null;
    }

    if (arg === '--maxWorkers') {
      const value = Number.parseInt(args[index + 1] ?? '', 10);
      return Number.isFinite(value) && value > 0 ? value : null;
    }
  }

  return null;
};

export const API_E2E_MAX_WORKERS = parseCliWorkerOverride() ?? readWorkerEnvOverride() ?? DEFAULT_API_E2E_MAX_WORKERS;
export const API_E2E_REMOTE_WARMUP_REQUESTS =
  parsePositiveInteger(process.env.API_E2E_WARMUP_REQUESTS) ?? API_E2E_MAX_WORKERS;
