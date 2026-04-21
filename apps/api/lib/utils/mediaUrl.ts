export function buildMediaCdnUrl(mediaCdnDomain: string, key: string): string {
  const trimmedDomain = mediaCdnDomain.trim().replace(/\/+$/, '');
  const trimmedKey = key.replace(/^\/+/, '');

  if (!trimmedDomain) {
    throw new Error('MEDIA_CDN_DOMAIN is required to generate media URLs');
  }

  const baseUrl = /^https?:\/\//i.test(trimmedDomain) ? trimmedDomain : `https://${trimmedDomain}`;

  return `${baseUrl}/${trimmedKey}`;
}
