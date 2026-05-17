import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';
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
import type { MomentBackgroundToken } from '@/lib/moments/constants';
import { getMomentAssetExtension } from '@/lib/moments/upload';
import { useCreateEventMoment } from '@/hooks/moments/useCreateEventMoment';

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
  const { theme } = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { createMoment, loading } = useCreateEventMoment(authToken);
  const snapPoints = useMemo(() => ['85%'], []);
  const [mounted, setMounted] = useState(open);
  const [activeTab, setActiveTab] = useState<ComposerTab>('text');
  const [caption, setCaption] = useState('');
  const [selectedBackground, setSelectedBackground] = useState<MomentBackgroundToken>(MOMENT_DEFAULT_BACKGROUND);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const remainingCaption = useMemo(() => MOMENT_MAX_CAPTION_LENGTH - caption.length, [caption.length]);
  const videoPreviewSource = activeTab === 'video' && selectedAsset?.uri ? { uri: selectedAsset.uri } : null;
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

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    sheetRef.current?.dismiss();
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      sheetRef.current?.present();
    });

    return () => cancelAnimationFrame(frame);
  }, [mounted, open]);

  const resetState = () => {
    setActiveTab('text');
    setCaption('');
    setSelectedBackground(MOMENT_DEFAULT_BACKGROUND);
    setSelectedAsset(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
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
      Alert.alert('Unsupported image', 'Please choose a JPEG, PNG, or WEBP image.');
      return;
    }

    if (asset.fileSize && asset.fileSize > MOMENT_MAX_IMAGE_BYTES) {
      Alert.alert('Image too large', 'Images must be 15 MB or smaller.');
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
      Alert.alert('Unsupported video', 'Please choose an MP4, MOV, or WEBM video.');
      return;
    }

    if (asset.fileSize && asset.fileSize > MOMENT_MAX_VIDEO_BYTES) {
      Alert.alert('Video too large', 'Videos must be 75 MB or smaller.');
      return;
    }

    if (asset.duration && asset.duration > MOMENT_MAX_VIDEO_DURATION_MS) {
      Alert.alert('Video too long', 'Videos must be 30 seconds or shorter.');
      return;
    }

    setSelectedAsset(asset);
    setActiveTab('video');
  };

  const handleSubmit = async () => {
    try {
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
          Alert.alert('Image required', 'Choose an image before posting this moment.');
          return;
        }

        await createMoment({
          asset: selectedAsset,
          caption,
          eventId,
          occurrenceId,
          type: 'image',
        });
      } else {
        if (!selectedAsset) {
          Alert.alert('Video required', 'Choose a video before posting this moment.');
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
    } catch (error) {
      Alert.alert('Moment failed', error instanceof Error ? error.message : 'We could not post this moment.');
    }
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.52} pressBehavior="close" />
  );

  if (!mounted) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 40 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={() => {
        setMounted(false);
        if (open) {
          handleClose();
        }
      }}
      snapPoints={snapPoints}
    >
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Share a moment</Text>
          <Pressable hitSlop={12} onPress={handleClose}>
            <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Close</Text>
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
                <Text style={[styles.tabLabel, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {tab === 'text' ? 'Text' : tab === 'image' ? 'Image' : 'Video'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <BottomSheetScrollView
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
                <Image source={{ uri: selectedAsset.uri }} style={styles.imagePreview} />
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
                <Pressable onPress={() => void handlePickImage()}>
                  <Text style={[styles.changeImageText, { color: theme.colors.primary }]}>Change image</Text>
                </Pressable>
              ) : null}
              <Text style={[styles.mediaHintText, { color: theme.colors.textMuted }]}>JPEG, PNG, WEBP up to 15 MB</Text>
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
            <BottomSheetTextInput
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
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
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
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  content: {
    gap: 18,
    paddingBottom: 28,
  },
  contentBlock: {
    gap: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imagePickerButton: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 180,
  },
  imagePickerLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
  },
  imagePreview: {
    borderRadius: 24,
    height: 220,
    width: '100%',
  },
  inputWrap: {
    gap: 6,
  },
  mediaHintText: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
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
  sheet: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 22,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
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
