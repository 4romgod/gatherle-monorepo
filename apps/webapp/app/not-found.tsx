import ErrorPage from '@/components/errors/ErrorPage';

export default function NotFoundPage() {
  return (
    <ErrorPage
      statusCode={404}
      title="Page not found"
      message="Looks like this page took a detour. The link might be broken or the page may have moved."
    />
  );
}
