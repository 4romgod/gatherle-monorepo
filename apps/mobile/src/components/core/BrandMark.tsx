import { Image, Pressable, StyleSheet } from 'react-native';
import { navigationRef } from '@/app/navigation/navigationRef';

export function BrandMark() {
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
        source={require('../../../assets/favicon/orbit/android-chrome-192x192.png')}
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
