import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { navigationRef } from '@/app/navigation/navigationRef';
import type { DetailRouteName, MainTabParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { getDisplayName } from '@/lib/events/formatters';
import { fontSize, typography } from '@/app/theme/typography';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type DrawerItemConfig = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
};

type SocialLinkConfig = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  url: string;
};

const MAX_DRAWER_WIDTH = 420;
const MIN_DRAWER_WIDTH = 280;
const SOCIAL_LINKS: SocialLinkConfig[] = [
  { icon: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/gatherleofficial' },
  { icon: 'music', label: 'TikTok', url: 'https://www.tiktok.com/@gatherle' },
  { icon: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/gatherle' },
  { icon: 'twitter', label: 'X', url: 'https://x.com/getgatherle' },
];
type DrawerRouteName = Exclude<
  DetailRouteName,
  | 'EditEvent'
  | 'EditOrganization'
  | 'EditVenue'
  | 'EventDetails'
  | 'MessageThread'
  | 'OrganizationDetails'
  | 'OrganizationMembers'
  | 'VenueDetails'
  | 'UserProfile'
>;

function navigateTo(routeName: DrawerRouteName) {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate(routeName);
}

function navigateToTab(tabName: keyof MainTabParamList) {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate('MainTabs', { screen: tabName });
}

function resetToHomeTab() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.reset({
    index: 0,
    routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
  });
}

function MenuItem({ icon, label, onPress }: DrawerItemConfig) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
        },
      ]}
    >
      <Feather color={theme.colors.textSecondary} name={icon} size={22} />
      <Text style={[styles.menuLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function DrawerCloseButton() {
  const { closeDrawer } = useAppShell();
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel="Close navigation menu"
      accessibilityRole="button"
      onPress={closeDrawer}
      style={({ pressed }) => [
        styles.closeButton,
        {
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Feather color={theme.colors.textSecondary} name="x" size={28} />
    </Pressable>
  );
}

function DrawerDivider() {
  const { theme } = useAppTheme();

  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

function SocialLinksRow() {
  const { theme } = useAppTheme();

  const openSocialLink = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <View style={styles.socialSection}>
      <Text style={[styles.socialTitle, { color: theme.colors.textSecondary }]}>Follow Gatherle</Text>
      <View style={styles.socialRow}>
        {SOCIAL_LINKS.map((link) => (
          <Pressable
            accessibilityLabel={`Open Gatherle on ${link.label}`}
            accessibilityRole="link"
            key={link.label}
            onPress={() => openSocialLink(link.url)}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.74 : 1,
              },
            ]}
          >
            <Feather color={theme.colors.textPrimary} name={link.icon} size={18} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AppDrawer() {
  const { closeDrawer, drawerOpen, email, isAuthenticated, signOut, username } = useAppShell();
  const { isDark, theme, toggleMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(drawerOpen);
  const progress = useRef(new Animated.Value(0)).current;
  const { profile } = usePreviewProfile(username, isAuthenticated);
  const profileName = getDisplayName(profile);
  const profileUsernameValue = profile?.username ?? username ?? null;
  const profileUsername = profileUsernameValue ? `@${profileUsernameValue}` : null;

  const drawerWidth = useMemo(() => {
    const proposedWidth = Math.round(width * 0.62);
    return Math.max(MIN_DRAWER_WIDTH, Math.min(MAX_DRAWER_WIDTH, proposedWidth));
  }, [width]);

  useEffect(() => {
    if (drawerOpen) {
      setMounted(true);
    }

    Animated.timing(progress, {
      duration: 220,
      toValue: drawerOpen ? 1 : 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !drawerOpen) {
        setMounted(false);
      }
    });
  }, [drawerOpen, progress]);

  const handleNavigate = (routeName: DrawerRouteName) => {
    closeDrawer();
    requestAnimationFrame(() => {
      navigateTo(routeName);
    });
  };

  const handleNavigateTab = (tabName: keyof MainTabParamList) => {
    closeDrawer();
    requestAnimationFrame(() => {
      navigateToTab(tabName);
    });
  };

  const guestItems: DrawerItemConfig[] = [
    {
      icon: 'grid',
      label: 'Categories',
      onPress: () => handleNavigate('Categories'),
    },
    {
      icon: 'grid',
      label: 'Organizations',
      onPress: () => handleNavigate('Organizations'),
    },
    {
      icon: 'map-pin',
      label: 'Venues',
      onPress: () => handleNavigate('Venues'),
    },
    {
      icon: 'users',
      label: 'Community',
      onPress: () => handleNavigate('Community'),
    },
  ];

  const sharedItems: DrawerItemConfig[] = [
    {
      icon: 'moon',
      label: isDark ? 'Light mode' : 'Dark mode',
      onPress: toggleMode,
    },
  ];

  const authedItems: DrawerItemConfig[] = [
    {
      icon: 'grid',
      label: 'Categories',
      onPress: () => handleNavigate('Categories'),
    },
    {
      icon: 'grid',
      label: 'Organizations',
      onPress: () => handleNavigate('Organizations'),
    },
    {
      icon: 'map-pin',
      label: 'Venues',
      onPress: () => handleNavigate('Venues'),
    },
    {
      icon: 'users',
      label: 'Community',
      onPress: () => handleNavigate('Community'),
    },
    {
      icon: 'briefcase',
      label: 'My Organizations',
      onPress: () => handleNavigate('MyOrganizations'),
    },
    {
      icon: 'settings',
      label: 'Settings',
      onPress: () => handleNavigate('Settings'),
    },
    {
      icon: 'shield',
      label: 'Admin Portal',
      onPress: () => handleNavigate('Admin'),
    },
    {
      icon: 'log-out',
      label: 'Logout',
      onPress: () => {
        signOut();
        closeDrawer();
        requestAnimationFrame(() => {
          resetToHomeTab();
        });
      },
    },
  ];

  if (!mounted) {
    return null;
  }

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.48],
  });

  const drawerTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerWidth, 0],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      />
      <Pressable onPress={closeDrawer} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.surface,
            borderLeftColor: theme.colors.border,
            paddingTop: insets.top + 12,
            transform: [{ translateX: drawerTranslateX }],
            width: drawerWidth,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.panelContent,
            {
              paddingBottom: Math.max(insets.bottom + 20, 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isAuthenticated ? (
            <View style={styles.authedHeaderRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleNavigateTab('Account')}
                style={({ pressed }) => [
                  styles.authedProfileButton,
                  {
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ProfileAvatar imageUrl={profile?.profile_picture} label={profileName} size={62} />
                <View style={styles.authedProfileCopy}>
                  <Text style={[styles.authedName, { color: theme.colors.textPrimary }]}>{profileName}</Text>
                  {profileUsername ? (
                    <Text style={[styles.authedUsername, { color: theme.colors.textSecondary }]}>
                      {profileUsername}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <DrawerCloseButton />
            </View>
          ) : (
            <View style={styles.guestHeaderRow}>
              <View />
              <DrawerCloseButton />
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (isAuthenticated) {
                handleNavigate('CreateEvent');
                return;
              }

              handleNavigate('Register');
            }}
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: theme.colors.secondary,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <View style={styles.ctaContent}>
              {isAuthenticated ? <Feather color={theme.colors.primaryContrast} name="plus-circle" size={20} /> : null}
              <Text style={[styles.ctaText, { color: theme.colors.primaryContrast }]}>
                {isAuthenticated ? 'Host an event' : 'Join Gatherle'}
              </Text>
            </View>
          </Pressable>

          <DrawerDivider />

          {[...(isAuthenticated ? authedItems : guestItems), ...sharedItems].map((item) => (
            <MenuItem icon={item.icon} key={item.label} label={item.label} onPress={item.onPress} />
          ))}

          <DrawerDivider />
          <SocialLinksRow />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000000',
  },
  panel: {
    borderLeftWidth: 1,
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  panelContent: {
    gap: 4,
    paddingHorizontal: 22,
  },
  guestHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authedHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  authedProfileButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    marginRight: 12,
  },
  authedProfileCopy: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  authedName: {
    ...typography.bodyBold,
    fontSize: fontSize.xl,
    lineHeight: 22,
  },
  authedUsername: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  authedEmail: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  closeButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  ctaButton: {
    borderRadius: 16,
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  ctaContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  divider: {
    height: 1,
    marginBottom: 12,
    marginTop: 4,
    width: '100%',
  },
  menuItem: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  menuLabel: {
    ...typography.bodyMedium,
    fontSize: fontSize.lg,
  },
  socialButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialSection: {
    gap: 12,
    paddingTop: 8,
  },
  socialTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
});
