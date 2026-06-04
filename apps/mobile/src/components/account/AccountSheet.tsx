import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AccountSheetProps = {
  isAdmin?: boolean;
  onClose: () => void;
  onOpenAdmin?: () => void;
  onOpenSettings: () => void;
  onOpenOrganizations: () => void;
  onLogout: () => void;
  visible: boolean;
};

type AccountSheetActionProps = {
  destructive?: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  secondaryText?: string;
};

function AccountSheetAction({ destructive = false, icon, label, onPress, secondaryText }: AccountSheetActionProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        {
          backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.actionIconWrap,
          {
            backgroundColor: destructive ? `${theme.colors.error}18` : theme.colors.surfaceMuted,
          },
        ]}
      >
        <Feather color={destructive ? theme.colors.error : theme.colors.textPrimary} name={icon} size={18} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionLabel, { color: destructive ? theme.colors.error : theme.colors.textPrimary }]}>
          {label}
        </Text>
        {secondaryText ? (
          <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>{secondaryText}</Text>
        ) : null}
      </View>
      <Feather color={theme.colors.textSecondary} name="chevron-right" size={18} />
    </Pressable>
  );
}

export function AccountSheet({
  isAdmin = false,
  onClose,
  onOpenAdmin,
  onOpenOrganizations,
  onOpenSettings,
  onLogout,
  visible,
}: AccountSheetProps) {
  const { isDark, theme, toggleMode } = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['64%'], []);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }

    sheetRef.current?.dismiss();
  }, [visible]);

  useEffect(() => {
    if (!mounted || !visible) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      sheetRef.current?.present();
    });

    return () => cancelAnimationFrame(frame);
  }, [mounted, visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} pressBehavior="close" />
    ),
    [],
  );

  const runAction = (action: () => void) => {
    onClose();
    requestAnimationFrame(() => {
      action();
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 40 }}
      onDismiss={() => {
        setMounted(false);
        if (visible) {
          onClose();
        }
      }}
      snapPoints={snapPoints}
    >
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <BottomSheetScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.actions}>
            <AccountSheetAction
              icon="briefcase"
              label="My organizations"
              onPress={() => runAction(onOpenOrganizations)}
              secondaryText="Manage your hosted spaces"
            />
            <AccountSheetAction
              icon="settings"
              label="Settings"
              onPress={() => runAction(onOpenSettings)}
              secondaryText="Update account details and preferences"
            />
            {isAdmin && onOpenAdmin ? (
              <AccountSheetAction
                icon="shield"
                label="Admin portal"
                onPress={() => runAction(onOpenAdmin)}
                secondaryText="Open moderation and admin tools"
              />
            ) : null}
            <AccountSheetAction
              icon={isDark ? 'sun' : 'moon'}
              label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onPress={() => runAction(toggleMode)}
              secondaryText="Apply immediately on this device"
            />
            <AccountSheetAction
              destructive
              icon="log-out"
              label="Logout"
              onPress={() => runAction(onLogout)}
              secondaryText="End this browser session"
            />
          </View>
        </BottomSheetScrollView>
      </SafeAreaView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  actionDescription: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: 2,
  },
  actionRow: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionTextWrap: {
    flex: 1,
  },
  actions: {
    gap: 4,
  },
  body: {
    gap: 8,
    paddingBottom: 20,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  safeArea: {
    flex: 1,
  },
});
