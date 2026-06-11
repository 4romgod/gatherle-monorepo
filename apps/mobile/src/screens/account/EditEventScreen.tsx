import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import {
  buildEventRecurrenceRule,
  filterOrganizationMembershipsThatCanManageEvents,
  formatRRuleUntilToken,
  normalizeRecurrenceInterval,
  parseEventRecurrenceRule,
  parseRRuleUntilToken,
} from '@gatherle/commons/client/utils';
import * as ImagePicker from 'expo-image-picker';
import { UpdateEventDocument } from '@data/graphql/mutation/Event/mutation';
import { GetEventByIdDocument } from '@data/graphql/query/Event/query';
import { GetEventCategoriesDocument } from '@data/graphql/query/EventCategory/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { GetMyOrganizationsDocument } from '@data/graphql/query/Organization/query';
import {
  EventPrivacySetting,
  EventVisibility,
  MediaEntityType,
  MediaType,
  type UpdateEventInput,
} from '@data/graphql/types/graphql';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/navigation/routes';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSwitchRow } from '@/components/account/shared/AccountSwitchRow';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { DatePickerField } from '@/components/core/DatePickerField';
import { PageContainer } from '@/components/core/PageContainer';
import { SelectionControl } from '@/components/core/SelectionControl';
import { SectionHeading } from '@/components/core/SectionHeading';
import { TimePickerField } from '@/components/core/TimePickerField';
import { EventLocationEditor } from '@/components/events/EventLocationEditor';
import { EventRecurrenceEditor } from '@/components/events/EventRecurrenceEditor';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import {
  COMMON_EVENT_TIMEZONES,
  ensureWeeklyRecurrenceDays,
  initialMobileEventRecurrenceState,
  type MobileEventRecurrenceState,
} from '@/lib/events/eventMutationForm';
import {
  buildMobileEventLocationPayload,
  normalizeMobileEventLocationType,
  type MobileEventLocationType,
  validateMobileEventLocation,
} from '@/lib/events/location';
import {
  buildIsoFromTimeZoneDateAndTime,
  formatDateInputInTimeZone,
  formatTimeInputInTimeZone,
} from '@/lib/events/organizerSessions';
import { MOBILE_MEDIA_ASPECT_RATIOS, MOBILE_MEDIA_PICKER_ASPECTS } from '@/lib/media/constants';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type EditEventRouteProps = RouteProp<RootStackParamList, 'EditEvent'>;

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
  timezone: 'UTC',
  title: '',
  venueId: '',
  visibility: EventVisibility.Public,
  waitlistEnabled: false,
};

