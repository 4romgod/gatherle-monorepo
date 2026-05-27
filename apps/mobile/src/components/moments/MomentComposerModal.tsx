import { useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system';
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
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';
import {
  MOMENT_BACKGROUND_SWATCHES,
  MOMENT_DEFAULT_BACKGROUND,
  MOMENT_IMAGE_EXTENSIONS,
  MOMENT_MAX_CAPTION_LENGTH,
  MOMENT_MAX_IMAGE_BYTES,
  MOMENT_MAX_VIDEO_BYTES,
  MOMENT_MAX_VIDEO_DURATION_MS,
  MOMENT_VIDEO_EXTENSIONS,
} from '@/lib/moments/constants';
import { MOBILE_MEDIA_ASPECT_RATIOS } from '@/lib/media/constants';
import type { MomentBackgroundToken } from '@/lib/moments/constants';
import { getMomentAssetExtension } from '@/lib/moments/upload';
import { useCreateEventMoment } from '@/hooks/moments/useCreateEventMoment';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { EventMomentImageDisplayMode } from '@data/graphql/types/graphql';
import { MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET } from '@/lib/constants/layout';

type ComposerTab = 'text' | 'image' | 'video';

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
  const { showToast, withBlockingLoader } = useAppFeedback();
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
  const remainingCaption = useMemo(() => MOMENT_MAX_CAPTION_LENGTH - caption.length, [caption.length]);
  const videoPreviewSource = useMemo(
    () => (activeTab === 'video' && selectedAsset?.uri ? { uri: selectedAsset.uri } : null),
    [activeTab, selectedAsset?.uri],
  );
  const videoPreviewPlayer = useVideoPlayer(videoPreviewSource, (player) => {
    player.loop = true;
    player.muted = true;
  });

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
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickImage = async () => {
    // Intentionally keep the original asset intact. Moments now use a 9:16
    // frame with Fit/Fill display modes instead of destructive picker cropping.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const extension = getMomentAssetExtension(asset);

    if (!MOMENT_IMAGE_EXTENSIONS.includes(extension as (typeof MOMENT_IMAGE_EXTENSIONS)[number])) {
      showToast({
        message: 'Please choose a JPEG, PNG, or WEBP image. GIFs are not supported for moments.',
        title: 'Unsupported image',
        tone: 'error',
      });
      return;
    }

    let effectiveImageSize = asset.fileSize;
    if (effectiveImageSize == null) {
      try {
        const info = await FileSystem.getInfoAsync(asset.uri);
        effectiveImageSize = info.exists ? info.size : undefined;
      } catch {
        effectiveImageSize = undefined;
      }
    }

    if (effectiveImageSize != null && effectiveImageSize > MOMENT_MAX_IMAGE_BYTES) {
      showToast({ message: 'Images must be 15 MB or smaller.', title: 'Image too large', tone: 'error' });
      return;
    }

    setSelectedAsset(asset);
    setActiveTab('image');
  };

  const handlePickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.85,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const extension = getMomentAssetExtension(asset);

    if (!MOMENT_VIDEO_EXTENSIONS.includes(extension as (typeof MOMENT_VIDEO_EXTENSIONS)[number])) {
      showToast({ message: 'Please choose an MP4, MOV, or WEBM video.', title: 'Unsupported video', tone: 'error' });
      return;
    }

    if (asset.fileSize && asset.fileSize > MOMENT_MAX_VIDEO_BYTES) {
      showToast({ message: 'Videos must be 75 MB or smaller.', title: 'Video too large', tone: 'error' });
      return;
    }

    if (asset.duration && asset.duration > MOMENT_MAX_VIDEO_DURATION_MS) {
      showToast({ message: 'Videos must be 30 seconds or shorter.', title: 'Video too long', tone: 'error' });
      return;
    }

    setSelectedAsset(asset);
    setActiveTab('video');
  };

  const handleSubmit = async () => {
    try {
      await withBlockingLoader('Sharing your moment…', async () => {
        if (activeTab === 'text') {
          await createMoment({
            background: selectedBackground,
            caption,
            eventId,
            occurrenceId,
            type: 'text',
          });
        } else if (activeTab === 'image') {
          if (!selectedAsset) {
            showToast({
              message: 'Choose an image before posting this moment.',
              title: 'Image required',
              tone: 'error',
            });
            return;
          }

          await createMoment({
            asset: selectedAsset,
            caption,
            eventId,
            imageDisplayMode,
            occurrenceId,
            type: 'image',
          });
        } else {
          if (!selectedAsset) {
            showToast({
              message: 'Choose a video before posting this moment.',
              title: 'Video required',
              tone: 'error',
            });
            return;
          }

          await createMoment({
            asset: selectedAsset,
            caption,
            eventId,
            occurrenceId,
            type: 'video',
          });
        }

        handleClose();
        onCreated();
        showToast({ message: 'Your moment is live.', tone: 'success' });
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'We could not post this moment.',
        title: 'Moment failed',
        tone: 'error',
      });
    }
  };

  if (!open) {
    return null;
  }

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
                hitSlop={12}
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>×</Text>
              </Pressable>
            </View>

            <View style={[styles.tabRow, { borderColor: theme.colors.border }]}>
              {(['text', 'image', 'video'] as const).map((tab) => {
                const active = tab === activeTab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      if (tab !== activeTab) {
                        setSelectedAsset(null);
                      }
                      setActiveTab(tab);
                    }}
                    style={[
                      styles.tabButton,
                      {
                        backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
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
                        key={swatch.token}
                        onPress={() => setSelectedBackground(swatch.token)}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: swatch.color,
                            borderColor: selected ? theme.colors.textPrimary : 'transparent',
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
                    onPress={() => void handlePickImage()}
                    style={[
                      styles.imagePickerButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
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
                          key={option.value}
                          onPress={() => setImageDisplayMode(option.value)}
                          style={[
                            styles.displayModeButton,
                            {
                              backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                              borderColor: selected ? theme.colors.primary : theme.colors.border,
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
                  <Pressable onPress={() => void handlePickImage()}>
                    <Text style={[styles.changeImageText, { color: theme.colors.primary }]}>Change image</Text>
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
                    onPress={() => void handlePickVideo()}
                    style={[
                      styles.imagePickerButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.imagePickerLabel, { color: theme.colors.textPrimary }]}>Choose video</Text>
                  </Pressable>
                )}

                {selectedAsset ? (
                  <Pressable onPress={() => void handlePickVideo()}>
                    <Text style={[styles.changeImageText, { color: theme.colors.primary }]}>Change video</Text>
                  </Pressable>
                ) : null}
                <Text style={[styles.mediaHintText, { color: theme.colors.textMuted }]}>
                  MP4, MOV, WEBM up to 75 MB, 30 seconds max
                </Text>
              </View>
            )}

            <View style={styles.inputWrap}>
              <TextInput
                maxLength={MOMENT_MAX_CAPTION_LENGTH}
                multiline
                onChangeText={setCaption}
                placeholder={activeTab === 'text' ? 'What’s happening?' : 'Add a caption (optional)'}
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.captionInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
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
            <Pressable
              disabled={loading}
              onPress={() => void handleSubmit()}
              style={[
                styles.submitButton,
                {
                  backgroundColor: theme.colors.secondary,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.primaryContrast} />
              ) : (
                <Text style={[styles.submitLabel, { color: theme.colors.primaryContrast }]}>Post moment</Text>
              )}
            </Pressable>
          </View>
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
  closeText: {
    ...typography.displayBold,
    fontSize: 36,
    lineHeight: 36,
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
  remainingText: {
    ...typography.bodyMedium,
    alignSelf: 'flex-end',
    fontSize: fontSize.sm,
    paddingRight: 2,
  },
  scrollArea: {
    flex: 1,
  },
  footerWrap: {
    borderTopWidth: 1,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
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
    overflow: 'hidden',
    borderRadius: 24,
  },
});
