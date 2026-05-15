import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

export function CategoryTileSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SkeletonBlock style={styles.icon} />
      <View style={styles.copy}>
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.descriptionLong} />
        <SkeletonBlock style={styles.descriptionShort} />
      </View>
      <SkeletonBlock style={styles.meta} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    minHeight: 150,
    padding: 16,
    width: '48.4%',
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  descriptionLong: {
    height: 12,
    width: '100%',
  },
  descriptionShort: {
    height: 12,
    width: '74%',
  },
  icon: {
    borderRadius: 14,
    height: 38,
    width: 38,
  },
  meta: {
    height: 12,
    width: 78,
  },
  title: {
    height: 16,
    width: '68%',
  },
});
