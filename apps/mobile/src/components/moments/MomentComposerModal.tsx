import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventMomentImageDisplayMode } from '@data/graphql/types/graphql';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';
import { useCreateEventMoment } from '@/hooks/moments/useCreateEventMoment';
import { MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET } from '@/lib/constants/layout';
import { MOBILE_MEDIA_ASPECT_RATIOS } from '@/lib/media/constants';
import {
  MOMENT_BACKGROUND_SWATCHES,
  MOMENT_DEFAULT_BACKGROUND,
  MOMENT_IMAGE_EXTENSIONS,
  MOMENT_MAX_CAPTION_LENGTH,
  MOMENT_MAX_IMAGE_BYTES,
  MOMENT_MAX_VIDEO_BYTES,
  MOMENT_MAX_VIDEO_DURATION_MS,
  MOMENT_VIDEO_EXTENSIONS,
  type MomentBackgroundToken,
} from '@/lib/moments/constants';
import { ensurePickedAssetIsAvailableLocally } from '@/lib/media/pickedAsset';

type ComposerTab = 'text' | 'image' | 'video';

type ComposerNotice = {
  message: string;
  title: string;
};

type ComposerBlockingState = {
  message: string;
  title: string;
};

export function MomentComposerModal({
  authToken,
  eventId,
  occurrenceId,
  onClose,
  onCreated,
  open,
}: {
  authToken: string | null;
  eventId: string;
  occurrenceId?: string;
  onClose: () => void;
  onCreated: () => void;
  open: boolean;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { createMoment, loading } = useCreateEventMoment(authToken);
  const [activeTab, setActiveTab] = useState<ComposerTab>('text');
  const [caption, setCaption] = useState('');
  const [selectedBackground, setSelectedBackground] = useState<MomentBackgroundToken>(MOMENT_DEFAULT_BACKGROUND);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageDisplayMode, setImageDisplayMode] = useState<EventMomentImageDisplayMode>(
    EventMomentImageDisplayMode.Fit,
  );
  const [composerNotice, setComposerNotice] = useState<ComposerNotice | null>(null);
  const [blockingState, setBlockingState] = useState<ComposerBlockingState | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const remainingCaption = useMemo(() => MOMENT_MAX_CAPTION_LENGTH - caption.length, [caption.length]);
  const videoPreviewSource = useMemo(
    () => (activeTab === 'video' && selectedAsset?.uri ? { uri: selectedAsset.uri } : null),
    [activeTab, selectedAsset?.uri],
  );
  const videoPreviewPlayer = useVideoPlayer(videoPreviewSource, (player) => {
    player.loop = true;
    player.muted = true;
  });
  const isBusy = loading || Boolean(blockingState);

  useEffect(() => {
    if (!videoPreviewSource) {
      return;
    }

    videoPreviewPlayer.play();

    return () => {
      videoPreviewPlayer.pause();
    };
  }, [videoPreviewPlayer, videoPreviewSource]);

  const resetState = () => {
    setActiveTab('text');
    setCaption('');
    setSelectedBackground(MOMENT_DEFAULT_BACKGROUND);
    setSelectedAsset(null);
    setImageDisplayMode(EventMomentImageDisplayMode.Fit);
    setComposerNotice(null);
    setBlockingState(null);
    setSubmissionMessage(null);
  };

  const closeComposer = (force = false) => {
    if (isBusy && !force) {
      return;
    }

    resetState();
    onClose();
  };

  const handleClose = () => {
    closeComposer();
  };

  const showComposerError = (title: string, message: string) => {
    setComposerNotice({ message, title });
  };

  const handlePickImage = async () => {
    setComposerNotice(null);
    setBlockingState({
      message: 'Getting your image ready for the story frame.',
      title: 'Preparing image',
    });

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const resolvedAsset = await ensurePickedAssetIsAvailableLocally(asset);
      const extension = resolvedAsset.extension;

      if (!MOMENT_IMAGE_EXTENSIONS.includes(extension as (typeof MOMENT_IMAGE_EXTENSIONS)[number])) {
        showComposerError('Unsupported image', 'Please choose a JPEG, PNG, or WEBP image. GIFs are not supported.');
        return;
      }
      const effectiveImageSize = resolvedAsset.fileSize;

      if (effectiveImageSize != null && effectiveImageSize > MOMENT_MAX_IMAGE_BYTES) {
        showComposerError('Image too large', 'Images must be 15 MB or smaller.');
        return;
      }

      setSelectedAsset(asset);
      setActiveTab('image');
    } catch (error) {
      showComposerError(
        'Image unavailable',
        error instanceof Error ? error.message : 'We could not access that image on this device.',
      );
    } finally {
      setBlockingState(null);
    }
  };

  const handlePickVideo = async () => {
    setComposerNotice(null);
    setBlockingState({
      message: 'Getting your video ready for upload. This can take a moment while we prepare the file.',
      title: 'Preparing video',
    });

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.85,
        selectionLimit: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const resolvedAsset = await ensurePickedAssetIsAvailableLocally(asset);
      const extension = resolvedAsset.extension;

      if (!MOMENT_VIDEO_EXTENSIONS.includes(extension as (typeof MOMENT_VIDEO_EXTENSIONS)[number])) {
        showComposerError('Unsupported video', 'Please choose an MP4, MOV, or WEBM video.');
        return;
      }

      if (resolvedAsset.fileSize && resolvedAsset.fileSize > MOMENT_MAX_VIDEO_BYTES) {
        showComposerError('Video too large', 'Videos must be 75 MB or smaller.');
        return;
      }

      if (asset.duration && asset.duration > MOMENT_MAX_VIDEO_DURATION_MS) {
        showComposerError('Video too long', 'Videos must be 30 seconds or shorter.');
        return;
      }

      setSelectedAsset(asset);
      setActiveTab('video');
    } catch (error) {
      showComposerError(
        'Video unavailable',
        error instanceof Error ? error.message : 'We could not access that video on this device.',
      );
    } finally {
      setBlockingState(null);
    }
  };

  const handleSubmit = async () => {
    if (activeTab === 'text' && !caption.trim()) {
      showComposerError('Caption required', 'Write a caption before posting this text moment.');
      return;
    }

    try {
      setComposerNotice(null);
      setSubmissionMessage(activeTab === 'text' ? 'Publishing your moment…' : 'Preparing your media…');

      if (activeTab === 'text') {
        await createMoment({
          background: selectedBackground,
          caption,
          eventId,
          occurrenceId,
          onProgressMessage: setSubmissionMessage,
          type: 'text',
        });
      } else if (activeTab === 'image') {
        if (!selectedAsset) {
          showComposerError('Image required', 'Choose an image before posting this moment.');
          setSubmissionMessage(null);
          return;
        }

        await createMoment({
          asset: selectedAsset,
          caption,
          eventId,
          imageDisplayMode,
          occurrenceId,
          onProgressMessage: setSubmissionMessage,
          type: 'image',
        });
      } else {
        if (!selectedAsset) {
          showComposerError('Video required', 'Choose a video before posting this moment.');
          setSubmissionMessage(null);
          return;
        }

        await createMoment({
          asset: selectedAsset,
          caption,
          eventId,
          occurrenceId,
          onProgressMessage: setSubmissionMessage,
          type: 'video',
        });
      }

      setSubmissionMessage(null);
      onCreated();
      closeComposer(true);
    } catch (error) {
      setSubmissionMessage(null);
      showComposerError(
        'Moment failed',
        error instanceof Error ? error.message : 'We could not post this moment right now.',
      );
    }
  };

  if (!open) {
    return null;
  }

  const submitLabel = loading ? 'Posting moment' : 'Post moment';
  const submissionOverlayMessage = submissionMessage ?? 'We’re getting this moment ready for the event feed.';
  const overlayTitle = loading ? 'Posting moment' : (blockingState?.title ?? 'Preparing media');
  const overlayMessage = loading ? submissionOverlayMessage : (blockingState?.message ?? submissionOverlayMessage);

  return (
    <Modal animationType="slide" onRequestClose={handleClose} statusBarTranslucent visible={open}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'android' ? MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET : 0}
        style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.modalRoot}>
          <View
            style={[
              styles.headerWrap,
              {
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border,
                paddingTop: Math.max(insets.top, 12),
              },
            ]}
          >
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Share a moment</Text>
              <Pressable
                accessibilityHint="Dismisses the moment composer without posting"
                accessibilityLabel="Close moment composer"
                accessibilityRole="button"
                disabled={isBusy}
                hitSlop={12}
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Text style={[styles.closeText, { color: theme.colors.textSecondary, opacity: isBusy ? 0.45 : 1 }]}>
                  ×
                </Text>
              </Pressable>
            </View>

            <View style={[styles.tabRow, { borderColor: theme.colors.border }]}>
              {(['text', 'image', 'video'] as const).map((tab) => {
                const active = tab === activeTab;
                return (
                  <Pressable
                    disabled={isBusy}
                    key={tab}
                    onPress={() => {
                      if (tab !== activeTab) {
                        setSelectedAsset(null);
                        setComposerNotice(null);
                      }
                      setActiveTab(tab);
                    }}
                    style={[
                      styles.tabButton,
                      {
                        backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        opacity: isBusy ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tabLabel, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}
                    >
                      {tab === 'text' ? 'Text' : tab === 'image' ? 'Image' : 'Video'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
          >
            {activeTab === 'text' ? (
              <View style={styles.contentBlock}>
                <View
                  style={[
                    styles.textPreview,
                    {
                      backgroundColor:
                        MOMENT_BACKGROUND_SWATCHES.find((swatch) => swatch.token === selectedBackground)?.color ??
                        MOMENT_BACKGROUND_SWATCHES[0].color,
                    },
                  ]}
                >
                  <Text style={styles.textPreviewCopy}>{caption.trim() || 'Type a caption for your moment'}</Text>
                </View>
                <View style={styles.swatchRow}>
                  {MOMENT_BACKGROUND_SWATCHES.map((swatch) => {
                    const selected = swatch.token === selectedBackground;
                    return (
                      <Pressable
                        disabled={isBusy}
                        key={swatch.token}
                        onPress={() => setSelectedBackground(swatch.token)}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: swatch.color,
                            borderColor: selected ? theme.colors.textPrimary : 'transparent',
                            opacity: isBusy ? 0.55 : 1,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ) : activeTab === 'image' ? (
              <View style={styles.contentBlock}>
                {selectedAsset ? (
                  <View
                    style={[
                      styles.imagePreviewFrame,
                      {
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    {imageDisplayMode === EventMomentImageDisplayMode.Fit ? (
                      <>
                        <Image
                          blurRadius={20}
                          resizeMode="cover"
                          source={{ uri: selectedAsset.uri }}
                          style={styles.imagePreviewBackground}
                        />
                        <Image
                          resizeMode="contain"
                          source={{ uri: selectedAsset.uri }}
                          style={styles.imagePreviewImage}
                        />
                      </>
                    ) : (
                      <Image resizeMode="cover" source={{ uri: selectedAsset.uri }} style={styles.imagePreviewImage} />
                    )}
                  </View>
                ) : (
                  <Pressable
                    disabled={isBusy}
                    onPress={() => void handlePickImage()}
                    style={[
                      styles.imagePickerButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        opacity: isBusy ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.imagePickerLabel, { color: theme.colors.textPrimary }]}>Choose image</Text>
                  </Pressable>
                )}

                {selectedAsset ? (
                  <View style={styles.displayModeRow}>
                    {(
                      [
                        { label: 'Fit', value: EventMomentImageDisplayMode.Fit },
                        { label: 'Fill', value: EventMomentImageDisplayMode.Fill },
                      ] as const
                    ).map((option) => {
                      const selected = imageDisplayMode === option.value;
                      return (
                        <Pressable
                          disabled={isBusy}
                          key={option.value}
                          onPress={() => setImageDisplayMode(option.value)}
                          style={[
                            styles.displayModeButton,
                            {
                              backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                              borderColor: selected ? theme.colors.primary : theme.colors.border,
                              opacity: isBusy ? 0.55 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.displayModeLabel,
                              {
                                color: selected ? theme.colors.primary : theme.colors.textSecondary,
                              },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {selectedAsset ? (
                  <Pressable disabled={isBusy} onPress={() => void handlePickImage()}>
                    <Text style={[styles.changeImageText, { color: theme.colors.primary, opacity: isBusy ? 0.55 : 1 }]}>
                      Change image
                    </Text>
                  </Pressable>
                ) : null}
                <Text style={[styles.mediaHintText, { color: theme.colors.textMuted }]}>
                  Keep the full image and choose how it fits the 9:16 story frame · JPEG, PNG, WEBP up to 15 MB
                </Text>
              </View>
            ) : (
              <View style={styles.contentBlock}>
                {selectedAsset ? (
                  <View style={styles.videoPreviewWrap}>
                    <VideoView
                      contentFit="cover"
                      nativeControls={false}
                      player={videoPreviewPlayer}
                      style={styles.imagePreview}
                    />
                  </View>
                ) : (
                  <Pressable
                    disabled={isBusy}
                    onPress={() => void handlePickVideo()}
                    style={[
                      styles.imagePickerButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        opacity: isBusy ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.imagePickerLabel, { color: theme.colors.textPrimary }]}>Choose video</Text>
                  </Pressable>
                )}

                {selectedAsset ? (
                  <Pressable disabled={isBusy} onPress={() => void handlePickVideo()}>
                    <Text style={[styles.changeImageText, { color: theme.colors.primary, opacity: isBusy ? 0.55 : 1 }]}>
                      Change video
                    </Text>
                  </Pressable>
                ) : null}
                <Text style={[styles.mediaHintText, { color: theme.colors.textMuted }]}>
                  Videos up to 75 MB, 30 seconds max
                </Text>
              </View>
            )}

            <View style={styles.inputWrap}>
              <TextInput
                editable={!isBusy}
                maxLength={MOMENT_MAX_CAPTION_LENGTH}
                multiline
                onChangeText={(nextCaption) => {
                  if (composerNotice) {
                    setComposerNotice(null);
                  }
                  setCaption(nextCaption);
                }}
                placeholder={activeTab === 'text' ? 'What’s happening?' : 'Add a caption (optional)'}
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.captionInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    opacity: isBusy ? 0.7 : 1,
                  },
                ]}
                textAlignVertical="top"
                value={caption}
              />
              <Text style={[styles.remainingText, { color: theme.colors.textMuted }]}>{remainingCaption}</Text>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footerWrap,
              {
                backgroundColor: theme.colors.background,
                borderTopColor: theme.colors.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            {composerNotice ? (
              <View
                style={[
                  styles.noticeCard,
                  {
                    backgroundColor: theme.colors.errorSoft,
                    borderColor: theme.colors.error,
                  },
                ]}
              >
                <Text style={[styles.noticeTitle, { color: theme.colors.textPrimary }]}>{composerNotice.title}</Text>
                <Text style={[styles.noticeMessage, { color: theme.colors.textSecondary }]}>
                  {composerNotice.message}
                </Text>
              </View>
            ) : null}

            <Pressable
              disabled={isBusy}
              onPress={() => void handleSubmit()}
              style={[
                styles.submitButton,
                {
                  backgroundColor: theme.colors.secondary,
                  opacity: isBusy ? 0.82 : 1,
                },
              ]}
            >
              {loading ? (
                <View style={styles.submitLoadingRow}>
                  <ActivityIndicator color={theme.colors.primaryContrast} />
                  <Text style={[styles.submitLabel, { color: theme.colors.primaryContrast }]}>{submitLabel}</Text>
                </View>
              ) : (
                <Text style={[styles.submitLabel, { color: theme.colors.primaryContrast }]}>{submitLabel}</Text>
              )}
            </Pressable>
          </View>

          {isBusy ? (
            <View pointerEvents="auto" style={styles.submissionOverlay}>
              <View
                style={[
                  styles.submissionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={[styles.submissionTitle, { color: theme.colors.textPrimary }]}>{overlayTitle}</Text>
                <Text style={[styles.submissionMessage, { color: theme.colors.textSecondary }]}>{overlayMessage}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  captionInput: {
    ...typography.bodyMedium,
    borderRadius: 22,
    borderWidth: 1,
    fontSize: fontSize.xl,
    minHeight: 112,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  changeImageText: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    top: 4,
    width: 44,
  },
  closeText: {
    ...typography.displayBold,
    fontSize: 36,
    lineHeight: 36,
  },
  content: {
    gap: 18,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentBlock: {
    gap: 12,
  },
  displayModeButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 68,
    paddingHorizontal: 14,
  },
  displayModeLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.sm,
  },
  displayModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerWrap: {
    borderTopWidth: 1,
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
  },
  headerWrap: {
    borderBottomWidth: 1,
    gap: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  imagePickerButton: {
    alignItems: 'center',
    aspectRatio: MOBILE_MEDIA_ASPECT_RATIOS.momentPortrait,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
  },
  imagePickerLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
  },
  imagePreview: {
    aspectRatio: MOBILE_MEDIA_ASPECT_RATIOS.momentPortrait,
    borderRadius: 24,
    width: '100%',
  },
  imagePreviewBackground: {
    bottom: 0,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ scale: 1.08 }],
  },
  imagePreviewFrame: {
    aspectRatio: MOBILE_MEDIA_ASPECT_RATIOS.momentPortrait,
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  imagePreviewImage: {
    aspectRatio: MOBILE_MEDIA_ASPECT_RATIOS.momentPortrait,
    width: '100%',
  },
  inputWrap: {
    gap: 6,
  },
  mediaHintText: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
  },
  modalRoot: {
    flex: 1,
  },
  noticeCard: {
    borderRadius: MOBILE_RADIUS.card,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeMessage: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
    lineHeight: 19,
  },
  noticeTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  remainingText: {
    ...typography.bodyMedium,
    alignSelf: 'flex-end',
    fontSize: fontSize.sm,
    paddingRight: 2,
  },
  scrollArea: {
    flex: 1,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    justifyContent: 'center',
    minHeight: 52,
  },
  submitLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.xl,
  },
  submitLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submissionCard: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    gap: 10,
    maxWidth: 300,
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: '#081120',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
  },
  submissionMessage: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  submissionOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 17, 32, 0.42)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  submissionTitle: {
    ...typography.displayBold,
    fontSize: fontSize.lg,
    letterSpacing: -0.4,
  },
  swatch: {
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    width: 28,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  tabLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  textPreview: {
    alignItems: 'center',
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 20,
  },
  textPreviewCopy: {
    ...typography.displayBold,
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
  },
  title: {
    ...typography.displayBold,
    fontSize: fontSize.xl3,
  },
  videoPreviewWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
});
