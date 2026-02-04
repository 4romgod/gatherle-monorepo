# The useLazyQuery Pattern: Scalable Data Fetching in Ntlango

## Overview

The `useLazyQuery` pattern is a powerful approach for building scalable, performant search and autocomplete features
that can handle millions of records without degrading user experience. Unlike `useQuery` which executes immediately on
component mount, `useLazyQuery` gives you **manual control** over when queries execute.

## The Problem

Traditional approaches to search and autocomplete often fail at scale:

### ❌ Anti-Pattern: Eager Loading with useQuery

```tsx
// BAD: Loads ALL users/events on page load
const { data } = useQuery(GET_ALL_USERS);
const users = data?.users || []; // Could be millions!

// Then filter client-side
<Autocomplete options={users.filter((u) => u.name.includes(search))} />;
```

**Problems:**

- 🔴 Loads millions of records on page load
- 🔴 Huge network payload (100s of MBs)
- 🔴 Freezes browser with large datasets
- 🔴 Wastes bandwidth and memory
- 🔴 Poor user experience (slow initial load)

## The Solution: useLazyQuery Pattern

### ✅ Best Practice: Lazy Loading with Debouncing

```tsx
import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';

function SearchComponent() {
  const [searchInput, setSearchInput] = useState('');
  const [options, setOptions] = useState([]);

  // Query is NOT executed on mount
  const [search, { loading }] = useLazyQuery(SEARCH_QUERY, {
    fetchPolicy: 'network-only',
  });

  // Debounced search with lazy loading
  useEffect(() => {
    const searchTerm = searchInput.trim();

    // Minimum character requirement
    if (searchTerm.length < 2) {
      setOptions([]);
      return;
    }

    // Debounce: Wait for user to stop typing
    const timeoutId = setTimeout(async () => {
      const { data } = await search({
        variables: {
          query: searchTerm,
          limit: 50, // Limit results
        },
      });

      setOptions(data?.results || []);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchInput, search]);

  return <Autocomplete options={options} onInputChange={(_, value) => setSearchInput(value)} loading={loading} />;
}
```

**Benefits:**

- ✅ Zero data loaded on mount
- ✅ Queries only when user types
- ✅ Debouncing reduces API calls
- ✅ Limited result sets (e.g., 20-50 items)
- ✅ Fresh data every search
- ✅ Scales to millions of records

## Core Implementation Patterns

### 1. Basic useLazyQuery Pattern

```tsx
const [executeQuery, { data, loading, error }] = useLazyQuery(QUERY, {
  fetchPolicy: 'network-only', // Skip cache, always fetch fresh
});

// Execute manually when needed
const handleSearch = async () => {
  const result = await executeQuery({ variables: { query: 'search term' } });
  // Process result
};
```

### 2. Debounced Search Pattern

```tsx
useEffect(() => {
  const searchTerm = input.trim();

  if (searchTerm.length < MIN_CHARS) {
    setResults([]);
    return;
  }

  const timeoutId = setTimeout(async () => {
    const { data } = await search({ variables: { query: searchTerm } });
    setResults(data?.results || []);
  }, DEBOUNCE_MS);

  return () => clearTimeout(timeoutId); // Cleanup
}, [input, search]);
```

### 3. Pagination Pattern

```tsx
const [loadMore] = useLazyQuery(GET_MORE_ITEMS);

const handleLoadMore = async () => {
  const { data } = await loadMore({
    variables: {
      offset: items.length,
      limit: 20,
    },
  });

  setItems([...items, ...data.items]);
};
```

### 4. Conditional Loading Pattern

```tsx
const [loadDetails] = useLazyQuery(GET_DETAILS);

const handleExpand = async (id: string) => {
  if (!expandedItems.has(id)) {
    const { data } = await loadDetails({ variables: { id } });
    setDetails((prev) => ({ ...prev, [id]: data }));
  }
};
```

## Real-World Examples in Ntlango

### Example 1: User Search in Organization Settings

**File:** `apps/webapp/components/organization/OrganizationSettingsClient.tsx`

