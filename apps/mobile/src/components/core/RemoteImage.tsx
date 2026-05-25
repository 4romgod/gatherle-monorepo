import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageResizeMode,
  type ImageStyle,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type RemoteImageProps = {
  accessibilityLabel?: string;
  fallback: ReactNode;
  imageStyle?: StyleProp<ImageStyle>;
  onError?: () => void;
  onLoad?: () => void;
  resizeMode?: ImageResizeMode;
  showLoader?: boolean;
  style?: StyleProp<ViewStyle>;
  uri?: string | null;
};

export function RemoteImage({
  accessibilityLabel,
  fallback,
  imageStyle,
  onError,
  onLoad,
  resizeMode = 'cover',
  showLoader = false,
  style,
  uri,
}: RemoteImageProps) {
  const { theme } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [uri]);

  if (!uri || failed) {
    return <View style={[styles.container, style]}>{fallback}</View>;
  }

  return (
    <View style={[styles.container, style]}>
      {loaded ? null : fallback}
      <Image
        accessibilityLabel={accessibilityLabel}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        resizeMode={resizeMode}
        source={{ uri }}
        style={[styles.image, imageStyle, loaded ? null : styles.hidden]}
      />
      {showLoader && !loaded ? (
        <View pointerEvents="none" style={styles.loader}>
          <ActivityIndicator color={theme.colors.textMuted} size="small" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  hidden: {
    opacity: 0,
  },
  image: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loader: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
