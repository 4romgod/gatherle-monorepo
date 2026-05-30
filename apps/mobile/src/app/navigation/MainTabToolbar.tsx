import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { BrandMark } from '@/components/core/BrandMark';
import { HeaderMenuButton } from './HeaderMenuButton';

export function MainTabToolbar() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.toolbar, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.leftWrap}>
        <BrandMark />
      </View>
      <View style={styles.rightWrap}>
        <HeaderMenuButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  leftWrap: {
    flex: 1,
    marginLeft: 18,
  },
  rightWrap: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: 18,
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
