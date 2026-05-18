import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { UpdateVenueDocument } from '@data/graphql/mutation/Venue/mutation';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { GetVenueByIdDocument } from '@data/graphql/query/Venue/query';
import { MediaEntityType, MediaType, VenueType, type UpdateVenueInput } from '@data/graphql/types/graphql';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/navigation/routes';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { DirectoryRowSkeleton } from '@/components/skeleton/DirectoryRowSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useVenueManagementAccess } from '@/hooks/venues/useVenueManagementAccess';
import { getApolloAuthContext } from '@/lib/auth';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { buildVenueInput, createVenueFormState, validateVenueForm, type VenueFormState } from '@/lib/venues/forms';

type EditVenueRoute = RouteProp<RootStackParamList, 'EditVenue'>;

export function EditVenueScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<EditVenueRoute>();
  const { venueId } = route.params;
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();
  const { canManageVenue, loading: accessLoading } = useVenueManagementAccess();
  const [formState, setFormState] = useState<VenueFormState>(() => createVenueFormState(null));
  const [hydrated, setHydrated] = useState(false);
  const [selectedFeaturedImage, setSelectedFeaturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const venueQuery = useQuery(GetVenueByIdDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { venueId },
    ...getApolloAuthContext(authToken),
  });
  const venue = venueQuery.data?.readVenueById ?? null;

  useEffect(() => {
    if (!venue || hydrated) {
      return;
    }

    setFormState(createVenueFormState(venue));
    setHydrated(true);
  }, [hydrated, venue]);

  const [updateVenue, { loading: saving }] = useMutation(UpdateVenueDocument, getApolloAuthContext(authToken));
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });

  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await venueQuery.refetch();
    }, [venueQuery]),
  );

  const updateField = <K extends keyof VenueFormState>(field: K, value: VenueFormState[K]) => {
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
      aspect: [16, 9],
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedFeaturedImage(result.assets[0]);
    }
  };

  const save = async () => {
    const validationMessage = validateVenueForm(formState);
    if (validationMessage) {
      showToast({ message: validationMessage, tone: 'error' });
      return;
    }

    try {
      await withBlockingLoader('Saving venue…', async () => {
        let featuredImageUrl: string | undefined;

        if (selectedFeaturedImage) {
          try {
            const ext = getImageAssetExtension(selectedFeaturedImage);
            const { data: urlData } = await getUploadUrl({
              variables: {
                entityId: venueId,
                entityType: MediaEntityType.Venue,
                extension: ext,
                mediaType: MediaType.Featured,
              },
            });

            if (urlData?.getMediaUploadUrl) {
              await uploadImageAssetToSignedUrl(urlData.getMediaUploadUrl.uploadUrl, selectedFeaturedImage);
              featuredImageUrl = urlData.getMediaUploadUrl.readUrl;
            }
          } catch {
            // Featured image upload failure is non-fatal
          }
        }

        const input: UpdateVenueInput = {
          ...buildVenueInput(formState),
          featuredImageUrl,
          venueId,
        };

        await updateVenue({
          variables: { input },
        });

        showToast({ message: 'Venue updated successfully.', tone: 'success' });
        navigation.replace('VenueDetails', {
          venueId,
          venueName: formState.name.trim() || route.params.venueName,
        });
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't update the venue.",
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer contentContainerStyle={styles.pageContent}>
        <AuthPromptCard
          description="Sign in to edit venues that your organization manages."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Sign in to continue"
        />
      </PageContainer>
    );
  }

  if ((venueQuery.loading || accessLoading) && !venue) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.loadingWrap}>
          <DirectoryRowSkeleton avatarShape="rounded" avatarSize={66} showTrailing trailingWidth={72} />
          <StateNotice message="Loading venue..." />
        </View>
      </PageContainer>
    );
  }

  if ((venueQuery.error && !venue) || !venue) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load this venue."
          onPressAction={() => void venueQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!canManageVenue(venue.orgId)) {
    return (
      <PageContainer contentContainerStyle={styles.pageContent}>
        <StateNotice message="Only Gatherle admins and the linked organization owners/admins can edit this venue." />
      </PageContainer>
    );
  }

  return (
    <PageContainer contentContainerStyle={styles.pageContent} onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.section}>
        <SectionHeading title="Venue details" />
        <AccountTextField label="Name" onChangeText={(value) => updateField('name', value)} value={formState.name} />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Type</Text>
          <View style={styles.choiceWrap}>
            {[VenueType.Physical, VenueType.Virtual, VenueType.Hybrid].map((type) => (
              <AccountChoiceChip
                key={type}
                label={type}
                onPress={() => updateField('type', type)}
                selected={formState.type === type}
              />
            ))}
          </View>
        </View>

        <AccountTextField
          label="Website / stream link (optional)"
          onChangeText={(value) => updateField('url', value)}
          placeholder="https://..."
          value={formState.url}
        />
        <AccountTextField
          keyboardType="phone-pad"
          label="Capacity (optional)"
          onChangeText={(value) => updateField('capacity', value)}
          placeholder="e.g. 500"
          value={formState.capacity}
        />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Featured image (optional)</Text>
          {selectedFeaturedImage ? (
            <Pressable onPress={() => void pickFeaturedImage()}>
              <Image
                source={{ uri: selectedFeaturedImage.uri }}
                style={[styles.featuredImagePreview, { borderColor: theme.colors.border }]}
              />
            </Pressable>
          ) : venue.featuredImageUrl ? (
            <Pressable onPress={() => void pickFeaturedImage()}>
              <Image
                source={{ uri: venue.featuredImageUrl }}
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
        <SectionHeading title="Address" />
        <AccountTextField
          label="Street (optional)"
          onChangeText={(value) => updateField('street', value)}
          value={formState.street}
        />
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
              label="Region / State"
              onChangeText={(value) => updateField('region', value)}
              value={formState.region}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <AccountTextField
              label="Postal code"
              onChangeText={(value) => updateField('postalCode', value)}
              value={formState.postalCode}
            />
          </View>
          <View style={styles.fieldHalf}>
            <AccountTextField
              label="Country"
              onChangeText={(value) => updateField('country', value)}
              value={formState.country}
            />
          </View>
        </View>
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
    borderRadius: 8,
    borderWidth: 1,
    height: 160,
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
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 100,
    justifyContent: 'center',
  },
  loadingWrap: {
    gap: 18,
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