export function EditEventScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const route = useRoute<EditEventRouteProps>();
  const { eventId } = route.params;
  const { authToken, isAuthenticated, userId, username } = useAppShell();
  const { theme } = useAppTheme();

  const eventQuery = useQuery(GetEventByIdDocument, {
    variables: { eventId },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });
  const categoriesQuery = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-first',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });
  const organizationsQuery = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });
  const venuesQuery = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });

  const [formState, setFormState] = useState<EventFormState>(initialFormState);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFeaturedImage, setSelectedFeaturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const event = eventQuery.data?.readEventById;

  // Hydrate form from loaded event data
  useEffect(() => {
    if (event && !hydrated) {
      const schedule = event.primarySchedule;
      const timezone = schedule?.timezone ?? 'UTC';
      const anchorStartAt = schedule?.anchorStartAt ?? null;
      const durationMinutes = schedule?.occurrenceDurationMinutes ?? 0;
      const parsedRecurrence = parseEventRecurrenceRule(schedule?.recurrenceRule);
      const repeatUntil = parseRRuleUntilToken(parsedRecurrence.untilToken);
      const endAt =
        anchorStartAt && Number.isFinite(durationMinutes)
          ? new Date(new Date(anchorStartAt).getTime() + durationMinutes * 60000)
          : null;

      setFormState({
        allowGuestPlusOnes: event.allowGuestPlusOnes ?? true,
        capacity: event.capacity != null ? String(event.capacity) : '',
        city: event.location?.address?.city ?? '',
        country: event.location?.address?.country ?? 'South Africa',
        date: formatDateInputInTimeZone(anchorStartAt, timezone),
        description: event.description ?? '',
        endTime: formatTimeInputInTimeZone(endAt, timezone),
        eventLink: event.eventLink ?? '',
        locationDetails: event.location?.details ?? '',
        locationType: normalizeMobileEventLocationType(event.location),
        orgId: event.orgId ?? '',
        postalCode: event.location?.address?.zipCode ?? '',
        privacySetting: (event.privacySetting as EventPrivacySetting) ?? EventPrivacySetting.Public,
        recurrence: {
          daysOfWeek: parsedRecurrence.daysOfWeek,
          frequency: parsedRecurrence.frequency,
          interval: String(parsedRecurrence.interval),
          kind: parsedRecurrence.kind,
          repeatUntilDate: formatDateInputInTimeZone(repeatUntil, timezone),
        },
        startTime: formatTimeInputInTimeZone(anchorStartAt, timezone),
        state: event.location?.address?.state ?? '',
        summary: event.summary ?? '',
        timezone,
        title: event.title ?? '',
        venueId: event.venueId ?? '',
        visibility: (event.visibility as EventVisibility) ?? EventVisibility.Public,
        waitlistEnabled: event.waitlistEnabled ?? false,
      });
      setSelectedCategories(event.eventCategories?.map((category) => category.eventCategoryId) ?? []);
      setHydrated(true);
    }
  }, [event, hydrated]);

  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      if (!isAuthenticated || !authToken) {
        return;
      }

      await Promise.all([
        eventQuery.refetch(),
        categoriesQuery.refetch(),
        organizationsQuery.refetch(),
        venuesQuery.refetch(),
      ]);
    }, [authToken, categoriesQuery, eventQuery, isAuthenticated, organizationsQuery, venuesQuery]),
  );

  const [updateEvent, { loading: saving }] = useMutation(UpdateEventDocument, getApolloAuthContext(authToken));
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });

  const venues = venuesQuery.data?.readVenues ?? [];
  const categories = categoriesQuery.data?.readEventCategories ?? [];
  const eligibleOrganizations = filterOrganizationMembershipsThatCanManageEvents(
    organizationsQuery.data?.readMyOrganizations,
  );
  const selectedVenue = venues.find((venue) => venue.venueId === formState.venueId);

  const updateField = <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((current) =>
      current.includes(categoryId) ? current.filter((value) => value !== categoryId) : [...current, categoryId],
    );
  };

  const pickFeaturedImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library access is required to update the featured image.', tone: 'error' });
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

  const save = async () => {
    const startIso = buildIsoFromTimeZoneDateAndTime(formState.date, formState.startTime, formState.timezone);
    const endIso = buildIsoFromTimeZoneDateAndTime(formState.date, formState.endTime, formState.timezone);

    if (!startIso || !endIso) {
      showToast({
        message: 'Please complete the date and time fields before saving.',
        tone: 'error',
      });
      return;
    }

    const startAt = new Date(startIso);
    const endAt = new Date(endIso);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      showToast({
        message: 'Please make sure the end time is after the start time.',
        tone: 'error',
      });
      return;
    }

    const occurrenceDurationMinutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
    const capacityNum = formState.capacity.trim() ? Number.parseInt(formState.capacity, 10) : undefined;
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
    const locationValidationMessage = validateMobileEventLocation(formState);
    if (locationValidationMessage) {
      showToast({
        message: locationValidationMessage,
        tone: 'error',
      });
      return;
    }

    const { location, locationSnapshot, venueId } = buildMobileEventLocationPayload(formState, selectedVenue);

    const input: UpdateEventInput = {
      allowGuestPlusOnes: formState.allowGuestPlusOnes,
      capacity: capacityNum != null && !Number.isNaN(capacityNum) ? capacityNum : undefined,
      description: formState.description.trim() || undefined,
      eventId,
      eventCategories: selectedCategories,
      eventLink: formState.eventLink.trim() || undefined,
      location,
      locationSnapshot,
      orgId: formState.orgId || undefined,
      privacySetting: formState.privacySetting,
      primarySchedule: {
        anchorStartAt: startIso,
        occurrenceDurationMinutes,
        recurrenceRule,
        timezone: formState.timezone,
      },
      summary: formState.summary.trim() || undefined,
      title: formState.title.trim() || undefined,
      venueId,
      visibility: formState.visibility,
      waitlistEnabled: formState.waitlistEnabled,
    };

    try {
      await withBlockingLoader('Saving event…', async () => {
        let mediaUpdate: Record<string, unknown> | undefined;
        if (selectedFeaturedImage) {
          try {
            const ext = getImageAssetExtension(selectedFeaturedImage);
            const { data: urlData } = await getUploadUrl({
              variables: {
                entityId: eventId,
                entityType: MediaEntityType.EventSeries,
                extension: ext,
                mediaType: MediaType.Featured,
              },
            });
            if (urlData?.getMediaUploadUrl) {
              const { uploadUrl, readUrl } = urlData.getMediaUploadUrl;
              await uploadImageAssetToSignedUrl(uploadUrl, selectedFeaturedImage);
              mediaUpdate = { featuredImageUrl: readUrl };
            }
          } catch {
            // Image upload failure is non-fatal
          }
        }

        await updateEvent({
          variables: {
            input: {
              ...input,
              ...(mediaUpdate ? { media: mediaUpdate } : {}),
            },
          },
        });

        let nextEvent = event;

        try {
          const refreshedEvent = await eventQuery.refetch();
          nextEvent = refreshedEvent.data?.readEventById ?? nextEvent;
        } catch {
          // Keep the pre-save event snapshot as a fallback so a successful save
          // still returns to the event flow instead of a confusing hosted-events list.
        }

        showToast({ message: 'Event updated successfully.', tone: 'success' });

        const updatedOccurrence = nextEvent ? mapEventSeriesToOccurrence(nextEvent) : null;
        if (updatedOccurrence) {
          navigation.navigate('EventDetails', { occurrence: updatedOccurrence });
          return;
        }

        if (userId) {
          navigation.navigate('UserHostedEvents', {
            userId,
            username,
          });
          return;
        }

        navigation.navigate('MyEvents');
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't update the event.",
        tone: 'error',
      });
    }
  };

  const currentFeaturedImageUrl = event?.media?.featuredImageUrl;

  if (!isAuthenticated) {
    return (
      <PageContainer contentContainerStyle={styles.pageContent} disablePullToRefresh>
        <AuthPromptCard
          description="Sign in to edit events that you manage."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Sign in to continue"
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

        {/* Featured image */}
        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Featured image</Text>
          {selectedFeaturedImage ? (
            <Pressable onPress={() => void pickFeaturedImage()}>
              <Image
                source={{ uri: selectedFeaturedImage.uri }}
                style={[styles.featuredImagePreview, { borderColor: theme.colors.border }]}
              />
            </Pressable>
          ) : currentFeaturedImageUrl ? (
            <Pressable onPress={() => void pickFeaturedImage()}>
              <Image
                source={{ uri: currentFeaturedImageUrl }}
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

      <AccountPrimaryButton icon="save" label="Save changes" loading={saving} onPress={() => void save()} />
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
