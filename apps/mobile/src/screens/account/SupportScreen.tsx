import * as ImagePicker from 'expo-image-picker';
import { useLazyQuery, useMutation } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSectionCard } from '@/components/account/shared/AccountSectionCard';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { SUPPORT_REQUEST_LIMITS, SUPPORT_REQUEST_SCREENSHOT_MAX_MB } from '@gatherle/commons/client/constants';
import { MediaEntityType, MediaType, SupportRequestKind } from '@data/graphql/types/graphql';
import { GetMediaUploadUrlDocument } from '@data/graphql/query/Media/query';
import { CreateSupportRequestDocument } from '@data/graphql/mutation/SupportRequest/mutation';
import { getApolloAuthContext } from '@/lib/auth';
import { ensurePickedAssetIsAvailableLocally } from '@/lib/media/pickedAsset';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';

type SupportKindOption = {
  description: string;
  label: string;
  value: SupportRequestKind;
};

const SUPPORT_KIND_OPTIONS: SupportKindOption[] = [
  {
    description: 'Ask for help when something is blocking you.',
    label: 'Get help',
    value: SupportRequestKind.Help,
  },
  {
    description: 'Report something broken or confusing.',
    label: 'Report a bug',
    value: SupportRequestKind.Bug,
  },
  {
    description: 'Suggest an improvement to Gatherle.',
    label: 'Suggest an idea',
    value: SupportRequestKind.Idea,
  },
  {
    description: 'Flag safety, abuse, or trust issues.',
    label: 'Trust & safety',
    value: SupportRequestKind.TrustAndSafety,
  },
];

const SCREENSHOT_LIMIT_LABEL = `${SUPPORT_REQUEST_SCREENSHOT_MAX_MB} MB`;

