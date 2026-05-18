import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';
import { UpdateOrganizationDocument } from '@data/graphql/mutation/Organization/mutation';
import { GetOrganizationByIdDocument } from '@data/graphql/query/Organization/query';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { MediaEntityType, MediaType, type UpdateOrganizationInput } from '@data/graphql/types/graphql';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/navigation/routes';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { getApolloAuthContext } from '@/lib/auth';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type EditOrganizationRouteProps = RouteProp<RootStackParamList, 'EditOrganization'>;

type OrgFormState = {
  billingEmail: string;
  description: string;
  name: string;
};

export function EditOrganizationScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const route = useRoute<EditOrganizationRouteProps>();
  const { orgId } = route.params;
  const { authToken } = useAppShell();
  const { theme } = useAppTheme();

  const orgQuery = useQuery(GetOrganizationByIdDocument, {
    variables: { orgId },
    fetchPolicy: 'cache-and-network',
    ...getApolloAuthContext(authToken),
  });

  const [formState, setFormState] = useState<OrgFormState>({
    billingEmail: '',
    description: '',
    name: '',
  });
  const [selectedLogo, setSelectedLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const org = orgQuery.data?.readOrganizationById;

  useEffect(() => {
    if (org && !hydrated) {
      setFormState({
        billingEmail: org.billingEmail ?? '',
        description: org.description ?? '',
        name: org.name ?? '',
      });
      setHydrated(true);
    }
  }, [org, hydrated]);

  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await orgQuery.refetch();
    }, [orgQuery]),
  );

  const [updateOrganization, { loading: saving }] = useMutation(
    UpdateOrganizationDocument,
    getApolloAuthContext(authToken),
  );
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
      showToast({ message: 'Photo library access is required to update the logo.', tone: 'error' });
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

  const save = async () => {
    try {
      await withBlockingLoader('Saving organization…', async () => {
        let logoUrl: string | undefined;

        if (selectedLogo) {
          try {
            const ext = getImageAssetExtension(selectedLogo);
            const { data: urlData } = await getUploadUrl({
              variables: {
                entityId: orgId,
                entityType: MediaEntityType.Organization,
                extension: ext,
                mediaType: MediaType.Logo,
              },
            });
            if (urlData?.getMediaUploadUrl) {
              await uploadImageAssetToSignedUrl(urlData.getMediaUploadUrl.uploadUrl, selectedLogo);
              logoUrl = urlData.getMediaUploadUrl.readUrl;
            }
          } catch {
            // Logo upload failure is non-fatal
          }
        }

        const input: UpdateOrganizationInput = {
          billingEmail: formState.billingEmail.trim() || undefined,
          description: formState.description.trim() || undefined,
          logo: logoUrl,
          name: formState.name.trim() || undefined,
          orgId,
        };

        await updateOrganization({ variables: { input } });
        showToast({ message: 'Organization updated successfully.', tone: 'success' });
        navigation.navigate('OrganizationDetails', { orgId });
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't update the organization.",
        tone: 'error',
      });
    }
  };

  const currentLogoUrl = org?.logo;

  return (
    <PageContainer contentContainerStyle={styles.pageContent} onRefresh={onRefresh} refreshing={refreshing}>
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
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Logo</Text>
          <Pressable onPress={() => void pickLogo()}>
            {selectedLogo ? (
              <Image
                source={{ uri: selectedLogo.uri }}
                style={[styles.logoPreview, { borderColor: theme.colors.border }]}
              />
            ) : currentLogoUrl ? (
              <Image
                source={{ uri: currentLogoUrl }}
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

      <AccountPrimaryButton icon="save" label="Save changes" loading={saving} onPress={() => void save()} />
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
