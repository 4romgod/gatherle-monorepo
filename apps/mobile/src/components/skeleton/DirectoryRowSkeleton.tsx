import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { SkeletonBlock } from './SkeletonBlock';

type DirectoryRowSkeletonProps = {
  avatarShape?: 'circle' | 'rounded';
  avatarSize?: number;
  showTrailing?: boolean;
  trailingWidth?: number;
};

export function DirectoryRowSkeleton({
  avatarShape = 'circle',
  avatarSize = 52,
  showTrailing = false,
  trailingWidth = 64,
}: DirectoryRowSkeletonProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <SkeletonBlock
        style={{
          borderRadius: avatarShape === 'circle' ? 999 : 18,
          height: avatarSize,
          width: avatarSize,
        }}
      />

      <View style={styles.copy}>
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.secondary} />
        <SkeletonBlock style={styles.descriptionLong} />
        <SkeletonBlock style={styles.descriptionShort} />
      </View>

      {showTrailing ? (
        <View style={styles.trailing}>
          <SkeletonBlock style={{ height: 12, width: trailingWidth }} />
          <SkeletonBlock style={styles.trailingIcon} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 5,
  },
  descriptionLong: {
    height: 12,
    width: '78%',
  },
  descriptionShort: {
    height: 12,
    width: '58%',
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 14,
  },
  secondary: {
    height: 11,
    width: '34%',
  },
  title: {
    height: 15,
    width: '48%',
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 8,
  },
  trailingIcon: {
    borderRadius: 999,
    height: 16,
    width: 16,
  },
});
