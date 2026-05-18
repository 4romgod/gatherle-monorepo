import { Image, Pressable, StyleSheet } from 'react-native';
import { navigationRef } from '@/app/navigation/navigationRef';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

export function BrandMark() {
  const { isDark } = useAppTheme();

  const handlePress = () => {
    if (!navigationRef.isReady()) {
      return;
    }

    navigationRef.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={styles.touchArea}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={
          isDark
            ? require('../../../assets/favicon/orbit/dark/android-chrome-192x192.png')
            : require('../../../assets/favicon/orbit/light/android-chrome-192x192.png')
        }
        style={styles.mark}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    paddingLeft: 2,
  },
  mark: {
    height: 36,
    width: 36,
  },
});
