import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

export type ActionTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';

export type HeroMetric = {
  label: string;
  value: string;
};

type ScreenLayoutProps = {
  sectionLabel: string;
  title: string;
  description: string;
  badge?: string;
  metrics?: HeroMetric[];
  children: ReactNode;
};

type SectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

type ActionTileProps = {
  label: string;
  description: string;
  tone?: ActionTone;
  onPress?: () => void;
};

type TonePillProps = {
  label: string;
  tone?: ActionTone;
};

function getTonePalette(tone: ActionTone, colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  switch (tone) {
    case 'primary':
      return { accent: colors.primary, soft: colors.primarySoft };
    case 'secondary':
      return { accent: colors.secondary, soft: colors.secondarySoft };
    case 'success':
      return { accent: colors.success, soft: colors.successSoft };
    case 'warning':
      return { accent: colors.warning, soft: colors.warningSoft };
    case 'error':
      return { accent: colors.error, soft: colors.errorSoft };
    case 'neutral':
    default:
      return { accent: colors.textSecondary, soft: colors.surfaceMuted };
  }
}

export function ScreenLayout({ sectionLabel, title, description, badge, metrics, children }: ScreenLayoutProps) {
  const { theme } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <LinearGradient
        colors={theme.colors.heroGradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.sectionPill,
              { backgroundColor: theme.colors.heroCard, borderColor: theme.colors.heroCardBorder },
            ]}
          >
            <Text style={[styles.sectionPillText, { color: theme.colors.heroText }]}>{sectionLabel}</Text>
          </View>
          {badge ? (
            <View
              style={[
                styles.badgePill,
                { backgroundColor: theme.colors.heroCard, borderColor: theme.colors.heroCardBorder },
              ]}
            >
              <Text style={[styles.badgePillText, { color: theme.colors.heroSubtle }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: theme.colors.heroText }]}>{title}</Text>
          <Text style={[styles.heroDescription, { color: theme.colors.heroSubtle }]}>{description}</Text>
        </View>
        {metrics?.length ? (
          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <View
                key={`${metric.label}-${metric.value}`}
                style={[
                  styles.metricCard,
                  { backgroundColor: theme.colors.heroCard, borderColor: theme.colors.heroCardBorder },
                ]}
              >
                <Text style={[styles.metricValue, { color: theme.colors.heroText }]}>{metric.value}</Text>
                <Text style={[styles.metricLabel, { color: theme.colors.heroSubtle }]}>{metric.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
      <View style={styles.sections}>{children}</View>
    </ScrollView>
  );
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {title ? <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{title}</Text> : null}
      {description ? (
        <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function ActionTile({ label, description, tone = 'primary', onPress }: ActionTileProps) {
  const { theme } = useAppTheme();
  const palette = getTonePalette(tone, theme.colors);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: palette.soft }]}>
        <View style={[styles.actionDot, { backgroundColor: palette.accent }]} />
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>
      <Feather color={theme.colors.textMuted} name="chevron-right" size={18} />
    </Pressable>
  );
}

export function TonePill({ label, tone = 'neutral' }: TonePillProps) {
  const { theme } = useAppTheme();
  const palette = getTonePalette(tone, theme.colors);

  return (
    <View style={[styles.tonePill, { backgroundColor: palette.soft, borderColor: theme.colors.border }]}>
      <Text style={[styles.tonePillText, { color: palette.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: 16,
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 28,
    gap: 20,
    overflow: 'hidden',
    padding: 24,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionPillText: {
    ...typography.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badgePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgePillText: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
  heroCopy: {
    gap: 10,
  },
  heroTitle: {
    ...typography.displayBold,
    fontSize: 34,
    letterSpacing: -1.2,
    lineHeight: 38,
  },
  heroDescription: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricValue: {
    ...typography.displayBold,
    fontSize: 20,
  },
  metricLabel: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
  sections: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  cardDescription: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  cardBody: {
    gap: 12,
  },
  actionTile: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionDot: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionLabel: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  actionDescription: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  tonePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tonePillText: {
    ...typography.bodyBold,
    fontSize: 12,
  },
});
