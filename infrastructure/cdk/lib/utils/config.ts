export const parsePositiveIntegerEnv = (
  envName: string,
  envValue: string | undefined,
  fallback: number,
  minimum = 1,
): number => {
  const trimmed = envValue?.trim();
  if (!trimmed) {
    return fallback;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${envName} must be an integer greater than or equal to ${minimum}. Received "${envValue}".`);
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${envName} must be an integer greater than or equal to ${minimum}. Received "${envValue}".`);
  }

  return parsed;
};

export const buildMetricName = (value: string): string => value.replace(/[^A-Za-z0-9]/g, '');