```tsx
const [searchInput, setSearchInput] = useState('');
const [userOptions, setUserOptions] = useState<User[]>([]);

const [searchUsers, { loading }] = useLazyQuery<{ readUsers: User[] }>(GetAllUsersDocument, {
  fetchPolicy: 'network-only',
});

useEffect(() => {
  const searchTerm = searchInput.trim();

  if (searchTerm.length < 2) {
    setUserOptions([]);
    return;
  }

  const timeoutId = setTimeout(async () => {
    const { data } = await searchUsers({
      variables: {
        options: {
          pagination: { limit: 50 },
        },
      },
    });

    if (data?.readUsers) {
      const searchLower = searchTerm.toLowerCase();
      const filtered = data.readUsers.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.given_name?.toLowerCase().includes(searchLower) ||
          user.family_name?.toLowerCase().includes(searchLower),
      );
      setUserOptions(filtered);
    }
  }, 300);

  return () => clearTimeout(timeoutId);
}, [searchInput, searchUsers]);
```

**Result:** Can handle millions of users, only loads 50 at a time based on search.

### Example 2: Event Search Bar

**File:** `apps/webapp/components/search/EventSearchBar.tsx`

```tsx
const [searchEvents, { loading }] = useLazyQuery<{ readEvents: Event[] }>(GetAllEventsDocument, {
  fetchPolicy: 'network-only',
});

useEffect(() => {
  const searchTerm = searchInput.trim();

  if (searchTerm.length < 2) {
    setEventOptions([]);
    return;
  }

  const timeoutId = setTimeout(async () => {
    const { data } = await searchEvents({
      variables: {
        options: {
          pagination: { limit: 20 },
        },
      },
    });

    // Client-side filtering (temporary)
    // TODO: Implement backend text search
    if (data?.readEvents) {
      const filtered = data.readEvents.filter((event) => event.title?.toLowerCase().includes(searchTerm.toLowerCase()));
      setEventOptions(filtered);
    }
  }, 300);

  return () => clearTimeout(timeoutId);
}, [searchInput, searchEvents]);
```

## Performance Comparison

### Traditional Approach (useQuery)

```
Page Load:
  ├─ Load all 1,000,000 events (500 MB) ❌
  ├─ Parse JSON (5 seconds) ❌
  ├─ Render 1,000,000 options ❌
  └─ Browser freezes ❌

First Interaction: 10+ seconds ⏱️
```

### useLazyQuery Approach

```
Page Load:
  └─ Zero queries executed ✅

User Types "music":
  ├─ Wait 300ms (debounce) ✅
  ├─ Query with limit: 20 (50 KB) ✅
  ├─ Parse JSON (10ms) ✅
  └─ Render 20 options ✅

First Interaction: 300ms ⏱️
```

**Performance Improvement: 30x faster** 🚀

## Best Practices

### 1. Always Use Debouncing

```tsx
// ✅ Good: Debounced
const timeoutId = setTimeout(() => {
  executeQuery();
}, 300);

// ❌ Bad: No debouncing (fires on every keystroke)
executeQuery(); // Don't do this in onChange
```

### 2. Set Minimum Search Length

```tsx
// ✅ Good: Require 2+ characters
if (searchTerm.length < 2) {
  setResults([]);
  return;
}

// ❌ Bad: Search on 1 character
// Single letter searches return too many results
```

### 3. Limit Result Count

```tsx
// ✅ Good: Reasonable limit
variables: {
  limit: 20;
} // or 50, depending on use case

// ❌ Bad: No limit
variables: {
} // Could return millions!
```

### 4. Use network-only Fetch Policy

```tsx
// ✅ Good: Fresh results every time
useLazyQuery(QUERY, { fetchPolicy: 'network-only' });

// ⚠️ Caution: May show stale data
useLazyQuery(QUERY, { fetchPolicy: 'cache-first' });
```

### 5. Show Loading States

