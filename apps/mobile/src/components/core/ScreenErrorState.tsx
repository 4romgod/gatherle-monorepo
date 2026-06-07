import { classifyFrontendFailure, type FrontendFailureKind } from '@/lib/errors/frontendFailure';
import { StateNotice } from './StateNotice';

type ScreenErrorStateProps = {
  error: unknown;
  onReauthenticate?: () => void;
  onRetry?: () => void;
  resourceName: string;
};

function buildFailureCopy(kind: FrontendFailureKind, resourceName: string) {
  switch (kind) {
    case 'session-expired':
      return {
        actionLabel: 'Login again',
        message: `Your Gatherle session ended before we could load ${resourceName}. Sign in again to keep going.`,
        title: 'Session expired',
      };
    case 'offline':
      return {
        actionLabel: 'Try again',
        message: `We could not reach Gatherle to load ${resourceName}. Check your connection, then retry.`,
        title: "You're offline",
      };
    case 'backend':
      return {
        actionLabel: 'Try again',
        message: `Gatherle is having trouble loading ${resourceName} right now. Retry in a moment.`,
        title: 'Gatherle is unavailable',
      };
    case 'unexpected':
    default:
      return {
        actionLabel: 'Try again',
        message: `Something went wrong while loading ${resourceName}. Retry in a moment.`,
        title: `We couldn't load ${resourceName}`,
      };
  }
}

export function ScreenErrorState({ error, onReauthenticate, onRetry, resourceName }: ScreenErrorStateProps) {
  const kind = classifyFrontendFailure(error);
  const copy = buildFailureCopy(kind, resourceName);
  const onPressAction = kind === 'session-expired' ? onReauthenticate : onRetry;

  return (
    <StateNotice
      actionLabel={onPressAction ? copy.actionLabel : undefined}
      message={copy.message}
      onPressAction={onPressAction}
      title={copy.title}
      tone="error"
    />
  );
}
