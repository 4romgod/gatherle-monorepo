'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ERROR_MESSAGES } from '@gatherle/commons/client/constants';
import ErrorPage from '@/components/errors/ErrorPage';
import { useLogout } from '@/hooks/useLogout';
import { ROUTES } from '@/lib/constants';
import { clearBlockedAccountMessage, readBlockedAccountMessage } from '@/lib/utils/app-access-block';

export default function AccountBlockedPageClient() {
  const { data: session, status } = useSession();
  const { isLoggingOut, logout } = useLogout(ROUTES.ACCOUNT_BLOCKED);
  const [message, setMessage] = useState(ERROR_MESSAGES.APP_ACCESS_BLOCKED);
  const logoutRequestedRef = useRef(false);

  useEffect(() => {
    const storedMessage = readBlockedAccountMessage();
    if (storedMessage) {
      setMessage(storedMessage);
    }

    clearBlockedAccountMessage();
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.token && !logoutRequestedRef.current) {
      logoutRequestedRef.current = true;
      void logout({ redirect: false, redirectTo: ROUTES.ACCOUNT_BLOCKED });
    }
  }, [logout, session?.user?.token, status]);

  return (
    <ErrorPage
      statusCode={403}
      title="Account blocked"
      message={message}
      ctaHref={ROUTES.ROOT}
      ctaLabel={isLoggingOut ? 'Signing you out…' : 'Return home'}
    />
  );
}
