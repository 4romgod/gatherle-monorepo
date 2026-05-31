import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import { AdminSurfaceCard } from './AdminSurfaceCard';

export function AdminEntityCardSkeleton() {
  return (
    <AdminSurfaceCard>
      <View style={styles.header}>
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.subtitle} />
        <View style={styles.metaRow}>
          <SkeletonBlock style={styles.pill} />
          <SkeletonBlock style={styles.pill} />
        </View>
      </View>
      <SkeletonBlock style={styles.descriptionLong} />
      <SkeletonBlock style={styles.descriptionShort} />
      <View style={styles.actions}>
        <SkeletonBlock style={styles.actionButton} />
        <SkeletonBlock style={styles.actionButton} />
      </View>
    </AdminSurfaceCard>
  );
}

type AdminEntityListSkeletonProps = {
  count?: number;
};

export function AdminEntityListSkeleton({ count = 3 }: AdminEntityListSkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <AdminEntityCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 999,
    height: 30,
    width: 80,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  descriptionLong: {
    borderRadius: 6,
    height: 12,
    width: '92%',
  },
  descriptionShort: {
    borderRadius: 6,
    height: 12,
    width: '64%',
  },
  header: {
    gap: 8,
  },
  list: {
    gap: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  pill: {
    borderRadius: 999,
    height: 22,
    width: 92,
  },
  subtitle: {
    borderRadius: 6,
    height: 12,
    width: '40%',
  },
  title: {
    borderRadius: 8,
    height: 18,
    width: '55%',
  },
});
