type FrontendErrorMetadata = Record<string, unknown>;
type FrontendErrorLogLevel = 'error' | 'info';
type FrontendErrorOptions = {
  level?: FrontendErrorLogLevel;
};

function normalizeErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return error;
}

export function reportFrontendError(
  context: string,
  error: unknown,
  metadata?: FrontendErrorMetadata,
  options?: FrontendErrorOptions,
) {
  const level = options?.level ?? 'error';
  const payload = {
    context,
    error: normalizeErrorPayload(error),
    ...(metadata ? { metadata } : {}),
  };

  if (level === 'info') {
    console.info('[MobileFrontendInfo]', payload);
    return;
  }

  console.error('[MobileFrontendError]', payload);
}
