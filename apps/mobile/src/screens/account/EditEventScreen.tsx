import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { UpdateEventDocument } from '@data/graphql/mutation/Event/mutation';
import { GetEventByIdDocument } from '@data/graphql/query/Event/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
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
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';
import { MOBILE_MEDIA_ASPECT_RATIOS, MOBILE_MEDIA_PICKER_ASPECTS } from '@/lib/media/constants';
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

type EditEventRouteProps = RouteProp<RootStackParamList, 'EditEvent'>;

type EventFormState = {
  allowGuestPlusOnes: boolean;
  capacity: string;
  description: string;
  eventLink: string;
  privacySetting: EventPrivacySetting;
  summary: string;
  timezone: string;
  title: string;
  venueId: string;
  visibility: EventVisibility;
  waitlistEnabled: boolean;
};

export function EditEventScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const route = useRoute<EditEventRouteProps>();
  const { eventId } = route.params;
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();

  const eventQuery = useQuery(GetEventByIdDocument, {
    variables: { eventId },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });
  const venuesQuery = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken,
    ...getApolloAuthContext(authToken),
  });

  const [formState, setFormState] = useState<EventFormState>({
    allowGuestPlusOnes: true,
    capacity: '',
    description: '',
    eventLink: '',
    privacySetting: EventPrivacySetting.Public,
    summary: '',
    timezone: 'UTC',
    title: '',
    venueId: '',
    visibility: EventVisibility.Public,
    waitlistEnabled: false,
  });
  const [selectedFeaturedImage, setSelectedFeaturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const event = eventQuery.data?.readEventById;

  // Hydrate form from loaded event data
  useEffect(() => {
    if (event && !hydrated) {
      const schedule = event.primarySchedule as Record<string, unknown> | null | undefined;
      setFormState({
        allowGuestPlusOnes: event.allowGuestPlusOnes ?? true,
        capacity: event.capacity != null ? String(event.capacity) : '',
        description: event.description ?? '',
        eventLink: event.eventLink ?? '',
        privacySetting: (event.privacySetting as EventPrivacySetting) ?? EventPrivacySetting.Public,
        summary: event.summary ?? '',
        timezone: (typeof schedule?.timezone === 'string' ? schedule.timezone : '') || 'UTC',
        title: event.title ?? '',
        venueId: event.venueId ?? '',
        visibility: (event.visibility as EventVisibility) ?? EventVisibility.Public,
        waitlistEnabled: event.waitlistEnabled ?? false,
      });
      setHydrated(true);
    }
  }, [event, hydrated]);

  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      if (!isAuthenticated || !authToken) {
        return;
      }

      await Promise.all([eventQuery.refetch(), venuesQuery.refetch()]);
    }, [authToken, eventQuery, isAuthenticated, venuesQuery]),
  );

  const [updateEvent, { loading: saving }] = useMutation(UpdateEventDocument, getApolloAuthContext(authToken));
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });

  const venues = venuesQuery.data?.readVenues ?? [];
  const venueSuggestions = useMemo(() => venues.slice(0, 6), [venues]);

  const updateField = <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
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
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedFeaturedImage(result.assets[0]);
    }
  };

  const save = async () => {
    const capacityNum = formState.capacity.trim() ? Number.parseInt(formState.capacity, 10) : undefined;

    const input: UpdateEventInput = {
      allowGuestPlusOnes: formState.allowGuestPlusOnes,
      capacity: capacityNum != null && !Number.isNaN(capacityNum) ? capacityNum : undefined,
      description: formState.description.trim() || undefined,
      eventId,
      eventLink: formState.eventLink.trim() || undefined,
      privacySetting: formState.privacySetting,
      summary: formState.summary.trim() || undefined,
      title: formState.title.trim() || undefined,
      venueId: formState.venueId || undefined,
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

        showToast({ message: 'Event updated successfully.', tone: 'success' });
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
    gap: 24,
    paddingBottom: 108,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    gap: 14,
  },
});
