import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import { CategoryTile } from '@/components/discovery/CategoryTile';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { useAppShell } from '@/app/providers/AppShellProvider';

export function CategoriesScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { authToken } = useAppShell();
  const { categories, error, loading, refetch } = useMobileHomeDiscovery(authToken);
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.description].filter(Boolean).some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [categories, query]);

  return (
    <PageContainer>
      <PageHeading
        subtitle="Find the themes people care about most on Gatherle, then jump into related events and communities."
        title="Categories"
      />
      <SearchField onChangeText={setQuery} placeholder="Search categories" value={query} />

      {loading && filteredCategories.length === 0 ? (
        <StateNotice message="Loading categories..." />
      ) : error ? (
        <StateNotice actionLabel="Retry" message="We couldn’t load categories." onPressAction={() => void refetch()} />
      ) : filteredCategories.length > 0 ? (
        <View style={styles.grid}>
          {filteredCategories.map((category) => (
            <CategoryTile
              category={category}
              key={category.eventCategoryId}
              onPress={() =>
                navigation.navigate('MainTabs', {
                  params: { initialSearch: category.name },
                  screen: 'Events',
                })
              }
            />
          ))}
        </View>
      ) : (
        <StateNotice message="No categories matched your search." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
