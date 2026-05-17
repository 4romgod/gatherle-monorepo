import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ComposerIconButton } from '@/components/core/ComposerIconButton';
import { EmojiPicker } from '@/components/core/EmojiPicker';
import { DEVICE_STORAGE_KEYS, readStoredJson, writeStoredJson } from '@/lib/deviceStorage';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type ChatComposerProps = {
  isConnected: boolean;
  onSend: (message: string) => boolean;
  onAfterSend?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  showStatus?: boolean;
  targetUserId?: string;
  variant?: 'default' | 'overlay';
};

export function ChatComposer({
  isConnected,
  onAfterSend,
  onBlur,
  onFocus,
  onSend,
  placeholder = 'Message...',
  showStatus = true,
  targetUserId,
  variant = 'default',
}: ChatComposerProps) {
  const { theme } = useAppTheme();
  const [draft, setDraft] = useState('');
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasHydratedRecentEmojis, setHasHydratedRecentEmojis] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const restoreEmojiRecents = async () => {
      const storedEmojiRecents = await readStoredJson<string[]>(DEVICE_STORAGE_KEYS.chatEmojiRecents);
      if (!isMounted) {
        return;
      }

      if (Array.isArray(storedEmojiRecents)) {
        setRecentEmojis(storedEmojiRecents.filter((emoji) => typeof emoji === 'string').slice(0, 8));
      }

      setHasHydratedRecentEmojis(true);
    };

    void restoreEmojiRecents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedRecentEmojis) {
      return;
    }

    void writeStoredJson(DEVICE_STORAGE_KEYS.chatEmojiRecents, recentEmojis);
  }, [hasHydratedRecentEmojis, recentEmojis]);

  const canSend = Boolean(draft.trim()) && Boolean(targetUserId);

  const handleSend = () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft || !targetUserId) {
      return;
    }

    setEmojiPickerOpen(false);
    const sent = onSend(trimmedDraft);
    if (!sent) {
      setSendError('Reconnecting to live chat…');
      return;
    }

    setDraft('');
    setSendError(null);
    onAfterSend?.();
  };

  const handleInsertEmoji = (emoji: string) => {
    setDraft((currentDraft) => `${currentDraft}${emoji}`);
    setRecentEmojis((currentRecentEmojis) => {
      const nextRecentEmojis = [emoji, ...currentRecentEmojis.filter((currentEmoji) => currentEmoji !== emoji)];
      return nextRecentEmojis.slice(0, 8);
    });
    setSendError(null);
  };

  return (
    <View style={styles.shell}>
      {isEmojiPickerOpen ? <Pressable onPress={() => setEmojiPickerOpen(false)} style={styles.dismissOverlay} /> : null}
      {isEmojiPickerOpen ? <EmojiPicker onSelectEmoji={handleInsertEmoji} recentEmojis={recentEmojis} /> : null}
      <View
        style={[
          styles.inputWrap,
          variant === 'overlay'
            ? {
                backgroundColor: 'rgba(3,7,18,0.56)',
                borderColor: 'rgba(255,255,255,0.36)',
              }
            : {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
        ]}
      >
        <View style={styles.iconRail}>
          <ComposerIconButton
            accessibilityLabel={isEmojiPickerOpen ? 'Close emoji picker' : 'Open emoji picker'}
            icon="smile"
            onPress={() => setEmojiPickerOpen((currentOpen) => !currentOpen)}
          />
        </View>
        <TextInput
          blurOnSubmit={false}
          onChangeText={(nextValue) => {
            setDraft(nextValue);
            if (sendError) {
              setSendError(null);
            }
          }}
          onBlur={onBlur}
          onFocus={() => {
            setEmojiPickerOpen(false);
            onFocus?.();
          }}
          onSubmitEditing={handleSend}
          placeholder={placeholder}
          placeholderTextColor={variant === 'overlay' ? 'rgba(255,255,255,0.68)' : theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          style={[
            styles.input,
            {
              color: variant === 'overlay' ? theme.colors.heroText : theme.colors.textPrimary,
            },
          ]}
          value={draft}
        />
        <View style={styles.sendWrap}>
          <ComposerIconButton
            accessibilityLabel="Send message"
            buttonSize={42}
            disabled={!canSend}
            filled
            icon="send"
            iconRotationDeg={45}
            onPress={handleSend}
            size={18}
          />
        </View>
      </View>
      {showStatus && sendError ? (
        <Text style={[styles.status, { color: theme.colors.error }]}>{sendError}</Text>
      ) : showStatus && !isConnected ? (
        <Text
          style={[styles.status, { color: variant === 'overlay' ? 'rgba(255,255,255,0.74)' : theme.colors.textMuted }]}
        >
          Connecting to live chat…
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dismissOverlay: {
    bottom: '100%',
    height: 1600,
    left: -20,
    position: 'absolute',
    right: -20,
  },
  iconRail: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: 2,
  },
  input: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: fontSize.xl,
    lineHeight: 18,
    minHeight: 18,
    minWidth: 0,
    paddingBottom: 0,
    paddingRight: 2,
    paddingTop: 0,
    textAlignVertical: 'center',
  },
  inputWrap: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sendWrap: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
  },
  shell: {
    gap: 8,
    paddingBottom: 18,
    paddingTop: 12,
    position: 'relative',
  },
  status: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
    paddingHorizontal: 4,
  },
});
