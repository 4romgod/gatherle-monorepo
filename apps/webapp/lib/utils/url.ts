import { headers } from 'next/headers';

/**
 * Gets the base URL of the application dynamically based on request headers.
 * Uses http in development and https in production.
 *
 * @returns The base URL (e.g., 'http://localhost:3000' or 'https://ntlango.com')
 *
 * @example
 * ```ts
 * const baseUrl = await getBaseUrl();
 * const eventUrl = `${baseUrl}/events/${slug}`;
 * ```
 */
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = 'https';
  return `${protocol}://${host}`;
}

/**
 * Constructs a full URL for a given path.
 *
 * @param path - The path to append to the base URL (should start with /)
 * @returns The full URL
 *
 * @example
 * ```ts
 * const eventUrl = await getFullUrl('/events/my-event');
 * // Returns: 'http://localhost:3000/events/my-event'
 * ```
 */
export async function getFullUrl(path: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}${path}`;
}
