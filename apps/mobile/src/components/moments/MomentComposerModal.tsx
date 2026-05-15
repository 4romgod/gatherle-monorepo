import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';
import {
  MOMENT_BACKGROUND_SWATCHES,
  MOMENT_DEFAULT_BACKGROUND,
  MOMENT_MAX_CAPTION_LENGTH,
} from '@/lib/moments/constants';
import type { MomentBackgroundToken } from '@/lib/moments/constants';
import { useCreateEventMoment } from '@/hooks/moments/useCreateEventMoment';

type ComposerTab = 'text' | 'image';

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
  const { createMoment, loading } = useCreateEventMoment(authToken);
  const [activeTab, setActiveTab] = useState<ComposerTab>('text');
  const [caption, setCaption] = useState('');
  const [selectedBackground, setSelectedBackground] = useState<MomentBackgroundToken>(MOMENT_DEFAULT_BACKGROUND);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const remainingCaption = useMemo(() => MOMENT_MAX_CAPTION_LENGTH - caption.length, [caption.length]);

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

    setSelectedAsset(result.assets[0]);
    setActiveTab('image');
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
      } else {
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
      }

      handleClose();
      onCreated();
    } catch (error) {
      Alert.alert('Moment failed', error instanceof Error ? error.message : 'We could not post this moment.');
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={open}>
      <View style={styles.overlay}>
        <Pressable onPress={handleClose} style={StyleSheet.absoluteFillObject} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Share a moment</Text>
            <Pressable hitSlop={12} onPress={handleClose}>
              <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>Close</Text>
            </Pressable>
          </View>

          <View style={[styles.tabRow, { borderColor: theme.colors.border }]}>
            {(['text', 'image'] as const).map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
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
                    {tab === 'text' ? 'Text' : 'Image'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            ) : (
              <View style={styles.contentBlock}>
                {selectedAsset ? (
                  <Image source={{ uri: selectedAsset.uri }} style={styles.imagePreview} />
                ) : (
                  <Pressable
                    onPress={handlePickImage}
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
                  <Pressable onPress={handlePickImage}>
                    <Text style={[styles.changeImageText, { color: theme.colors.primary }]}>Change image</Text>
                  </Pressable>
                ) : null}
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
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  content: {
    gap: 18,
    paddingBottom: 24,
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
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  remainingText: {
    ...typography.bodyMedium,
    alignSelf: 'flex-end',
    fontSize: fontSize.sm,
    paddingRight: 2,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    gap: 18,
    maxHeight: '90%',
    paddingBottom: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 52,
  },
  submitLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
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
});
