type FrontendErrorMetadata = Record<string, unknown>;

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

export function reportFrontendError(context: string, error: unknown, metadata?: FrontendErrorMetadata) {
  const payload = {
    context,
    error: normalizeErrorPayload(error),
    ...(metadata ? { metadata } : {}),
  };

  console.error('[MobileFrontendError]', payload);
}
