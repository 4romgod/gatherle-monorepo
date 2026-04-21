import { buildMediaCdnUrl } from '@/utils/mediaUrl';

describe('buildMediaCdnUrl', () => {
  it('builds an HTTPS URL when MEDIA_CDN_DOMAIN is a hostname', () => {
    expect(buildMediaCdnUrl('d111111abcdef8.cloudfront.net', 'dev/event-moments/photo.jpg')).toBe(
      'https://d111111abcdef8.cloudfront.net/dev/event-moments/photo.jpg',
    );
  });

  it('does not prepend a second protocol when MEDIA_CDN_DOMAIN is already a URL', () => {
    expect(buildMediaCdnUrl('https://d111111abcdef8.cloudfront.net', 'dev/event-moments/photo.jpg')).toBe(
      'https://d111111abcdef8.cloudfront.net/dev/event-moments/photo.jpg',
    );
  });

  it('normalizes trailing domain slashes and leading key slashes', () => {
    expect(buildMediaCdnUrl('https://d111111abcdef8.cloudfront.net/', '/dev/event-moments/photo.jpg')).toBe(
      'https://d111111abcdef8.cloudfront.net/dev/event-moments/photo.jpg',
    );
  });

  it('throws when MEDIA_CDN_DOMAIN is blank', () => {
    expect(() => buildMediaCdnUrl(' ', 'dev/event-moments/photo.jpg')).toThrow(
      'MEDIA_CDN_DOMAIN is required to generate media URLs',
    );
  });
});
