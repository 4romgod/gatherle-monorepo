import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { EventCard } from '@/components/events/EventCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { dedupeOccurrencesBySeries } from '@/lib/events/formatters';

export function MyEventsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const { error, loading, refetch, trendingEvents, upcomingEvents } = useMobileHomeDiscovery(authToken);

  const goingEvents = useMemo(
    () => upcomingEvents.filter((occurrence) => occurrence.myRsvp?.status).slice(0, 6),
    [upcomingEvents],
  );
  const savedEvents = useMemo(
    () =>
      dedupeOccurrencesBySeries(
        trendingEvents.filter((occurrence) => occurrence.eventSeries?.isSavedByMe),
        6,
      ),
    [trendingEvents],
  );
  const hostingEvents = useMemo(
    () =>
      dedupeOccurrencesBySeries(
        [...upcomingEvents, ...trendingEvents].filter((occurrence) =>
          occurrence.eventSeries?.organizers?.some((organizer) => organizer.user?.userId === userId),
        ),
        6,
      ),
    [trendingEvents, upcomingEvents, userId],
  );

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading title="My events" />
        <AuthPromptCard
          description="Sign in to manage the events you’re attending, hosting, and saving."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Your event hub starts after sign-in"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading
        subtitle="Keep an eye on what you’re attending, saving, and putting into the world."
        title="My events"
      />

      {loading && goingEvents.length === 0 && savedEvents.length === 0 && hostingEvents.length === 0 ? (
        <StateNotice message="Loading your event activity..." />
      ) : error ? (
        <StateNotice actionLabel="Retry" message="We couldn’t load your events." onPressAction={() => void refetch()} />
      ) : (
        <View style={styles.sections}>
          <View style={styles.section}>
            <SectionHeading title="Going" />
            {goingEvents.length ? (
              <View style={styles.list}>
                {goingEvents.map((occurrence) => (
                  <EventCard
                    key={occurrence.occurrenceId}
                    occurrence={occurrence}
                    onPress={() => navigation.navigate('EventDetails', { occurrence })}
                  />
                ))}
              </View>
            ) : (
              <StateNotice message="No upcoming RSVPs yet." />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeading title="Saved" />
            {savedEvents.length ? (
              <View style={styles.list}>
                {savedEvents.map((occurrence) => (
                  <EventCard
                    key={occurrence.occurrenceId}
                    occurrence={occurrence}
                    onPress={() => navigation.navigate('EventDetails', { occurrence })}
                  />
                ))}
              </View>
            ) : (
              <StateNotice message="You haven’t saved any events yet." />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeading title="Hosting" />
            {hostingEvents.length ? (
              <View style={styles.list}>
                {hostingEvents.map((occurrence) => (
                  <EventCard
                    key={occurrence.occurrenceId}
                    occurrence={occurrence}
                    onPress={() => navigation.navigate('EventDetails', { occurrence })}
                  />
                ))}
              </View>
            ) : (
              <StateNotice message="Hosting activity will show up here once your events go live." />
            )}
          </View>
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  section: {
    gap: 14,
  },
  sections: {
    gap: 26,
  },
});
