import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MobileSearchResult } from '@/hooks/search/useEventSearch';
import { useEventSearch } from '@/hooks/search/useEventSearch';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { RemoteImage } from '@/components/core/RemoteImage';

type EventSearchBarProps = {
  onClose: () => void;
  onSelectEvent: (event: MobileSearchResult) => void;
  visible: boolean;
};

function SearchResultRow({ event, onPress }: { event: MobileSearchResult; onPress: () => void }) {
  const { theme } = useAppTheme();
  const imageUrl = event.media?.featuredImageUrl ?? null;
  const title = event.title ?? '';
  const city = event.location?.address?.city ?? '';
  const categories: NonNullable<MobileSearchResult['eventCategories']> = event.eventCategories?.slice(0, 2) ?? [];
  const imageFallback = (
    <View style={styles.resultImageFallback}>
      <Feather color={theme.colors.textMuted} name="calendar" size={20} />
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        { borderBottomColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.resultThumb, { backgroundColor: theme.colors.surfaceRaised }]}>
        <RemoteImage fallback={imageFallback} uri={imageUrl} style={styles.resultImage} />
      </View>

      <View style={styles.resultInfo}>
        <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.resultMeta}>
          {city ? (
            <View style={styles.metaChip}>
              <Feather color={theme.colors.textMuted} name="map-pin" size={10} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>{city}</Text>
            </View>
          ) : null}
          {categories.map((cat) => (
            <View key={cat.eventCategoryId} style={[styles.metaChip, { backgroundColor: theme.colors.surfaceRaised }]}>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{cat.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <Feather color={theme.colors.textMuted} name="chevron-right" size={16} />
    </Pressable>
  );
}

export function EventSearchBar({ onClose, onSelectEvent, visible }: EventSearchBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { clear, loading, results, search } = useEventSearch();

  const handleChangeText = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleClear = () => {
    setQuery('');
    clear();
  };

  const handleSelect = (event: MobileSearchResult) => {
    setQuery('');
    clear();
    onClose();
    onSelectEvent(event);
  };

  const handleClose = useCallback(() => {
    setQuery('');
    clear();
    onClose();
  }, [clear, onClose]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [handleClose, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
              paddingTop: insets.top + 6,
            },
          ]}
        >
          <View
            style={[styles.inputRow, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
          >
            <Feather color={theme.colors.textSecondary} name="search" size={18} />
            <TextInput
              autoFocus
              onChangeText={handleChangeText}
              placeholder="Search events, categories..."
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="search"
              selectionColor={theme.colors.primary}
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  paddingRight: query.length > 0 ? 36 : 0,
                },
              ]}
              value={query}
            />
            {query.length > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={handleClear}
                style={[styles.clearButton, { backgroundColor: theme.colors.textMuted }]}
              >
                <Feather color={theme.colors.surface} name="x" size={11} />
              </Pressable>
            ) : null}
          </View>

          <Pressable hitSlop={8} onPress={handleClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: theme.colors.primary }]}>Cancel</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            data={results}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.eventId}
            renderItem={({ item }) => <SearchResultRow event={item} onPress={() => handleSelect(item)} />}
          />
        ) : query.length >= 2 ? (
          <View style={styles.centeredState}>
            <Feather color={theme.colors.textMuted} name="search" size={36} />
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No events found</Text>
          </View>
        ) : (
          <View style={styles.centeredState}>
            <Text style={[styles.hintText, { color: theme.colors.textMuted }]}>
              Type at least 2 characters to search
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  cancelButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  cancelText: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    width: 20,
  },
  emptyText: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  hintText: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
  },
  input: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: fontSize.base,
    padding: 0,
  },
  inputRow: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 10,
  },
  metaChip: {
    alignItems: 'center',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaText: {
    ...typography.bodyRegular,
    fontSize: fontSize.xs,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  resultImage: {
    borderRadius: 6,
    height: '100%',
    width: '100%',
  },
  resultImageFallback: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  resultRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultThumb: {
    alignItems: 'center',
    borderRadius: 6,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  resultTitle: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
});
