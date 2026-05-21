import type { DimensionValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

type EventCardSkeletonProps = {
  cardWidth?: DimensionValue;
  variant?: 'featured' | 'feed';
};

export function EventCardSkeleton({ cardWidth = '100%', variant = 'feed' }: EventCardSkeletonProps) {
  const { theme } = useAppTheme();
  const isFeatured = variant === 'featured';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 0,
          width: cardWidth,
        },
      ]}
    >
      <View style={[styles.imageShell, isFeatured ? styles.imageFeatured : styles.imageFeed]}>
        <SkeletonBlock style={StyleSheet.absoluteFillObject} />
        <SkeletonBlock style={isFeatured ? styles.cityPill : styles.statusPill} />
      </View>

      <View style={styles.body}>
        {!isFeatured ? <SkeletonBlock style={styles.attendancePill} /> : null}

        <View style={styles.titleGroup}>
          <SkeletonBlock style={[styles.titleLine, styles.titleLineLong]} />
          <SkeletonBlock style={[styles.titleLine, styles.titleLineShort]} />
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <SkeletonBlock style={styles.metaIcon} />
            <SkeletonBlock style={styles.metaLineWide} />
          </View>
          <View style={styles.metaRow}>
            <SkeletonBlock style={styles.metaIcon} />
            <SkeletonBlock style={styles.metaLineMedium} />
          </View>
          {isFeatured ? (
            <View style={styles.metaRow}>
              <SkeletonBlock style={styles.metaIcon} />
              <SkeletonBlock style={styles.metaLineShort} />
            </View>
          ) : null}
        </View>

        <View style={isFeatured ? styles.featuredFooter : styles.feedFooter}>
          {!isFeatured ? (
            <View style={styles.avatarStack}>
              <SkeletonBlock style={styles.avatar} />
              <SkeletonBlock style={[styles.avatar, styles.avatarOverlap]} />
              <SkeletonBlock style={[styles.avatar, styles.avatarOverlap]} />
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <SkeletonBlock style={styles.actionButton} />
            <SkeletonBlock style={styles.actionButton} />
            <SkeletonBlock style={styles.actionButton} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 999,
    height: 28,
    width: 28,
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  attendancePill: {
    borderRadius: 999,
    height: 24,
    width: 88,
  },
  avatar: {
    borderRadius: 999,
    height: 30,
    width: 30,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarStack: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  body: {
    gap: 10,
    paddingBottom: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cityPill: {
    borderRadius: 999,
    height: 28,
    left: 12,
    position: 'absolute',
    top: 12,
    width: 78,
  },
  featuredFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  feedFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  imageFeatured: {
    height: 200,
  },
  imageFeed: {
    height: 190,
  },
  imageShell: {
    position: 'relative',
  },
  metaIcon: {
    borderRadius: 6,
    height: 16,
    width: 16,
  },
  metaLineMedium: {
    flex: 1,
    height: 14,
    maxWidth: '68%',
  },
  metaLineShort: {
    height: 14,
    width: 92,
  },
  metaLineWide: {
    flex: 1,
    height: 14,
  },
  metaList: {
    gap: 7,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    height: 28,
    left: 12,
    position: 'absolute',
    top: 12,
    width: 96,
  },
  titleGroup: {
    gap: 6,
  },
  titleLine: {
    height: 20,
  },
  titleLineLong: {
    width: '76%',
  },
  titleLineShort: {
    width: '54%',
  },
});