export function SupportScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { theme } = useAppTheme();
  const { authToken, isAuthenticated } = useAppShell();
  const { showToast, withBlockingLoader } = useAppFeedback();
  const [kind, setKind] = useState<SupportRequestKind>(SupportRequestKind.Help);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [createSupportRequest, { loading: submitting }] = useMutation(CreateSupportRequestDocument);
  const [getUploadUrl] = useLazyQuery(GetMediaUploadUrlDocument, {
    fetchPolicy: 'no-cache',
  });

  const selectedKindDescription = useMemo(
    () => SUPPORT_KIND_OPTIONS.find((option) => option.value === kind)?.description ?? '',
    [kind],
  );

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo library access is required to attach a screenshot.', tone: 'error' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: 'images',
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      const asset = result.assets[0];
      const resolvedAsset = await ensurePickedAssetIsAvailableLocally(asset);

      if (resolvedAsset.fileSize != null && resolvedAsset.fileSize > SUPPORT_REQUEST_LIMITS.screenshotMaxBytes) {
        showToast({ message: `Screenshots must be ${SCREENSHOT_LIMIT_LABEL} or smaller.`, tone: 'error' });
        return;
      }

      setSelectedScreenshot(asset);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'We could not access that screenshot on this device.',
        tone: 'error',
      });
    }
  };

  const removeScreenshot = () => {
    setSelectedScreenshot(null);
  };

  const handleSubmit = async () => {
    if (!authToken || !isAuthenticated) {
      showToast({ message: 'Sign in to send feedback or ask for help.', tone: 'error' });
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < SUPPORT_REQUEST_LIMITS.subjectMinLength) {
      showToast({ message: 'Add a short subject so we can triage this quickly.', tone: 'error' });
      return;
    }

    if (trimmedSubject.length > SUPPORT_REQUEST_LIMITS.subjectMaxLength) {
      showToast({
        message: `Keep the subject under ${SUPPORT_REQUEST_LIMITS.subjectMaxLength} characters.`,
        tone: 'error',
      });
      return;
    }

    if (trimmedMessage.length < SUPPORT_REQUEST_LIMITS.messageMinLength) {
      showToast({ message: 'Add a bit more detail so we know how to help.', tone: 'error' });
      return;
    }

    if (trimmedMessage.length > SUPPORT_REQUEST_LIMITS.messageMaxLength) {
      showToast({
        message: `Keep the details under ${SUPPORT_REQUEST_LIMITS.messageMaxLength} characters.`,
        tone: 'error',
      });
      return;
    }

    try {
      await withBlockingLoader('Sending your request…', async () => {
        let screenshotUrl: string | undefined;

        if (selectedScreenshot) {
          const extension = getImageAssetExtension(selectedScreenshot);
          const { data: uploadData } = await getUploadUrl({
            variables: {
              entityType: MediaEntityType.SupportRequest,
              mediaType: MediaType.Attachment,
              extension,
            },
            ...getApolloAuthContext(authToken),
          });

          if (!uploadData?.getMediaUploadUrl) {
            throw new Error('We could not prepare your screenshot upload.');
          }

          await uploadImageAssetToSignedUrl(uploadData.getMediaUploadUrl.uploadUrl, selectedScreenshot);
          screenshotUrl = uploadData.getMediaUploadUrl.readUrl;
        }

        const { data } = await createSupportRequest({
          variables: {
            input: {
              kind,
              message: trimmedMessage,
              pagePath: 'mobile://support',
              screenshotUrl,
              subject: trimmedSubject,
            },
          },
          ...getApolloAuthContext(authToken),
        });

        const createdRequest = data?.createSupportRequest;
        if (!createdRequest) {
          throw new Error('We could not send your request right now.');
        }

        setKind(SupportRequestKind.Help);
        setSubject('');
        setMessage('');
        setSelectedScreenshot(null);
        showToast({
          message: `Request sent. Reference: ${createdRequest.supportRequestId}.`,
          tone: 'success',
        });
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'We could not send your request right now.',
        tone: 'error',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <AuthPromptCard
          description="We need a signed-in account so we know where to follow up."
          onPressPrimary={() => navigation.navigate('Login', { redirectTab: 'Account' })}
          onPressSecondary={() => navigation.navigate('Register', { redirectTab: 'Account' })}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Support needs your account"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AccountSectionCard
        description="Use this when something breaks, when you need help, or when you want to suggest a sharper version of Gatherle."
        title="Help & feedback"
      >
        <View
          style={[styles.noteCard, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
        >
          <View style={[styles.noteIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
            <Feather color={theme.colors.primary} name="message-circle" size={18} />
          </View>
          <View style={styles.noteCopy}>
            <Text style={[styles.noteTitle, { color: theme.colors.textPrimary }]}>Tell us what happened</Text>
            <Text style={[styles.noteDescription, { color: theme.colors.textSecondary }]}>
              Include what you were trying to do, what happened instead, and anything we should look at first.
            </Text>
          </View>
        </View>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>What do you need?</Text>
          <View style={styles.choiceRow}>
            {SUPPORT_KIND_OPTIONS.map((option) => (
              <AccountChoiceChip
                key={option.value}
                label={option.label}
                onPress={() => setKind(option.value)}
                selected={kind === option.value}
              />
            ))}
          </View>
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>{selectedKindDescription}</Text>
        </View>

        <AccountTextField
          label="Subject"
          maxLength={SUPPORT_REQUEST_LIMITS.subjectMaxLength}
          onChangeText={setSubject}
          placeholder="Push alerts are enabled but I never get them"
          value={subject}
        />
        <Text style={[styles.helperText, styles.countText, { color: theme.colors.textSecondary }]}>
          Keep it concise. {subject.length}/{SUPPORT_REQUEST_LIMITS.subjectMaxLength}
        </Text>

        <AccountTextField
          label="Details"
          maxLength={SUPPORT_REQUEST_LIMITS.messageMaxLength}
          multiline
          onChangeText={setMessage}
          placeholder="What were you trying to do, what happened instead, and how can we reproduce it?"
          value={message}
        />
        <Text style={[styles.helperText, styles.countText, { color: theme.colors.textSecondary }]}>
          Include enough detail to reproduce it. {message.length}/{SUPPORT_REQUEST_LIMITS.messageMaxLength}
        </Text>

        <View style={styles.choiceBlock}>
          <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Screenshot</Text>
          {selectedScreenshot ? (
            <View style={styles.screenshotBlock}>
              <Image
                source={{ uri: selectedScreenshot.uri }}
                style={[styles.screenshotPreview, { borderColor: theme.colors.border }]}
              />
              <View style={styles.screenshotActions}>
                <AccountPrimaryButton
                  icon="image"
                  label="Replace screenshot"
                  onPress={() => void pickScreenshot()}
                  tone="secondary"
                />
                <AccountPrimaryButton icon="x" label="Remove" onPress={removeScreenshot} tone="secondary" />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => void pickScreenshot()}
              style={[styles.imagePlaceholder, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>Tap to attach a screenshot</Text>
            </Pressable>
          )}
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
            Optional. Attach a screenshot when the problem is easier to explain visually. JPG, PNG, WEBP, or GIF up to{' '}
            {SCREENSHOT_LIMIT_LABEL}.
          </Text>
        </View>

        <AccountPrimaryButton
          icon="send"
          label="Send request"
          loading={submitting}
          loadingLabel="Sending..."
          onPress={() => void handleSubmit()}
        />
      </AccountSectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  choiceBlock: {
    gap: 10,
  },
  choiceLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countText: {
    marginTop: -2,
    textAlign: 'right',
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  imagePlaceholder: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.panel,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 140,
    padding: 18,
  },
  noteCard: {
    borderRadius: MOBILE_RADIUS.panel,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  noteCopy: {
    flex: 1,
    gap: 4,
  },
  noteDescription: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  noteIconWrap: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.compact,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  noteTitle: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  screenshotActions: {
    gap: 10,
  },
  screenshotBlock: {
    gap: 12,
  },
  screenshotPreview: {
    aspectRatio: 16 / 10,
    borderRadius: MOBILE_RADIUS.panel,
    borderWidth: 1,
    width: '100%',
  },
});