```tsx
// ✅ Good: User feedback
<Autocomplete loading={searchLoading} noOptionsText={loading ? 'Searching...' : 'No results'} />

// ❌ Bad: No feedback
// User doesn't know if search is happening
```

### 6. Handle Empty States

```tsx
// ✅ Good: Different messages
noOptionsText={
  searchInput.length < 2
    ? 'Type at least 2 characters'
    : loading
      ? 'Searching...'
      : 'No results found'
}
```

### 7. Clean Up Timeouts

```tsx
// ✅ Good: Cleanup prevents memory leaks
useEffect(() => {
  const timeoutId = setTimeout(() => {
    /* ... */
  }, 300);
  return () => clearTimeout(timeoutId); // Cleanup
}, [input]);
```

## When to Use useLazyQuery

### ✅ Perfect Use Cases

- **Search bars** - User-initiated searches
- **Autocomplete** - Type-ahead suggestions
- **Filters** - Apply filters on demand
- **Load more** - Pagination/infinite scroll
- **Modal data** - Load when modal opens
- **Conditional details** - Expand to load more info
- **Export/Download** - Trigger data export

### ⚠️ Not Ideal For

- **Initial page data** - Use `useQuery` instead
- **Critical above-fold content** - Load immediately
- **Simple lookups** - If dataset is tiny (<100 items)
- **Real-time updates** - Use subscriptions instead

## Migration Guide

### Converting useQuery to useLazyQuery

**Before (Eager Loading):**

```tsx
function MyComponent() {
  const { data, loading } = useQuery(GET_ALL_USERS);
  const users = data?.users || [];

  return (
    <Autocomplete
      options={users}
      filterOptions={(options, { inputValue }) => options.filter((u) => u.name.includes(inputValue))}
    />
  );
}
```

**After (Lazy Loading):**

```tsx
function MyComponent() {
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState([]);

  const [searchUsers, { loading }] = useLazyQuery(GET_ALL_USERS, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (searchInput.length < 2) {
      setUsers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const { data } = await searchUsers({
        variables: {
          query: searchInput,
          limit: 50,
        },
      });
      setUsers(data?.users || []);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchUsers]);

  return (
    <Autocomplete
      options={users}
      onInputChange={(_, value) => setSearchInput(value)}
      loading={loading}
      filterOptions={(x) => x} // Disable - already filtered
    />
  );
}
```

## Common Pitfalls

### ❌ Mistake 1: Not Debouncing

```tsx
// BAD: Query fires on every keystroke
const handleInputChange = async (value) => {
  const { data } = await search({ variables: { query: value } });
};
```

**Fix:** Add debouncing with setTimeout + useEffect

### ❌ Mistake 2: No Minimum Length

```tsx
// BAD: Searches with 1 character
if (input.length > 0) {
  executeQuery();
}
```

**Fix:** Require 2-3 minimum characters

### ❌ Mistake 3: Unlimited Results

```tsx
// BAD: No limit, could return millions
await search({ variables: { query: input } });
```

**Fix:** Always set a limit (20-50 items)

### ❌ Mistake 4: Not Cleaning Up

```tsx
// BAD: Timeout not cleared
useEffect(() => {
  setTimeout(() => executeQuery(), 300);
  // Missing cleanup!
}, [input]);
```

**Fix:** Return cleanup function

### ❌ Mistake 5: Forgetting Loading States

```tsx
// BAD: No visual feedback
<Autocomplete options={results} />
```

**Fix:** Show loading spinner and states

## Advanced Patterns

### Pattern: Smart Caching Strategy

```tsx
const [searchCache, setSearchCache] = useState<Map<string, any>>(new Map());

const search = async (term: string) => {
  // Check cache first
  if (searchCache.has(term)) {
    return searchCache.get(term);
  }

  // Execute query
  const { data } = await executeQuery({ variables: { query: term } });

  // Cache result
  setSearchCache((prev) => new Map(prev).set(term, data));

  return data;
};
```

### Pattern: Abort Previous Requests

