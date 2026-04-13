import { auth } from '@/auth';
import PersonalizedHome from '@/components/home/PersonalizedHome';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Your Personalized Feed',
  description: 'View personalized recommendations, social activity, and event updates tailored to your interests.',
  noIndex: true,
});

export default async function HomePage() {
  const session = await auth();
  const isAuth = !!session?.user && typeof session.user.userId === 'string';
  if (isAuth && session?.user) {
    const user = {
      id: session.user.userId,
      name: session.user.name ?? undefined,
      email: session.user.email ?? undefined,
      image: session.user.image ?? undefined,
    };
    return <PersonalizedHome user={user} />;
  }
  // Optionally, redirect or show a message for unauthenticated users
  return null;
}
