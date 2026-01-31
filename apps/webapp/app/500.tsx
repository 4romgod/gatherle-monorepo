import ErrorPage from '@/components/errors/ErrorPage';

export default function ServerErrorPage() {
  return (
    <ErrorPage
      statusCode={500}
      title="Server error"
      message="Something went wrong on our end. You can try again later, or come back shortly."
    />
  );
}
