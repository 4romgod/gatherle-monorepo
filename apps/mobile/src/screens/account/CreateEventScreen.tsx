import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { CreateEventDocument, UpdateEventDocument } from '@data/graphql/mutation/Event/mutation';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import {
  EventLifecycleStatus,
  EventPrivacySetting,
  EventStatus,
  EventVisibility,
  MediaEntityType,
  MediaType,
  type CreateEventInput,
} from '@data/graphql/types/graphql';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSwitchRow } from '@/components/account/shared/AccountSwitchRow';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { getApolloAuthContext } from '@/lib/auth';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

const COMMON_TIMEZONES = [
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
] as const;

type RecurrenceOption = 'once' | 'weekly' | 'monthly';

const RECURRENCE_RULES: Record<RecurrenceOption, string> = {
  monthly: 'FREQ=MONTHLY',
  once: 'FREQ=DAILY;COUNT=1',
  weekly: 'FREQ=WEEKLY',
};

type EventFormState = {
  allowGuestPlusOnes: boolean;
  capacity: string;
  city: string;
  country: string;
  date: string;
  description: string;
  endTime: string;
  eventLink: string;
  orgId: string;
  privacySetting: EventPrivacySetting;
  recurrence: RecurrenceOption;
  startTime: string;
  state: string;
  summary: string;
  timezone: string;
  title: string;
  venueId: string;
  visibility: EventVisibility;
  waitlistEnabled: boolean;
};

const initialFormState: EventFormState = {
  allowGuestPlusOnes: true,
  capacity: '',
  city: '',
  country: 'South Africa',
  date: '',
  description: '',
  endTime: '',
  eventLink: '',
  orgId: '',
  privacySetting: EventPrivacySetting.Public,
  recurrence: 'once',
  startTime: '',
  state: '',
  summary: '',
  timezone: 'Africa/Johannesburg',
  title: '',
  venueId: '',
  visibility: EventVisibility.Public,
  waitlistEnabled: false,
};

