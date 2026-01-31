'use client';
import { useEffect } from 'react';
import ErrorPage from '@/components/errors/ErrorPage';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <ErrorPage
      statusCode="500"
      title="Something went wrong"
      message="We ran into an unexpected issue. Refresh the page or come back in a few minutes."
      ctaLabel="Try again"
      ctaOnClick={reset}
    ></ErrorPage>
  );
}
