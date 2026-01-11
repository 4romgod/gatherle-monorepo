/**
 * Navigation utilities with progress bar support
 */

import NProgress from 'nprogress';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Navigate programmatically with progress bar
 * Use this instead of router.push() to show the progress bar
 *
 * @param router - Next.js router instance from useRouter()
 * @param href - Destination URL or hash
 * @param options - Navigation options
 */
export function navigateWithProgress(
  router: AppRouterInstance,
  href: string,
  options?: {
    scroll?: boolean;
  },
) {
  // Start progress bar
  NProgress.start();

  // Navigate
  router.push(href, options);
}

/**
 * Navigate to hash fragment without full page reload
 * Scrolls to element smoothly
 *
 * @param hash - Hash fragment (with or without #)
 */
export function navigateToHash(hash: string) {
  const cleanHash = hash.startsWith('#') ? hash : `#${hash}`;

  // Update URL without reload
  if (window.history.pushState) {
    window.history.pushState(null, '', cleanHash);
  } else {
    window.location.hash = cleanHash;
  }

  // Scroll to element
  const element = document.querySelector(cleanHash);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
