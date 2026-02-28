import type { Viewport } from 'next';
import { auth } from '@/auth';
import RootLayout from '@/layouts/root-layout';

export const dynamic = 'force-dynamic';

/**
 * Explicit viewport configuration for a proper mobile-first experience:
 * - Prevents automatic font scaling on orientation change (iOS)
 * - theme-color tints the browser chrome on Android/PWA
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};

export default async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return <RootLayout session={session}>{children}</RootLayout>;
}
