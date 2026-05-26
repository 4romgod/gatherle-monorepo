# useLazyQuery Quick Reference

## Basic Pattern

```tsx
const [searchInput, setSearchInput] = useState('');
const [results, setResults] = useState([]);

const [search, { loading }] = useLazyQuery(QUERY, {
  fetchPolicy: 'network-only',
});

useEffect(() => {
  if (searchInput.length < 2) {
    setResults([]);
    return;
  }

  const timeoutId = setTimeout(async () => {
    const { data } = await search({
      variables: { query: searchInput, limit: 50 },
    });
    setResults(data?.items || []);
  }, 300);

  return () => clearTimeout(timeoutId);
}, [searchInput, search]);
```

## Checklist for Implementation

- [ ] useState for search input
- [ ] useState for results
- [ ] useLazyQuery with network-only
- [ ] useEffect with debouncing (300ms)
- [ ] Minimum 2 characters check
- [ ] Limit results (20-50)
- [ ] Cleanup timeout
- [ ] Loading states
- [ ] Error handling

## Common Props Pattern

```tsx
<Autocomplete
  options={results}
  onInputChange={(_, value) => setSearchInput(value)}
  loading={loading}
  noOptionsText={searchInput.length < 2 ? 'Type at least 2 characters' : loading ? 'Searching...' : 'No results'}
  filterOptions={(x) => x} // Disable client filtering
/>
```

## Timing Recommendations

- **Debounce:** 300ms (balance between responsiveness and API calls)
- **Min characters:** 2 (prevents single-letter searches)
- **Result limit:** 20-50 (depends on item size)
- **Timeout:** 5-10s (backend timeout)

## Don'ts

❌ Don't use useQuery for user-initiated searches  
❌ Don't skip debouncing  
❌ Don't allow 1-character searches  
❌ Don't forget result limits  
❌ Don't forget to cleanup timeouts  
❌ Don't use cache-first policy

## Do's

✅ Use useLazyQuery for searches  
✅ Add 300ms debouncing  
✅ Require 2+ characters  
✅ Limit to 20-50 results  
✅ Cleanup timeouts  
✅ Use network-only policy  
✅ Show loading states

## Example Components in Codebase

1. `apps/webapp/components/organization/OrganizationSettingsClient.tsx` (User search)
2. `apps/webapp/components/search/EventSearchBar.tsx` (Event search)
