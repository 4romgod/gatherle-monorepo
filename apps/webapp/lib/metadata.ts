import type { Metadata } from 'next';
import { APP_NAME, APP_LOGO_PATH } from '@/lib/constants';

const SITE_NAME = APP_NAME;

const ICONS: Metadata['icons'] = {
  icon: APP_LOGO_PATH,
  shortcut: APP_LOGO_PATH,
  apple: APP_LOGO_PATH,
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
