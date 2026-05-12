import { Pressable, StyleSheet, Text, View } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { useAppTheme } from '../theme/AppThemeProvider';

export function BrandMark() {
  const { theme } = useAppTheme();

  const handlePress = () => {
    if (!navigationRef.isReady()) {
      return;
    }

    navigationRef.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={styles.touchArea}>
      <View style={[styles.mark, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.markText, { color: theme.colors.primaryContrast }]}>NTL</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    paddingLeft: 2,
  },
  mark: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  markText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
