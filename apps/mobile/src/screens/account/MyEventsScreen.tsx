import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { EventCard } from '@/components/events/EventCard';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { EventCardSkeleton } from '@/components/skeleton/EventCardSkeleton';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useHostedEventsByUser } from '@/hooks/events/useHostedEventsByUser';
import { useMyEventOccurrenceRsvps } from '@/hooks/events/useMyEventOccurrenceRsvps';
import { useSavedEvents } from '@/hooks/events/useSavedEvents';

export function MyEventsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const {
    error: hostedEventsError,
    hostedEvents,
    loading: hostedEventsLoading,
    refetch: refetchHostedEvents,
  } = useHostedEventsByUser(userId ?? undefined, authToken, { pageSize: 6 });
  const {
    error: myRsvpEventsError,
    loading: myRsvpEventsLoading,
    refetch: refetchMyRsvpEvents,
    upcomingEvents,
  } = useMyEventOccurrenceRsvps(authToken, false);
  const {
    error: savedEventsError,
    loading: savedEventsLoading,
    refetch: refetchSavedEvents,
    savedEvents,
  } = useSavedEvents(authToken);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetchHostedEvents(), refetchMyRsvpEvents(), refetchSavedEvents()]);
    }, [refetchHostedEvents, refetchMyRsvpEvents, refetchSavedEvents]),
  );

  const goingEvents = useMemo(() => upcomingEvents.slice(0, 6), [upcomingEvents]);
  const hostingEvents = hostedEvents;
  const visibleSavedEvents = useMemo(() => savedEvents.slice(0, 6), [savedEvents]);
  const loading = hostedEventsLoading || myRsvpEventsLoading || savedEventsLoading;
  const error = hostedEventsError || myRsvpEventsError || savedEventsError;

  if (!isAuthenticated) {
    return (
      <PageContainer>
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
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {loading && goingEvents.length === 0 && visibleSavedEvents.length === 0 && hostingEvents.length === 0 ? (
        <View style={styles.sections}>
          <View style={styles.section}>
            <SectionHeading title="Going" />
            <View style={styles.list}>
              <EventCardSkeleton />
            </View>
          </View>
          <View style={styles.section}>
            <SectionHeading title="Saved" />
            <View style={styles.list}>
              <EventCardSkeleton />
            </View>
          </View>
          <View style={styles.section}>
            <SectionHeading title="Hosting" />
            <View style={styles.list}>
              <EventCardSkeleton />
            </View>
          </View>
        </View>
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your events."
          onPressAction={() => void onRefresh()}
        />
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
            {visibleSavedEvents.length ? (
              <View style={styles.list}>
                {visibleSavedEvents.map((occurrence) => (
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
