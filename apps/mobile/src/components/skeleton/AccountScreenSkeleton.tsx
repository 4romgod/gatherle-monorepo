import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

export function AccountScreenSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerSection}>
        <View style={styles.topRow}>
          <SkeletonBlock style={styles.avatar} />

          <View style={styles.topRail}>
            <View style={styles.identityRow}>
              <SkeletonBlock style={styles.handle} />
              <View style={styles.badges}>
                <SkeletonBlock style={styles.badge} />
                <SkeletonBlock style={styles.badge} />
              </View>
            </View>

            <View style={styles.statsRow}>
              {[0, 1, 2].map((value) => (
                <View key={value} style={styles.stat}>
                  <SkeletonBlock style={styles.statValue} />
                  <SkeletonBlock style={styles.statLabel} />
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.textBlock}>
          <SkeletonBlock style={styles.name} />
          <SkeletonBlock style={styles.bioLong} />
          <SkeletonBlock style={styles.bioShort} />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <SkeletonBlock style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised }]} />
        <SkeletonBlock style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised }]} />
      </View>

      <View style={styles.tabsRow}>
        {[0, 1, 2, 3].map((value) => (
          <View key={value} style={styles.tabItem}>
            <SkeletonBlock style={styles.tabIcon} />
            {value === 0 ? <SkeletonBlock style={styles.tabIndicator} /> : <View style={styles.tabIndicatorSpace} />}
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {[0, 1, 2, 3].map((value) => (
          <SkeletonBlock key={value} style={styles.tile} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 16,
    flex: 1,
    height: 42,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    borderRadius: 999,
    height: 88,
    width: 88,
  },
  badge: {
    borderRadius: 8,
    height: 20,
    width: 22,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  bioLong: {
    height: 14,
    width: '100%',
  },
  bioShort: {
    height: 14,
    width: '72%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  handle: {
    height: 14,
    width: 118,
  },
  headerSection: {
    gap: 14,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    height: 20,
    width: 146,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  statLabel: {
    height: 10,
    width: 42,
  },
  statValue: {
    height: 16,
    width: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabIcon: {
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  tabIndicator: {
    borderRadius: 999,
    height: 3,
    width: 24,
  },
  tabIndicatorSpace: {
    height: 3,
    width: 24,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  textBlock: {
    gap: 8,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: 20,
    width: '48.9%',
  },
  topRail: {
    flex: 1,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    gap: 16,
  },
  wrap: {
    gap: 22,
  },
});