export function CreateEventScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
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
    skip: !authToken || !isAuthenticated,
    ...getApolloAuthContext(authToken),
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formState, setFormState] = useState<EventFormState>(initialFormState);
  const [selectedFeaturedImage, setSelectedFeaturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      if (!authToken || !isAuthenticated) {
        return;
      }

      await Promise.all([refetchDiscovery(), organizationsQuery.refetch(), venuesQuery.refetch()]);
    }, [authToken, isAuthenticated, organizationsQuery, refetchDiscovery, venuesQuery]),
  );

  const [createEvent, { loading: creating }] = useMutation(CreateEventDocument, getApolloAuthContext(authToken));
  const [updateEvent] = useMutation(UpdateEventDocument, getApolloAuthContext(authToken));
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });

  const eligibleOrganizations = organizationsQuery.data?.readMyOrganizations ?? [];
  const venues = venuesQuery.data?.readVenues ?? [];
  const selectedVenue = venues.find((venue) => venue.venueId === formState.venueId);

  const loading = creating;

  const venueSuggestions = useMemo(() => venues.slice(0, 6), [venues]);

  const updateField = <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const pickFeaturedImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library access is required to add a featured image.', tone: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedFeaturedImage(result.assets[0]);
    }
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

    const capacityNum = formState.capacity.trim() ? Number.parseInt(formState.capacity, 10) : undefined;

    return {
      additionalDetails: {},
      allowGuestPlusOnes: formState.allowGuestPlusOnes,
      capacity: capacityNum != null && !Number.isNaN(capacityNum) ? capacityNum : undefined,
      comments: {},
      description: formState.description.trim(),
      eventCategories: selectedCategories,
      eventLink: formState.eventLink.trim() || undefined,
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
        recurrenceRule: RECURRENCE_RULES[formState.recurrence],
        timezone: formState.timezone,
      },
      privacySetting: formState.privacySetting,
      remindersEnabled: true,
      showAttendees: true,
      status: EventStatus.Upcoming,
      summary: formState.summary.trim(),
      title: formState.title.trim(),
      venueId: selectedVenue?.venueId,
      visibility: formState.visibility,
      waitlistEnabled: formState.waitlistEnabled,
    };
  };

  const submit = async () => {
    const input = buildInput();

    if (!input) {
      showToast({
        message: 'Please complete the required fields and ensure the end time is after the start time.',
        tone: 'error',
      });
      return;
    }

    try {
      await withBlockingLoader('Creating event…', async () => {
        const result = await createEvent({
          variables: {
            input,
          },
        });

        const createdEventId = result.data?.createEvent?.eventId;

        if (createdEventId && selectedFeaturedImage) {
          try {
            const ext = getImageAssetExtension(selectedFeaturedImage);
            const { data: urlData } = await getUploadUrl({
              variables: {
                entityId: createdEventId,
                entityType: MediaEntityType.EventSeries,
                extension: ext,
                mediaType: MediaType.Featured,
              },
            });
            if (urlData?.getMediaUploadUrl) {
              const { uploadUrl, readUrl } = urlData.getMediaUploadUrl;
              await uploadImageAssetToSignedUrl(uploadUrl, selectedFeaturedImage);
              await updateEvent({
                variables: {
                  input: {
                    eventId: createdEventId,
                    media: { featuredImageUrl: readUrl },
                  },
                },
              });
            }
          } catch {
            // Featured image upload is non-fatal — event was created successfully
          }
        }

        showToast({
          message: 'Event created. You can now find it in your events and the discovery feed.',
          tone: 'success',
        });

        if (result.data?.createEvent) {
          navigation.navigate('MyEvents');
        }
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't create the event.",
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
        <AccountTextField
          label="Event link (optional)"
          onChangeText={(value) => updateField('eventLink', value)}
          placeholder="https://..."
          value={formState.eventLink}
        />

        {/* Featured image picker */}
        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Featured image (optional)</Text>
          {selectedFeaturedImage ? (
            <Pressable onPress={() => void pickFeaturedImage()}>
              <Image
                source={{ uri: selectedFeaturedImage.uri }}
                style={[styles.featuredImagePreview, { borderColor: theme.colors.border }]}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void pickFeaturedImage()}
              style={[styles.imagePlaceholder, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Tap to choose image</Text>
            </Pressable>
          )}
        </View>
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
          Use 24-hour time. Dates are formatted as YYYY-MM-DD.
        </Text>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Recurrence</Text>
          <View style={styles.choiceWrap}>
            {(['once', 'weekly', 'monthly'] as RecurrenceOption[]).map((opt) => (
              <AccountChoiceChip
                key={opt}
                label={opt === 'once' ? 'One-time' : opt === 'weekly' ? 'Weekly' : 'Monthly'}
                onPress={() => updateField('recurrence', opt)}
                selected={formState.recurrence === opt}
              />
            ))}
          </View>
        </View>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Timezone</Text>
          <View style={styles.choiceWrap}>
            {COMMON_TIMEZONES.map((tz) => (
              <AccountChoiceChip
                key={tz}
                label={tz}
                onPress={() => updateField('timezone', tz)}
                selected={formState.timezone === tz}
              />
            ))}
          </View>
        </View>
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

      <View style={styles.section}>
        <SectionHeading title="Access & settings" />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Visibility</Text>
          <View style={styles.choiceWrap}>
            {[EventVisibility.Public, EventVisibility.Private, EventVisibility.Unlisted].map((vis) => (
              <AccountChoiceChip
                key={vis}
                label={vis}
                onPress={() => updateField('visibility', vis)}
                selected={formState.visibility === vis}
              />
            ))}
          </View>
        </View>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Privacy</Text>
          <View style={styles.choiceWrap}>
            {[EventPrivacySetting.Public, EventPrivacySetting.Invitation, EventPrivacySetting.Private].map((ps) => (
              <AccountChoiceChip
                key={ps}
                label={ps === EventPrivacySetting.Invitation ? 'Invite only' : ps}
                onPress={() => updateField('privacySetting', ps)}
                selected={formState.privacySetting === ps}
              />
            ))}
          </View>
        </View>

        <AccountTextField
          keyboardType="phone-pad"
          label="Capacity (optional)"
          onChangeText={(value) => updateField('capacity', value)}
          placeholder="e.g. 100"
          value={formState.capacity}
        />

        <AccountSwitchRow
          description="Allow people to join a waitlist when the event is full."
          onValueChange={(value) => updateField('waitlistEnabled', value)}
          title="Waitlist"
          value={formState.waitlistEnabled}
        />
        <AccountSwitchRow
          description="Allow attendees to bring a plus-one."
          onValueChange={(value) => updateField('allowGuestPlusOnes', value)}
          title="Allow plus-ones"
          value={formState.allowGuestPlusOnes}
        />
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
  featuredImagePreview: {
    borderRadius: 8,
    borderWidth: 1,
    height: 160,
    width: '100%',
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
  imagePlaceholder: {
    alignItems: 'center',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 100,
    justifyContent: 'center',
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
