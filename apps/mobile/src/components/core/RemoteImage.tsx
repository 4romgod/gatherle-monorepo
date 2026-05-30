import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  ActivityIndicator,
  type ImageResizeMode,
  type ImageStyle,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import type { ImageErrorEventData } from 'expo-image';

const REMOTE_IMAGE_RETRY_DELAY_MS = 1500;
const REMOTE_IMAGE_MAX_RETRIES = 2;

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
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [terminalFailure, setTerminalFailure] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedUri = normalizeRemoteUri(uri);

  useEffect(() => {
    setLoaded(false);
    setRetryCount(0);
    setTerminalFailure(false);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [normalizedUri]);

  if (!normalizedUri || terminalFailure) {
    return <View style={[styles.container, style]}>{fallback}</View>;
  }

  const imageRequestKey = `${normalizedUri}::${retryCount}`;

  const scheduleRetry = (errorMessage?: string) => {
    const nextRetry = retryCount + 1;

    if (nextRetry > REMOTE_IMAGE_MAX_RETRIES) {
      console.warn('[RemoteImage] Failed to load remote image', {
        error: errorMessage,
        retryCount,
        uri: normalizedUri,
      });
      setTerminalFailure(true);
      onError?.();
      return;
    }

    console.warn('[RemoteImage] Retrying remote image load', {
      attempt: nextRetry,
      error: errorMessage,
      uri: normalizedUri,
    });
    retryTimeoutRef.current = setTimeout(() => {
      setLoaded(false);
      setRetryCount(nextRetry);
      retryTimeoutRef.current = null;
    }, REMOTE_IMAGE_RETRY_DELAY_MS);
  };

  return (
    <View style={[styles.container, style]}>
      {loaded ? null : fallback}
      <ExpoImage
        accessibilityLabel={accessibilityLabel}
        cachePolicy="memory-disk"
        contentFit={toContentFit(resizeMode)}
        key={imageRequestKey}
        onError={(event) => {
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          scheduleRetry(extractImageErrorMessage(event));
        }}
        onLoad={() => {
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          setLoaded(true);
          onLoad?.();
        }}
        onDisplay={() => setLoaded(true)}
        source={{ cacheKey: imageRequestKey, uri: normalizedUri }}
        style={StyleSheet.flatten([styles.image, imageStyle, loaded ? null : styles.hidden])}
        transition={120}
      />
      {showLoader && !loaded ? (
        <View pointerEvents="none" style={styles.loader}>
          <View
            style={[
              styles.loaderScrim,
              {
                backgroundColor: theme.mode === 'dark' ? 'rgba(2, 6, 23, 0.34)' : 'rgba(255, 255, 255, 0.24)',
              },
            ]}
          />
          <View
            style={[
              styles.loaderCard,
              {
                backgroundColor: theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.84)' : 'rgba(255, 255, 255, 0.92)',
                borderColor: theme.mode === 'dark' ? theme.colors.heroCardBorder : theme.colors.border,
                shadowColor: theme.colors.heroBackground,
              },
            ]}
          >
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
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
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loaderCard: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 72,
    minWidth: 72,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  loaderScrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

function toContentFit(resizeMode: ImageResizeMode): 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' {
  switch (resizeMode) {
    case 'contain':
      return 'contain';
    case 'stretch':
      return 'fill';
    case 'center':
      return 'scale-down';
    default:
      return 'cover';
  }
}

function normalizeRemoteUri(uri?: string | null) {
  if (!uri) {
    return null;
  }

  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return null;
  }

  const withScheme = trimmedUri.startsWith('//') ? `https:${trimmedUri}` : trimmedUri;

  try {
    return new URL(withScheme).toString();
  } catch {
    return encodeURI(withScheme);
  }
}

function extractImageErrorMessage(errorEvent: unknown) {
  if (!errorEvent) {
    return undefined;
  }

  if (typeof errorEvent === 'object' && errorEvent !== null && 'nativeEvent' in errorEvent) {
    const nativeEvent = (errorEvent as { nativeEvent?: ImageErrorEventData }).nativeEvent;
    return nativeEvent?.error;
  }

  if (typeof errorEvent === 'object' && errorEvent !== null && 'error' in errorEvent) {
    return (errorEvent as ImageErrorEventData).error;
  }

  return undefined;
}
