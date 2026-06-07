'use client';

import { useEffect } from 'react';
import ErrorPage from '@/components/errors/ErrorPage';
import { logger } from '@/lib/utils';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logger.error('Unhandled root layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorPage
          statusCode="500"
          title="Something went wrong"
          message="We ran into an unexpected issue loading Gatherle. Try again now or come back in a few minutes."
          ctaLabel="Try again"
          ctaOnClick={reset}
        />
      </body>
    </html>
  );
}
