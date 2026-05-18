import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type SkeletonBlockProps = {
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ style }: SkeletonBlockProps) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.56)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 900,
          toValue: 0.96,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 900,
          toValue: 0.56,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          backgroundColor: theme.mode === 'dark' ? theme.colors.surfaceRaised : theme.colors.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 12,
  },
});
