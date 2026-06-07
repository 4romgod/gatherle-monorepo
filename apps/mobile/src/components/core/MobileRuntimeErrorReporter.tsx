import { useEffect } from 'react';
import { reportFrontendError } from '@/lib/errors/reportFrontendError';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalErrorHandler | undefined;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

export function MobileRuntimeErrorReporter() {
  useEffect(() => {
    const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

    if (!errorUtils?.setGlobalHandler) {
      return;
    }

    const previousHandler = errorUtils.getGlobalHandler?.();
    const nextHandler: GlobalErrorHandler = (error, isFatal) => {
      reportFrontendError('Unhandled mobile runtime error', error, { isFatal: Boolean(isFatal) });
      previousHandler?.(error, isFatal);
    };

    errorUtils.setGlobalHandler(nextHandler);

    return () => {
      if (previousHandler) {
        errorUtils.setGlobalHandler?.(previousHandler);
      }
    };
  }, []);

  return null;
}
