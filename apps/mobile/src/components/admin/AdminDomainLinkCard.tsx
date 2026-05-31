import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { AdminSurfaceCard } from './AdminSurfaceCard';

type AdminDomainLinkCardProps = {
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  title: string;
};

export function AdminDomainLinkCard({ description, icon, onPress, title }: AdminDomainLinkCardProps) {
  const { theme } = useAppTheme();

  const iconBg = theme.dark ? 'rgba(122, 115, 255, 0.22)' : theme.colors.primarySoft;
  const iconColor = theme.dark ? '#c7c4ff' : theme.colors.primary;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <AdminSurfaceCard>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Feather color={iconColor} name={icon} size={18} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
          </View>
          <Feather color={theme.colors.textSecondary} name="chevron-right" size={18} />
        </View>
      </AdminSurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 4,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
});
