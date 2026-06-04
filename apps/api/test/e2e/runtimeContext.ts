import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { UserWithToken } from '@gatherle/commons/server/types';

export type CachedEventCategoryRef = {
  eventCategoryId: string;
  slug: string;
};

export type ApiE2ERuntimeContext = {
  seededUsersByEmail: Record<string, UserWithToken>;
  firstEventCategory: CachedEventCategoryRef;
  jwtSecret?: string;
  e2eUserNamespace?: string;
};

export const API_E2E_RUNTIME_CONTEXT_PATH = resolve(__dirname, 'reports/runtime-context.json');

export const readRuntimeContext = (): ApiE2ERuntimeContext | null => {
  try {
    const contents = readFileSync(API_E2E_RUNTIME_CONTEXT_PATH, 'utf8');
    return JSON.parse(contents) as ApiE2ERuntimeContext;
  } catch {
    return null;
  }
};

export const writeRuntimeContext = (context: ApiE2ERuntimeContext): void => {
  mkdirSync(dirname(API_E2E_RUNTIME_CONTEXT_PATH), { recursive: true });
  writeFileSync(API_E2E_RUNTIME_CONTEXT_PATH, JSON.stringify(context), 'utf8');
};

export const clearRuntimeContext = (): void => {
  rmSync(API_E2E_RUNTIME_CONTEXT_PATH, { force: true });
};
