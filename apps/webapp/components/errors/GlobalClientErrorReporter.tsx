'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/utils';

export default function GlobalClientErrorReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logger.error('Unhandled client error', {
        columnNumber: event.colno,
        error: event.error,
        fileName: event.filename,
        lineNumber: event.lineno,
        message: event.message,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
