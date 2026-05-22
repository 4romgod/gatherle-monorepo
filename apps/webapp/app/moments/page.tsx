import MomentsFeedPageClient from '@/components/eventMoments/MomentsFeedPageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Moments',
  description: 'Watch live event moments from people you follow.',
  keywords: ['moments', 'stories', 'events', 'community'],
});

export default function MomentsPage() {
  return <MomentsFeedPageClient />;
}
