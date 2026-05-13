import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DEFAULT_RECENT_EMOJIS, EMOJI_CATEGORIES } from '@/lib/emoji/catalog';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type EmojiPickerProps = {
  onSelectEmoji: (emoji: string) => void;
  recentEmojis?: string[];
};

export function EmojiPicker({ onSelectEmoji, recentEmojis = DEFAULT_RECENT_EMOJIS }: EmojiPickerProps) {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(EMOJI_CATEGORIES[0]?.id ?? 'smileys');

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return EMOJI_CATEGORIES;
    }

    return EMOJI_CATEGORIES.map((category) => ({
      ...category,
      emojis: category.emojis.filter((emoji) => emoji.includes(normalizedQuery)),
    })).filter((category) => category.emojis.length > 0);
  }, [query]);

  const visibleCategories = query.trim()
    ? filteredCategories
    : filteredCategories.filter((category) => category.id === activeCategoryId);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Feather color={theme.colors.textMuted} name="search" size={16} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search emoji"
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          value={query}
        />
      </View>

      {!query.trim() ? (
        <>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Recently used</Text>
          <View style={styles.recentGrid}>
            {recentEmojis.map((emoji) => (
              <Pressable key={`recent-${emoji}`} onPress={() => onSelectEmoji(emoji)} style={styles.emojiButton}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.categoryRail}>
            {EMOJI_CATEGORIES.map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setActiveCategoryId(category.id)}
                  style={styles.categoryButton}
                >
                  <Text style={styles.categoryEmoji}>{category.emojis[0]}</Text>
                  <View
                    style={[
                      styles.categoryIndicator,
                      {
                        backgroundColor: isActive ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <ScrollView contentContainerStyle={styles.emojiGrid} showsVerticalScrollIndicator={false}>
        {visibleCategories.map((category) => (
          <View key={category.id} style={styles.categoryBlock}>
            {query.trim() ? (
              <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>{category.label}</Text>
            ) : null}
            <View style={styles.emojiWrap}>
              {category.emojis.map((emoji) => (
                <Pressable
                  key={`${category.id}-${emoji}`}
                  onPress={() => onSelectEmoji(emoji)}
                  style={styles.emojiButton}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryBlock: {
    gap: 8,
  },
  categoryButton: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryIndicator: {
    borderRadius: 999,
    height: 3,
    width: 34,
  },
  categoryRail: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  divider: {
    height: 1,
  },
  emoji: {
    fontSize: 28,
  },
  emojiButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: '12.5%',
  },
  emojiGrid: {
    gap: 14,
    paddingBottom: 4,
  },
  emojiWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panel: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    maxHeight: 430,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  searchInput: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: fontSize.xl,
    lineHeight: 18,
    padding: 0,
  },
  searchWrap: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    ...typography.bodyMedium,
    fontSize: fontSize.lg,
  },
});
