import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { filterOrganizationMembershipsThatCanManageEvents } from '@gatherle/commons/client/utils';
import {
  buildEventRecurrenceRule,
  formatRRuleUntilToken,
  normalizeRecurrenceInterval,
} from '@gatherle/commons/client/utils';
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
import { DatePickerField } from '@/components/core/DatePickerField';
import { SelectionControl } from '@/components/core/SelectionControl';
import { SectionHeading } from '@/components/core/SectionHeading';
import { TimePickerField } from '@/components/core/TimePickerField';
import { EventLocationEditor } from '@/components/events/EventLocationEditor';
import { EventRecurrenceEditor } from '@/components/events/EventRecurrenceEditor';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { getApolloAuthContext } from '@/lib/auth';
import {
  COMMON_EVENT_TIMEZONES,
  initialMobileEventRecurrenceState,
  ensureWeeklyRecurrenceDays,
  type MobileEventRecurrenceState,
} from '@/lib/events/eventMutationForm';
import {
  buildMobileEventLocationPayload,
  type MobileEventLocationType,
  validateMobileEventLocation,
} from '@/lib/events/location';
import { buildIsoFromTimeZoneDateAndTime } from '@/lib/events/organizerSessions';
import { MOBILE_MEDIA_ASPECT_RATIOS, MOBILE_MEDIA_PICKER_ASPECTS } from '@/lib/media/constants';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type EventFormState = {
  allowGuestPlusOnes: boolean;
  capacity: string;
  city: string;
  country: string;
  date: string;
  description: string;
  endTime: string;
  eventLink: string;
  locationDetails: string;
  locationType: MobileEventLocationType;
  orgId: string;
  postalCode: string;
  privacySetting: EventPrivacySetting;
  recurrence: MobileEventRecurrenceState;
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
  locationDetails: '',
  locationType: 'venue',
  orgId: '',
  postalCode: '',
  privacySetting: EventPrivacySetting.Public,
  recurrence: initialMobileEventRecurrenceState,
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
  const { authToken, isAuthenticated, userId, username } = useAppShell();
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

  const eligibleOrganizations = filterOrganizationMembershipsThatCanManageEvents(
    organizationsQuery.data?.readMyOrganizations,
  );
  const venues = venuesQuery.data?.readVenues ?? [];
  const selectedVenue = venues.find((venue) => venue.venueId === formState.venueId);

  const loading = creating;

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
      aspect: MOBILE_MEDIA_PICKER_ASPECTS.eventCover,
      mediaTypes: 'images',
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
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

    const startIso = buildIsoFromTimeZoneDateAndTime(formState.date, formState.startTime, formState.timezone);
    const endIso = buildIsoFromTimeZoneDateAndTime(formState.date, formState.endTime, formState.timezone);

    if (!startIso || !endIso) {
      return null;
    }

    const startAt = new Date(startIso);
    const endAt = new Date(endIso);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return null;
    }

    const occurrenceDurationMinutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
    const repeatUntilIso =
      formState.recurrence.kind === 'recurring' && formState.recurrence.repeatUntilDate
        ? buildIsoFromTimeZoneDateAndTime(formState.recurrence.repeatUntilDate, formState.startTime, formState.timezone)
        : null;
    const recurrenceRule = buildEventRecurrenceRule({
      daysOfWeek:
        formState.recurrence.frequency === 'WEEKLY'
          ? ensureWeeklyRecurrenceDays(formState.recurrence.daysOfWeek, formState.date)
          : formState.recurrence.daysOfWeek,
      frequency: formState.recurrence.frequency,
      interval: normalizeRecurrenceInterval(formState.recurrence.interval),
      kind: formState.recurrence.kind,
      untilToken: formatRRuleUntilToken(repeatUntilIso),
    });
    const { location, locationSnapshot, venueId } = buildMobileEventLocationPayload(formState, selectedVenue);

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
      location,
      locationSnapshot,
      media: {},
      orgId: formState.orgId || undefined,
      organizers: [{ role: 'Host', user: userId }],
      primarySchedule: {
        anchorStartAt: startIso,
        occurrenceDurationMinutes,
        recurrenceRule,
        timezone: formState.timezone,
      },
      privacySetting: formState.privacySetting,
      remindersEnabled: true,
      showAttendees: true,
      status: EventStatus.Upcoming,
      summary: formState.summary.trim(),
      title: formState.title.trim(),
      venueId,
      visibility: formState.visibility,
      waitlistEnabled: formState.waitlistEnabled,
    };
  };

  const submit = async () => {
    const locationValidationMessage = validateMobileEventLocation(formState);
    if (locationValidationMessage) {
      showToast({
        message: locationValidationMessage,
        tone: 'error',
      });
      return;
    }

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
          if (userId) {
            navigation.navigate('UserHostedEvents', {
              userId,
              username,
            });
          } else {
            navigation.navigate('MyEvents');
          }
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
      <PageContainer contentContainerStyle={styles.pageContent} disablePullToRefresh>
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
    <PageContainer
      contentContainerStyle={styles.pageContent}
      disablePullToRefresh
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      <View style={styles.section}>
        <SectionHeading title="Basics" />
        <AccountTextField
          label="Title"
          onChangeText={(value) => updateField('title', value)}
          placeholder="Wednesday Coffee & Code"
          value={formState.title}
        />
        <AccountTextField
          label="Summary"
          onChangeText={(value) => updateField('summary', value)}
          placeholder="A quick snapshot people can scan in the feed."
          value={formState.summary}
        />
        <AccountTextField
          label="Description"
          multiline
          onChangeText={(value) => updateField('description', value)}
          placeholder="What is happening, who should come, and why it is worth showing up?"
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
        <DatePickerField
          label="Date"
          minimumDate={new Date()}
          onChangeDate={(value) => updateField('date', value)}
          placeholder="Select event date"
          value={formState.date}
        />
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <TimePickerField
              label="Start"
              onChangeTime={(value) => updateField('startTime', value)}
              placeholder="Select start time"
              value={formState.startTime}
            />
          </View>
          <View style={styles.fieldHalf}>
            <TimePickerField
              label="End"
              onChangeTime={(value) => updateField('endTime', value)}
              placeholder="Select end time"
              value={formState.endTime}
            />
          </View>
        </View>
        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
          Pick the event date and local start/end times in the selected timezone.
        </Text>

        <EventRecurrenceEditor
          date={formState.date}
          onChange={(value) => updateField('recurrence', value)}
          value={formState.recurrence}
        />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Timezone</Text>
          <View style={styles.choiceWrap}>
            {COMMON_EVENT_TIMEZONES.map((tz) => (
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
        <EventLocationEditor
          city={formState.city}
          country={formState.country}
          locationDetails={formState.locationDetails}
          locationType={formState.locationType}
          onChangeCity={(value) => updateField('city', value)}
          onChangeCountry={(value) => updateField('country', value)}
          onChangeLocationDetails={(value) => updateField('locationDetails', value)}
          onChangeLocationType={(value) => {
            updateField('locationType', value);
            if (value !== 'venue') {
              updateField('venueId', '');
            }
          }}
          onChangePostalCode={(value) => updateField('postalCode', value)}
          onChangeState={(value) => updateField('state', value)}
          onChangeVenueId={(value) => updateField('venueId', value)}
          onPressCreateVenue={() => navigation.navigate('CreateVenue')}
          postalCode={formState.postalCode}
          state={formState.state}
          venueId={formState.venueId}
          venues={venues}
        />
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
          <View style={styles.selectionGrid}>
            {categories.slice(0, 10).map((category) => (
              <SelectionControl
                key={category.eventCategoryId}
                kind="checkbox"
                label={category.name}
                onPress={() => toggleCategory(category.eventCategoryId)}
                selected={selectedCategories.includes(category.eventCategoryId)}
                style={styles.selectionGridItem}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Access & settings" />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Visibility</Text>
          <View style={styles.selectionStack}>
            {[EventVisibility.Public, EventVisibility.Private, EventVisibility.Unlisted].map((vis) => (
              <SelectionControl
                key={vis}
                description={
                  vis === EventVisibility.Public
                    ? 'Shows up in discovery and search.'
                    : vis === EventVisibility.Private
                      ? 'Only eligible people can access it directly.'
                      : 'Hidden from discovery, but accessible with a link.'
                }
                kind="radio"
                label={vis}
                onPress={() => updateField('visibility', vis)}
                selected={formState.visibility === vis}
              />
            ))}
          </View>
        </View>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Privacy</Text>
          <View style={styles.selectionStack}>
            {[EventPrivacySetting.Public, EventPrivacySetting.Invitation, EventPrivacySetting.Private].map((ps) => (
              <SelectionControl
                key={ps}
                description={
                  ps === EventPrivacySetting.Public
                    ? 'Anyone who can see the event can RSVP.'
                    : ps === EventPrivacySetting.Invitation
                      ? 'People need an invite or approval to join.'
                      : 'Attendance stays tightly restricted.'
                }
                kind="radio"
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
    aspectRatio: MOBILE_MEDIA_ASPECT_RATIOS.eventCover,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  fieldHalf: {
    flex: 1,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  imagePlaceholder: {
    alignItems: 'center',
    aspectRatio: MOBILE_MEDIA_ASPECT_RATIOS.eventCover,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
  },
  pageContent: {
    gap: 30,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionGridItem: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  selectionStack: {
    gap: 8,
  },
  section: {
    gap: 16,
  },
});
