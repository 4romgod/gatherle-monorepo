import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { BrandMark } from '@/components/core/BrandMark';

export type MainTabToolbarProps = {
  center?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
};

export function MainTabToolbar({ center, left, right }: MainTabToolbarProps) {
  const { theme } = useAppTheme();
  const resolvedLeft = left === undefined ? <BrandMark /> : left;
  const resolvedRight = right === undefined ? null : right;

  return (
    <View style={[styles.toolbar, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.leftWrap}>{resolvedLeft}</View>
      <View pointerEvents="box-none" style={styles.centerWrap}>
        {center}
      </View>
      <View style={styles.rightWrap}>{resolvedRight}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  leftWrap: {
    alignItems: 'flex-start',
    marginLeft: 18,
    minHeight: 40,
    minWidth: 56,
    justifyContent: 'center',
  },
  rightWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 18,
    minHeight: 40,
    minWidth: 56,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingBottom: 6,
    paddingTop: 6,
  },
});
