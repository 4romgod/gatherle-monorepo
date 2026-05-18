import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useLazyQuery } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { CreateOrganizationDocument, UpdateOrganizationDocument } from '@data/graphql/mutation/Organization/mutation';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { EventVisibility, MediaEntityType, MediaType, type CreateOrganizationInput } from '@data/graphql/types/graphql';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { getApolloAuthContext } from '@/lib/auth';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type OrgFormState = {
  billingEmail: string;
  description: string;
  name: string;
};

const initialFormState: OrgFormState = {
  billingEmail: '',
  description: '',
  name: '',
};

export function CreateOrganizationScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const { theme } = useAppTheme();

  const [formState, setFormState] = useState<OrgFormState>(initialFormState);
  const [selectedLogo, setSelectedLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [createOrganization, { loading: creating }] = useMutation(
    CreateOrganizationDocument,
    getApolloAuthContext(authToken),
  );
  const [updateOrganization] = useMutation(UpdateOrganizationDocument, getApolloAuthContext(authToken));
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
    ...getApolloAuthContext(authToken),
  });

  const updateField = <K extends keyof OrgFormState>(field: K, value: OrgFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library access is required to add a logo.', tone: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedLogo(result.assets[0]);
    }
  };

  const submit = async () => {
    if (!userId || !formState.name.trim()) {
      showToast({ message: 'Organization name is required.', tone: 'error' });
      return;
    }

    try {
      await withBlockingLoader('Creating organization…', async () => {
        const input: CreateOrganizationInput = {
          billingEmail: formState.billingEmail.trim() || undefined,
          defaultVisibility: EventVisibility.Public,
          description: formState.description.trim() || undefined,
          name: formState.name.trim(),
          ownerId: userId,
        };

        const result = await createOrganization({ variables: { input } });
        const createdOrgId = result.data?.createOrganization?.orgId;

        if (createdOrgId && selectedLogo) {
          try {
            const ext = getImageAssetExtension(selectedLogo);
            const { data: urlData } = await getUploadUrl({
              variables: {
                entityId: createdOrgId,
                entityType: MediaEntityType.Organization,
                extension: ext,
                mediaType: MediaType.Logo,
              },
            });
            if (urlData?.getMediaUploadUrl) {
              const { uploadUrl, readUrl } = urlData.getMediaUploadUrl;
              await uploadImageAssetToSignedUrl(uploadUrl, selectedLogo);
              await updateOrganization({
                variables: {
                  input: {
                    logo: readUrl,
                    orgId: createdOrgId,
                  },
                },
              });
            }
          } catch {
            // Logo upload failure is non-fatal
          }
        }

        showToast({ message: 'Organization created successfully.', tone: 'success' });
        navigation.navigate('MyOrganizations');
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't create the organization.",
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer contentContainerStyle={styles.pageContent}>
        <AuthPromptCard
          description="Sign in to create and manage organizations."
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
        <SectionHeading title="Organization details" />
        <AccountTextField label="Name" onChangeText={(value) => updateField('name', value)} value={formState.name} />
        <AccountTextField
          label="Description (optional)"
          multiline
          onChangeText={(value) => updateField('description', value)}
          value={formState.description}
        />
        <AccountTextField
          keyboardType="email-address"
          label="Billing email (optional)"
          onChangeText={(value) => updateField('billingEmail', value)}
          value={formState.billingEmail}
        />

        {/* Logo picker */}
        <View style={styles.logoBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Logo (optional)</Text>
          <Pressable onPress={() => void pickLogo()}>
            {selectedLogo ? (
              <Image
                source={{ uri: selectedLogo.uri }}
                style={[styles.logoPreview, { borderColor: theme.colors.border }]}
              />
            ) : (
              <View style={[styles.logoPlaceholder, { borderColor: theme.colors.border }]}>
                <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Tap to choose logo</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <AccountPrimaryButton
        icon="plus-circle"
        label="Create organization"
        loading={creating}
        onPress={() => void submit()}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  choiceLabel: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  logoBlock: {
    gap: 10,
  },
  logoPlaceholder: {
    alignItems: 'center',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  logoPreview: {
    borderRadius: 8,
    borderWidth: 1,
    height: 80,
    width: 80,
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
