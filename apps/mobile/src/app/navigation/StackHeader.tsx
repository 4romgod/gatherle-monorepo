import { getHeaderTitle } from '@react-navigation/elements';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';
import { HeaderMenuButton } from '@/app/navigation/HeaderMenuButton';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontFamily } from '@/app/theme/typography';

export function StackHeader({ back, navigation, options, route }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const tintColor = typeof options.headerTintColor === 'string' ? options.headerTintColor : theme.colors.textPrimary;
  const title = getHeaderTitle(options, route.name);
  const canGoBack = Boolean(back);
  const headerLeft = options.headerLeft?.({
    canGoBack,
    href: back?.href,
    label: back?.title,
    tintColor,
  });
  const headerRight = options.headerRight?.({
    canGoBack,
    tintColor,
  });
  const headerTitle =
    typeof options.headerTitle === 'function' ? (
      options.headerTitle({
        children: title,
        tintColor,
      })
    ) : (
      <Text
        numberOfLines={1}
        style={[styles.title, { color: tintColor }, options.headerTitleStyle as object | undefined]}
      >
        {title}
      </Text>
    );

  return (
    <View style={[styles.shell, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 4 }]}>
      <View style={styles.row}>
        <View style={styles.sideWrap}>
          {headerLeft ??
            (canGoBack ? (
              <HeaderIconButton
                accessibilityLabel="Go back"
                icon="chevron-left"
                onPress={() => navigation.goBack()}
                size={28}
                tintColor={tintColor}
              />
            ) : null)}
        </View>

        <View style={styles.titleWrap}>{headerTitle}</View>

        <View style={[styles.sideWrap, styles.sideWrapRight]}>
          {headerRight ?? <HeaderMenuButton tintColor={tintColor} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingBottom: 6,
    paddingHorizontal: 18,
  },
  shell: {
    justifyContent: 'flex-end',
  },
  sideWrap: {
    alignItems: 'flex-start',
    minWidth: 56,
  },
  sideWrapRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
