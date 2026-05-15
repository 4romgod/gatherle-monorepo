import type { Metadata } from 'next';
import { APP_NAME, APP_LOGO_PATH } from '@/lib/constants';

const SITE_NAME = APP_NAME;

const ICONS: Metadata['icons'] = {
  icon: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon-16x16.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', url: '/android-chrome-192x192.png' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', url: '/android-chrome-512x512.png' },
  ],
  shortcut: '/favicon.ico',
  apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
