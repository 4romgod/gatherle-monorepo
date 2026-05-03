import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

const graphQlUrl = process.env.GRAPHQL_URL ?? '';
const isRemoteGraphQlTarget = Boolean(graphQlUrl) && !/localhost|127\.0\.0\.1/i.test(graphQlUrl);
const DEFAULT_API_E2E_MAX_WORKERS = isRemoteGraphQlTarget ? 1 : 4;

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

export const API_E2E_MAX_WORKERS = parseCliWorkerOverride() ?? DEFAULT_API_E2E_MAX_WORKERS;
export const API_E2E_REMOTE_WARMUP_REQUESTS = API_E2E_MAX_WORKERS;
