import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { DateFilterOption, EventCategory, EventStatus } from '@data/graphql/types/graphql';
import { FilterChip } from '@/components/core/FilterChip';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';
import type { EventsFilterState, EventsLocationFilter } from '@/hooks/events/useEventsFilters';

const STATUS_OPTIONS: { label: string; value: EventStatus; tone: 'primary' | 'success' }[] = [
  { label: 'Upcoming', value: EventStatus.Upcoming, tone: 'success' },
  { label: 'Ongoing', value: EventStatus.Ongoing, tone: 'primary' },
  { label: 'Completed', value: EventStatus.Completed, tone: 'primary' },
  { label: 'Cancelled', value: EventStatus.Cancelled, tone: 'primary' },
];

const DATE_OPTIONS: { label: string; value: DateFilterOption }[] = [
  { label: 'Today', value: DateFilterOption.Today },
  { label: 'Tomorrow', value: DateFilterOption.Tomorrow },
  { label: 'This Week', value: DateFilterOption.ThisWeek },
  { label: 'This Weekend', value: DateFilterOption.ThisWeekend },
  { label: 'This Month', value: DateFilterOption.ThisMonth },
];

type EventsFilterSheetProps = {
  visible: boolean;
  categories: EventCategory[];
  draft: EventsFilterState;
  onClose: () => void;
  onApply: () => void;
  onClearAll: () => void;
  onToggleCategory: (categoryName: string) => void;
  onToggleStatus: (status: EventStatus) => void;
  onSetDateOption: (option: DateFilterOption | null) => void;
  onSetLocation: (location: EventsLocationFilter) => void;
  onClearLocation: () => void;
};

export function EventsFilterSheet({
  visible,
  categories,
  draft,
  onClose,
  onApply,
  onClearAll,
  onToggleCategory,
  onToggleStatus,
  onSetDateOption,
  onSetLocation,
  onClearLocation,
}: EventsFilterSheetProps) {
  const { theme } = useAppTheme();

  // Local location input state, synced from draft on open
  const [localCity, setLocalCity] = useState(draft.location.city);
  const [localState, setLocalState] = useState(draft.location.state);
  const [localCountry, setLocalCountry] = useState(draft.location.country);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setLocalCity(draft.location.city);
    setLocalState(draft.location.state);
    setLocalCountry(draft.location.country);
  }, [draft.location.city, draft.location.country, draft.location.state, visible]);

  const locationDirty =
    localCity !== draft.location.city || localState !== draft.location.state || localCountry !== draft.location.country;

  const hasLocation = !!(localCity.trim() || localState.trim() || localCountry.trim());

  const handleApplyLocation = () => {
    onSetLocation({ city: localCity.trim(), state: localState.trim(), country: localCountry.trim() });
  };

  const handleClearLocation = () => {
    setLocalCity('');
    setLocalState('');
    setLocalCountry('');
    onClearLocation();
  };

  const handleClose = () => {
    // Sync local location back to draft on close without applying
    setLocalCity(draft.location.city);
    setLocalState(draft.location.state);
    setLocalCountry(draft.location.country);
    onClose();
  };

  const handleClearAll = () => {
    setLocalCity('');
    setLocalState('');
    setLocalCountry('');
    onClearAll();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.5) {
          handleClose();
        }
      },
    }),
  ).current;

  const inputStyle = [
    styles.locationInput,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
  ];

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
          keyboardVerticalOffset={0}
        >
          <Pressable onPress={() => {}} style={styles.sheetTouchBlock}>
            <SafeAreaView style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
              <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
              </View>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Filters</Text>
                <Pressable hitSlop={8} onPress={handleClose} style={styles.closeButton}>
                  <Feather color={theme.colors.textPrimary} name="x" size={22} />
                </Pressable>
              </View>

              {/* Body */}
              <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.scrollArea}
              >
                {/* Categories */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>CATEGORIES</Text>
                  <View style={styles.chipWrap}>
                    {categories.map((cat) => (
                      <FilterChip
                        active={draft.categories.includes(cat.name)}
                        key={cat.eventCategoryId}
                        label={cat.name}
                        onPress={() => onToggleCategory(cat.name)}
                        small
                      />
                    ))}
                  </View>
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Status */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>STATUS</Text>
                  <View style={styles.chipRow}>
                    {STATUS_OPTIONS.map((opt) => (
                      <FilterChip
                        active={draft.statuses.includes(opt.value)}
                        key={opt.value}
                        label={opt.label}
                        onPress={() => onToggleStatus(opt.value)}
                        small
                        tone={draft.statuses.includes(opt.value) ? opt.tone : 'primary'}
                      />
                    ))}
                  </View>
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Date */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>DATE</Text>
                  <View style={styles.chipWrap}>
                    {DATE_OPTIONS.map((opt) => (
                      <FilterChip
                        active={draft.dateOption === opt.value}
                        key={opt.value}
                        label={opt.label}
                        onPress={() => onSetDateOption(draft.dateOption === opt.value ? null : opt.value)}
                        small
                      />
                    ))}
                  </View>
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Location */}
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>LOCATION</Text>
                  <View style={styles.locationFields}>
                    <TextInput
                      onChangeText={setLocalCity}
                      placeholder="City"
                      placeholderTextColor={theme.colors.textMuted}
                      style={inputStyle}
                      value={localCity}
                    />
                    <TextInput
                      onChangeText={setLocalState}
                      placeholder="State / Province"
                      placeholderTextColor={theme.colors.textMuted}
                      style={inputStyle}
                      value={localState}
                    />
                    <TextInput
                      onChangeText={setLocalCountry}
                      placeholder="Country"
                      placeholderTextColor={theme.colors.textMuted}
                      style={inputStyle}
                      value={localCountry}
                    />
                    <View style={styles.locationActions}>
                      <Pressable
                        onPress={handleClearLocation}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text style={[styles.locationActionText, { color: theme.colors.textSecondary }]}>
                          Clear location
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={!locationDirty && !hasLocation}
                        onPress={handleApplyLocation}
                        style={({ pressed }) => [
                          styles.locationApplyButton,
                          {
                            backgroundColor:
                              locationDirty || hasLocation ? theme.colors.surfaceRaised : theme.colors.surfaceMuted,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.locationActionText, { color: theme.colors.textPrimary }]}>
                          Apply location
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Bottom bar */}
              <View
                style={[
                  styles.bottomBar,
                  { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
                ]}
              >
                <Pressable onPress={handleClearAll} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={[styles.clearAllText, { color: theme.colors.textSecondary }]}>Clear all</Text>
                </Pressable>
                <Pressable
                  onPress={onApply}
                  style={({ pressed }) => [
                    styles.showResultsButton,
                    { backgroundColor: theme.colors.primary, opacity: pressed ? 0.88 : 1 },
                  ]}
                >
                  <Text style={[styles.showResultsText, { color: theme.colors.primaryContrast }]}>Show results</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dragHandle: {
    borderRadius: 999,
    height: 4,
    width: 40,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 12,
  },
  body: {
    gap: 0,
    paddingBottom: 24,
  },
  bottomBar: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  clearAllText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.xl,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl3,
  },
  locationActionText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  locationActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  locationApplyButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationFields: {
    gap: 10,
  },
  locationInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: fontSize.lg,
    fontFamily: 'PlusJakartaSans_400Regular',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  section: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    overflow: 'hidden',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    maxHeight: '85%',
  },
  sheetTouchBlock: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  showResultsButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  showResultsText: {
    ...typography.bodyBold,
    fontSize: fontSize.xl,
  },
});
