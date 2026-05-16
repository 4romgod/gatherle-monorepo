import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';

const SITE_NAME = APP_NAME;

const ICONS: Metadata['icons'] = {
  icon: [
    { rel: 'icon', url: '/favicon-light.ico', media: '(prefers-color-scheme: light)' },
    { rel: 'icon', url: '/favicon-dark.ico', media: '(prefers-color-scheme: dark)' },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-light-16x16.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-dark-16x16.png',
      media: '(prefers-color-scheme: dark)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-light-32x32.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-dark-32x32.png',
      media: '(prefers-color-scheme: dark)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '192x192',
      url: '/android-chrome-light-192x192.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '192x192',
      url: '/android-chrome-dark-192x192.png',
      media: '(prefers-color-scheme: dark)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '512x512',
      url: '/android-chrome-light-512x512.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '512x512',
      url: '/android-chrome-dark-512x512.png',
      media: '(prefers-color-scheme: dark)',
    },
  ],
  shortcut: '/favicon-light.ico',
  apple: [
    {
      url: '/apple-touch-icon-light.png',
      sizes: '180x180',
      type: 'image/png',
      media: '(prefers-color-scheme: light)',
    },
    {
      url: '/apple-touch-icon-dark.png',
      sizes: '180x180',
      type: 'image/png',
      media: '(prefers-color-scheme: dark)',
    },
  ],
};

type BuildMetadataOptions = {
  title: string;
  description: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
};

const withBrand = (title: string): string => {
  if (title.toLowerCase().includes(SITE_NAME.toLowerCase())) {
    return title;
  }
  return `${title} | ${SITE_NAME}`;
};

export const buildPageMetadata = ({
  title,
  description,
  keywords,
  noIndex = false,
  type = 'website',
}: BuildMetadataOptions): Metadata => {
  const fullTitle = withBrand(title);
  const robots = noIndex
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : {
        index: true,
        follow: true,
      };

  return {
    title: fullTitle,
    description,
    keywords,
    icons: ICONS,
    robots,
    openGraph: {
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
};
