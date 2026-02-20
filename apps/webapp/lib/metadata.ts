import type { Metadata } from 'next';

const SITE_NAME = 'Gatherle';

const ICONS: Metadata['icons'] = {
  icon: '/logo-img.png',
  shortcut: '/logo-img.png',
  apple: '/logo-img.png',
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
