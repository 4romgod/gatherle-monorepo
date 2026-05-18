import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useLazyQuery } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { CreateVenueDocument, UpdateVenueDocument } from '@data/graphql/mutation/Venue/mutation';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { MediaEntityType, MediaType, VenueType, type CreateVenueInput } from '@data/graphql/types/graphql';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { getApolloAuthContext } from '@/lib/auth';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type VenueFormState = {
  capacity: string;
  city: string;
  country: string;
  name: string;
  postalCode: string;
  region: string;
  street: string;
  type: VenueType;
  url: string;
};

const initialFormState: VenueFormState = {
  capacity: '',
  city: '',
  country: '',
  name: '',
  postalCode: '',
  region: '',
  street: '',
  type: VenueType.Physical,
  url: '',
};

export function CreateVenueScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();

  const [formState, setFormState] = useState<VenueFormState>(initialFormState);
  const [selectedFeaturedImage, setSelectedFeaturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [createVenue, { loading: creating }] = useMutation(CreateVenueDocument, getApolloAuthContext(authToken));
  const [updateVenue] = useMutation(UpdateVenueDocument, getApolloAuthContext(authToken));
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });

  const updateField = <K extends keyof VenueFormState>(field: K, value: VenueFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
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

  const submit = async () => {
    if (!formState.name.trim()) {
      showToast({ message: 'Venue name is required.', tone: 'error' });
      return;
    }

    try {
      await withBlockingLoader('Creating venue…', async () => {
        const capacityNum = formState.capacity.trim() ? Number.parseInt(formState.capacity, 10) : undefined;

        const address =
          formState.city.trim() && formState.country.trim()
            ? {
                city: formState.city.trim(),
                country: formState.country.trim(),
                postalCode: formState.postalCode.trim() || undefined,
                region: formState.region.trim() || undefined,
                street: formState.street.trim() || undefined,
              }
            : undefined;

        const input: CreateVenueInput = {
          address,
          capacity: capacityNum != null && !Number.isNaN(capacityNum) ? capacityNum : undefined,
          name: formState.name.trim(),
          type: formState.type,
          url: formState.url.trim() || undefined,
        };

        const result = await createVenue({ variables: { input } });
        const createdVenueId = result.data?.createVenue?.venueId;

        if (createdVenueId && selectedFeaturedImage) {
          try {
            const ext = getImageAssetExtension(selectedFeaturedImage);
            const { data: urlData } = await getUploadUrl({
              variables: {
                entityId: createdVenueId,
                entityType: MediaEntityType.Venue,
                extension: ext,
                mediaType: MediaType.Featured,
              },
            });
            if (urlData?.getMediaUploadUrl) {
              const { uploadUrl, readUrl } = urlData.getMediaUploadUrl;
              await uploadImageAssetToSignedUrl(uploadUrl, selectedFeaturedImage);
              await updateVenue({
                variables: {
                  input: {
                    featuredImageUrl: readUrl,
                    venueId: createdVenueId,
                  },
                },
              });
            }
          } catch {
            // Featured image upload failure is non-fatal
          }
        }

        showToast({ message: 'Venue created successfully.', tone: 'success' });
        navigation.navigate('Venues');
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't create the venue.",
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer contentContainerStyle={styles.pageContent}>
        <AuthPromptCard
          description="Sign in to create and manage venues."
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
    <PageContainer contentContainerStyle={styles.pageContent}>
      <View style={styles.section}>
        <SectionHeading title="Venue details" />
        <AccountTextField label="Name" onChangeText={(value) => updateField('name', value)} value={formState.name} />

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Type</Text>
          <View style={styles.choiceWrap}>
            {[VenueType.Physical, VenueType.Virtual, VenueType.Hybrid].map((vt) => (
              <AccountChoiceChip
                key={vt}
                label={vt}
                onPress={() => updateField('type', vt)}
                selected={formState.type === vt}
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

        {/* Featured image */}
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

      <AccountPrimaryButton icon="plus-circle" label="Create venue" loading={creating} onPress={() => void submit()} />
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
