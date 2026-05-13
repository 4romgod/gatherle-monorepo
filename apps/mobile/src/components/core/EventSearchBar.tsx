import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type EventSearchBarProps = {
  onSelectEvent: (event: MobileSearchResult) => void;
};

function SearchResultRow({ event, onPress }: { event: MobileSearchResult; onPress: () => void }) {
  const { theme } = useAppTheme();
  const imageUrl = event.media?.featuredImageUrl ?? null;
  const title = event.title ?? '';
  const city = event.location?.address?.city ?? '';
  const categories = event.eventCategories?.slice(0, 2) ?? [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        { borderBottomColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.resultThumb, { backgroundColor: theme.colors.surfaceRaised }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.resultImage} resizeMode="cover" />
        ) : (
          <Feather color={theme.colors.textMuted} name="calendar" size={20} />
        )}
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

export function EventSearchBar({ onSelectEvent }: EventSearchBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState('');
  const { clear, loading, results, search } = useEventSearch();

  const elevatedShadow =
    theme.mode === 'light'
      ? {
          elevation: 4,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }
      : null;

  const handleChangeText = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleClear = () => {
    setQuery('');
    clear();
  };

  const handleSelect = (event: MobileSearchResult) => {
    setModalVisible(false);
    setQuery('');
    clear();
    onSelectEvent(event);
  };

  const handleClose = () => {
    setModalVisible(false);
    setQuery('');
    clear();
  };

  return (
    <>
      {/* Tappable search pill — always visible */}
      <Pressable
        accessibilityRole="search"
        onPress={() => setModalVisible(true)}
        style={[
          styles.pill,
          elevatedShadow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Feather color={theme.colors.textMuted} name="search" size={18} />
        <Text style={[styles.pillPlaceholder, { color: theme.colors.textMuted }]}>Search events, categories...</Text>
      </Pressable>

      {/* Full-screen search modal */}
      <Modal animationType="slide" onRequestClose={handleClose} statusBarTranslucent visible={modalVisible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}
        >
          {/* Header: input + cancel */}
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.colors.border,
                paddingTop: insets.top + 12,
              },
            ]}
          >
            <View
              style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Feather color={theme.colors.textMuted} name="search" size={18} />
              <TextInput
                autoFocus
                onChangeText={handleChangeText}
                placeholder="Search events, categories..."
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="search"
                selectionColor={theme.colors.primary}
                style={[styles.input, { color: theme.colors.textPrimary, paddingRight: query.length > 0 ? 36 : 0 }]}
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

          {/* Results area */}
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
      </Modal>
    </>
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
  clearButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    width: 20,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
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
    borderWidth: 1,
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
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  modalRoot: {
    flex: 1,
  },
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  pillPlaceholder: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: fontSize.base,
  },
  resultImage: {
    borderRadius: 6,
    height: '100%',
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