```tsx
useEffect(() => {
  const controller = new AbortController();

  const timeoutId = setTimeout(async () => {
    try {
      await search({
        variables: { query: input },
        context: { fetchOptions: { signal: controller.signal } },
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
    }
  }, 300);

  return () => {
    clearTimeout(timeoutId);
    controller.abort(); // Cancel in-flight requests
  };
}, [input]);
```

### Pattern: Optimistic UI Updates

```tsx
const handleSelect = async (item) => {
  // Optimistic update
  setSelected(item);

  try {
    const { data } = await loadDetails({ variables: { id: item.id } });
    setDetails(data);
  } catch (err) {
    // Rollback on error
    setSelected(null);
  }
};
```

## Backend Recommendations

While client-side filtering works for small datasets, **production systems with millions of records need backend text
search**.

### Recommended: MongoDB Text Indexes

```javascript
// Create text index on multiple fields
db.events.createIndex({
  title: 'text',
  description: 'text',
  summary: 'text',
  tags: 'text',
});

// Search with text index
db.events
  .find({ $text: { $search: 'music festival' } }, { score: { $meta: 'textScore' } })
  .sort({ score: { $meta: 'textScore' } })
  .limit(20);
```

### Recommended: Dedicated Search GraphQL Query

Instead of using `QueryOptionsInput`, create a dedicated search query:

```graphql
type Query {
  searchEvents(query: String!, limit: Int = 20, offset: Int = 0): [Event!]!
}
```

This allows:

- Backend text search with indexes
- Relevance scoring
- Fuzzy matching
- Better performance

## Where to Use This Pattern in Ntlango

### High-Priority Candidates

1. ✅ **Organization Member Search** (Already implemented)
   - File: `apps/webapp/components/organization/OrganizationSettingsClient.tsx`
2. ✅ **Event Search Bar** (Already implemented)
   - File: `apps/webapp/components/search/EventSearchBar.tsx`

3. 🔲 **Home Search Bar** (Replace placeholder)
   - File: `apps/webapp/components/home/HomeSearchBar.tsx`
   - Currently: Static placeholder
   - Should be: Actual lazy search

4. 🔲 **Venue Search** (When adding venues)
   - Any venue autocomplete fields
5. 🔲 **User Mentions/Tagging** (Future feature)
   - Comment mentions: @username
   - Event invitations

6. 🔲 **Category Search** (Interests page)
   - File: `apps/webapp/components/settings/InterestsSettingsPage.tsx`
   - Currently: Client-side filter of all categories
   - Should be: Lazy search if categories grow large

### When to Keep useQuery

- **Navigation menus** - Small, static data
- **User profile** - Current user's data
- **Event details page** - Specific event data
- **Settings data** - User preferences
- **Small lookup tables** - Countries, timezones (< 100 items)

## Monitoring and Metrics

Track these metrics to ensure the pattern is working:

```typescript
// Add timing metrics
const startTime = performance.now();
const { data } = await search({ variables: { query: input } });
const duration = performance.now() - startTime;

console.log('Search completed in', duration, 'ms');

// Track in analytics
analytics.track('search_completed', {
  query: input,
  resultsCount: data?.results.length,
  durationMs: duration,
});
```

**Target Metrics:**

- Search latency: < 500ms
- Debounce delay: 300ms
- Results per query: 20-50
- Min search length: 2 characters

## Conclusion

The `useLazyQuery` pattern is **essential for building scalable applications**. It transforms slow, memory-intensive
features into fast, responsive experiences that work with millions of records.

**Key Takeaways:**

- ✅ Use `useLazyQuery` for user-initiated searches
- ✅ Always debounce with 300ms delay
- ✅ Require minimum 2 characters
- ✅ Limit results to 20-50 items
- ✅ Use `fetchPolicy: 'network-only'`
- ✅ Show loading states
- ✅ Clean up timeouts
- ✅ Plan for backend text search

By following this pattern, Ntlango can scale to millions of users, events, and organizations without sacrificing
performance or user experience.

---

**Document Version:** 1.0  
**Last Updated:** February 2, 2026  
**Author:** Ntlango Engineering Team
