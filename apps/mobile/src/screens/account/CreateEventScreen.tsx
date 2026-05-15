import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { CreateEventDocument } from '@data/graphql/mutation/Event/mutation';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import {
  EventLifecycleStatus,
  EventPrivacySetting,
  EventStatus,
  EventVisibility,
  type CreateEventInput,
} from '@data/graphql/types/graphql';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountStatusBanner } from '@/components/account/shared/AccountStatusBanner';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type EventFormState = {
  city: string;
  country: string;
  date: string;
  description: string;
  endTime: string;
  orgId: string;
  startTime: string;
  state: string;
  summary: string;
  title: string;
  venueId: string;
};

const initialFormState: EventFormState = {
  city: '',
  country: 'South Africa',
  date: '',
  description: '',
  endTime: '',
  orgId: '',
  startTime: '',
  state: '',
  summary: '',
  title: '',
  venueId: '',
};

export function CreateEventScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const { theme } = useAppTheme();
  const { categories, refetch: refetchDiscovery } = useMobileHomeDiscovery(authToken);
  const organizationsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !authToken || !isAuthenticated,
    ...getApolloAuthContext(authToken),
  });
  const venuesQuery = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formState, setFormState] = useState<EventFormState>(initialFormState);
  const [statusMessage, setStatusMessage] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetchDiscovery(), organizationsQuery.refetch(), venuesQuery.refetch()]);
    }, [organizationsQuery, refetchDiscovery, venuesQuery]),
  );

  const [createEvent, { loading }] = useMutation(CreateEventDocument, getApolloAuthContext(authToken));

  const eligibleOrganizations = organizationsQuery.data?.readMyOrganizations ?? [];
  const venues = venuesQuery.data?.readVenues ?? [];
  const selectedVenue = venues.find((venue) => venue.venueId === formState.venueId);

  const isFormValid = Boolean(
    userId &&
    formState.title.trim() &&
    formState.summary.trim() &&
    formState.description.trim() &&
    formState.date &&
    formState.startTime &&
    formState.endTime &&
    selectedCategories.length > 0,
  );

  const venueSuggestions = useMemo(() => venues.slice(0, 6), [venues]);

  const updateField = (field: keyof EventFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((current) =>
      current.includes(categoryId) ? current.filter((value) => value !== categoryId) : [...current, categoryId],
    );
  };

  const buildInput = (): CreateEventInput | null => {
    if (!userId) {
      return null;
    }

    const startAt = new Date(`${formState.date}T${formState.startTime}:00`);
    const endAt = new Date(`${formState.date}T${formState.endTime}:00`);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return null;
    }

    const occurrenceDurationMinutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));

    const locationAddress = selectedVenue
      ? {
          city: selectedVenue.address?.city ?? formState.city,
          country: selectedVenue.address?.country ?? formState.country,
          state: selectedVenue.address?.region ?? formState.state,
          street: selectedVenue.address?.street ?? '',
          zipCode: selectedVenue.address?.postalCode ?? '',
        }
      : {
          city: formState.city,
          country: formState.country,
          state: formState.state,
        };

    const locationSnapshot = [locationAddress.city, locationAddress.state, locationAddress.country]
      .filter(Boolean)
      .join(', ');

    return {
      additionalDetails: {},
      allowGuestPlusOnes: true,
      capacity: 120,
      comments: {},
      description: formState.description.trim(),
      eventCategories: selectedCategories,
      lifecycleStatus: EventLifecycleStatus.Published,
      location: {
        address: locationAddress,
        details: selectedVenue?.name ?? '',
        locationType: selectedVenue ? 'venue' : 'address',
      },
      locationSnapshot,
      media: {},
      orgId: formState.orgId || undefined,
      organizers: [{ role: 'Host', user: userId }],
      primarySchedule: {
        anchorStartAt: startAt.toISOString(),
        occurrenceDurationMinutes,
        recurrenceRule: 'FREQ=DAILY;COUNT=1',
        timezone: 'Africa/Johannesburg',
      },
      privacySetting: EventPrivacySetting.Public,
      remindersEnabled: true,
      showAttendees: true,
      status: EventStatus.Upcoming,
      summary: formState.summary.trim(),
      title: formState.title.trim(),
      venueId: selectedVenue?.venueId,
      visibility: EventVisibility.Public,
      waitlistEnabled: false,
    };
  };

  const submit = async () => {
    const input = buildInput();

    if (!input) {
      setStatusMessage({
        message: 'Please complete the required fields and ensure the end time is after the start time.',
        tone: 'error',
      });
      return;
    }

    try {
      const result = await createEvent({
        variables: {
          input,
        },
      });

      setStatusMessage({
        message: 'Event created. You can now find it in your events and the discovery feed.',
        tone: 'success',
      });

      if (result.data?.createEvent) {
        navigation.navigate('MyEvents');
      }
    } catch (error) {
      setStatusMessage({
        message: error instanceof Error ? error.message : 'We couldn’t create the event.',
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer contentContainerStyle={styles.pageContent}>
        <AuthPromptCard
          description="Sign in to publish events, attach organizations, and manage attendee flow from mobile."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Host mode starts after sign-in"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer contentContainerStyle={styles.pageContent} onRefresh={onRefresh} refreshing={refreshing}>
      {statusMessage ? <AccountStatusBanner message={statusMessage.message} tone={statusMessage.tone} /> : null}

      <View style={styles.section}>
        <SectionHeading title="Basics" />
        <AccountTextField label="Title" onChangeText={(value) => updateField('title', value)} value={formState.title} />
        <AccountTextField
          label="Summary"
          onChangeText={(value) => updateField('summary', value)}
          value={formState.summary}
        />
        <AccountTextField
          label="Description"
          multiline
          onChangeText={(value) => updateField('description', value)}
          value={formState.description}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title="Schedule" />
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <AccountTextField
              label="Date"
              onChangeText={(value) => updateField('date', value)}
              placeholder="2026-05-20"
              value={formState.date}
            />
          </View>
          <View style={styles.fieldHalf}>
            <AccountTextField
              label="Start"
              onChangeText={(value) => updateField('startTime', value)}
              placeholder="18:00"
              value={formState.startTime}
            />
          </View>
        </View>
        <View style={styles.fieldHalfSingle}>
          <AccountTextField
            label="End"
            onChangeText={(value) => updateField('endTime', value)}
            placeholder="21:00"
            value={formState.endTime}
          />
        </View>
        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
          Use 24-hour time for now. Single-event publishing uses one occurrence and keeps the flow mobile-friendly.
        </Text>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Location" />
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <AccountTextField
              label="City"
              onChangeText={(value) => updateField('city', value)}
              value={formState.city}
            />
          </View>
          <View style={styles.fieldHalf}>
            <AccountTextField
              label="State"
              onChangeText={(value) => updateField('state', value)}
              value={formState.state}
            />
          </View>
        </View>
        <AccountTextField
          label="Country"
          onChangeText={(value) => updateField('country', value)}
          value={formState.country}
        />
        {venueSuggestions.length > 0 ? (
          <View style={styles.choiceBlock}>
            <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Venue</Text>
            <View style={styles.choiceWrap}>
              <AccountChoiceChip
                label="Custom address"
                onPress={() => updateField('venueId', '')}
                selected={!formState.venueId}
              />
              {venueSuggestions.map((venue) => (
                <AccountChoiceChip
                  key={venue.venueId}
                  label={venue.name}
                  onPress={() => updateField('venueId', venue.venueId)}
                  selected={formState.venueId === venue.venueId}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeading title="Community context" />
        {eligibleOrganizations.length > 0 ? (
          <View style={styles.choiceBlock}>
            <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Organization</Text>
            <View style={styles.choiceWrap}>
              <AccountChoiceChip
                label="Personal event"
                onPress={() => updateField('orgId', '')}
                selected={!formState.orgId}
              />
              {eligibleOrganizations.map((membership) => (
                <AccountChoiceChip
                  key={membership.organization.orgId}
                  label={membership.organization.name}
                  onPress={() => updateField('orgId', membership.organization.orgId)}
                  selected={formState.orgId === membership.organization.orgId}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Categories</Text>
          <View style={styles.choiceWrap}>
            {categories.slice(0, 10).map((category) => (
              <AccountChoiceChip
                key={category.eventCategoryId}
                label={category.name}
                onPress={() => toggleCategory(category.eventCategoryId)}
                selected={selectedCategories.includes(category.eventCategoryId)}
              />
            ))}
          </View>
        </View>
      </View>

      <AccountPrimaryButton icon="plus-circle" label="Create event" loading={loading} onPress={() => void submit()} />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  choiceBlock: {
    gap: 10,
  },
  choiceLabel: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldHalfSingle: {
    maxWidth: '48%',
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  pageContent: {
    gap: 24,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    gap: 14,
  },
});
