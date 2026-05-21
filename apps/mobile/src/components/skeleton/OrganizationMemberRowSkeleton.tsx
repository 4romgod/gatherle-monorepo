import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

export function OrganizationMemberRowSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceRaised }]}>
      <View style={styles.headerRow}>
        <View style={styles.identity}>
          <SkeletonBlock style={styles.avatar} />

          <View style={styles.copy}>
            <SkeletonBlock style={styles.title} />
            <SkeletonBlock style={styles.meta} />
          </View>
        </View>

        <View style={styles.trailing}>
          <SkeletonBlock style={styles.roleBadge} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 52,
    width: 52,
  },
  card: {
    borderRadius: 22,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  meta: {
    borderRadius: 6,
    height: 11,
    width: '30%',
  },
  roleBadge: {
    borderRadius: 999,
    height: 32,
    width: 74,
  },
  title: {
    borderRadius: 6,
    height: 14,
    width: '50%',
  },
  trailing: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 8,
  },
});
