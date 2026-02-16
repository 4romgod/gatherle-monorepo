import { INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS } from './constants';

export const calculateRetryDelay = (attempt: number): number => {
  const exponentialDelay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return exponentialDelay + jitter;
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
