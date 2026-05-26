# useLazyQuery Pattern

This document consolidates the Gatherle guidance for `useLazyQuery` into one reference:

- the core pattern
- the implementation checklist
- current Gatherle usage
- migration guidance
- backend follow-up work

Use this when building user-initiated search, autocomplete, and on-demand lookup flows in the webapp.

---

## Why this pattern exists

`useLazyQuery` is the right default when the user should decide **when** a query runs.

Good examples:

- search bars
- autocomplete
- "load more" flows
- modal detail loading
- conditional expansion of extra data

Bad fit:

- critical page data that should load immediately
- small static lookup tables
- data that must always be available on first render

### The anti-pattern we want to avoid

Do not eagerly load large datasets on mount and then filter them in the browser.

```tsx
const { data } = useQuery(GET_ALL_USERS);
const users = data?.users ?? [];

<Autocomplete options={users.filter((user) => user.name.includes(search))} />;
```

Why this fails at scale:

- huge payloads
- slow initial render
- wasted bandwidth
- unnecessary memory pressure
- poor UX on slower devices

---

## Quick Checklist

When implementing a `useLazyQuery` search flow, the default checklist is:

- use `useState` for the input value
- use `useState` for the rendered results
- use `useLazyQuery` with `fetchPolicy: 'network-only'`
- debounce the request, usually `300ms`
- require at least `2` characters
- limit results, usually `20-50`
- clear timeouts on cleanup
- show loading and empty states
- keep client-side filtering disabled in the UI component once the backend response is already scoped

---

## Canonical Pattern

```tsx
import { useEffect, useState } from 'react';
import { useLazyQuery } from '@apollo/client';

function SearchComponent() {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState([]);

  const [runSearch, { loading }] = useLazyQuery(SEARCH_QUERY, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const searchTerm = searchInput.trim();

    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const { data } = await runSearch({
        variables: {
          query: searchTerm,
          limit: 20,
        },
      });

      setResults(data?.items ?? []);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, runSearch]);

  return (
    <Autocomplete
      options={results}
      onInputChange={(_, value) => setSearchInput(value)}
      loading={loading}
      filterOptions={(options) => options}
      noOptionsText={
        searchInput.trim().length < 2 ? 'Type at least 2 characters' : loading ? 'Searching...' : 'No results found'
      }
    />
  );
}
```

### Why these defaults are recommended

- `network-only`: searches should be fresh
- `300ms`: good balance between responsiveness and request count
- `2` characters: reduces noisy or overly broad searches
- `20-50` results: enough for UX, small enough for performance

---

## Gatherle Implementations

These are the main places where the pattern is already established.

### 1. Organization member search

Reference file:

- `apps/webapp/components/organization/OrganizationSettingsClient.tsx`

Why it fits:

- user-initiated search
- potentially large dataset
- only needs a small result window at a time

### 2. Event search bar

Reference file:

- `apps/webapp/components/search/EventSearchBar.tsx`

Current behavior:

- no initial query on mount
- debounced event search
- result limit
- loading and empty states
- reusable across multiple routes

### 3. Home and events surfaces

Current integrations:

- `apps/webapp/components/home/HomeSearchBar.tsx`
- `apps/webapp/components/events/filters/EventsHeader.tsx`
- `apps/webapp/components/events/EventsPageClient.tsx`

The important point is architectural, not just UI-level:

- the reusable search component owns the query behavior
- parent pages only respond to selection events

---

## Implementation Rules

### 1. Always debounce

Do not fire a new request on every keystroke.

```tsx
const timeoutId = window.setTimeout(() => {
  executeQuery();
}, 300);

return () => window.clearTimeout(timeoutId);
```

### 2. Require a minimum input length

For Gatherle search UIs, `2` characters is the standard default.

### 3. Limit the result set

Do not leave result counts unbounded.

Good default:

- `20` for richer cards or previews
- `50` for simpler list-style results

### 4. Disable duplicate client-side filtering

If the server already narrowed the result set, the UI should not silently apply a second filter unless that is
deliberate.

For MUI `Autocomplete`, that usually means:

```tsx
filterOptions={(options) => options}
```

### 5. Show useful empty states

Prefer distinct messages for:

- "type more"
- "searching"
- "no results"

### 6. Clean up in-flight work

Always clear timeouts. For more advanced flows, consider aborting stale requests as well.

---

## Common Mistakes

### Mistake: using `useQuery` for user-initiated search

This loads too early and usually loads too much.

### Mistake: searching on one character

One-character searches are typically too broad to be useful.

### Mistake: forgetting result limits

Large result sets defeat the point of the pattern.

### Mistake: no loading feedback

The user needs to know that work is happening.

### Mistake: forgetting cleanup

Debounce timers and stale requests should not survive input changes or unmounts.

---

## Migration Guide

When converting an eager search flow to `useLazyQuery`, use this sequence:

1. Remove the eager `useQuery`.
2. Introduce `searchInput` and result state.
3. Replace the query hook with `useLazyQuery`.
4. Add a debounced `useEffect`.
5. Add a minimum input length guard.
6. Limit the server request.
7. Add loading and empty-state UI.

### Before

```tsx
function MyComponent() {
  const { data, loading } = useQuery(GET_ALL_USERS);
  const users = data?.users ?? [];

  return <Autocomplete options={users} loading={loading} />;
}
```

### After

```tsx
function MyComponent() {
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState([]);

  const [searchUsers, { loading }] = useLazyQuery(GET_ALL_USERS, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const trimmed = searchInput.trim();

    if (trimmed.length < 2) {
      setUsers([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const { data } = await searchUsers({
        variables: {
          query: trimmed,
          limit: 50,
        },
      });

      setUsers(data?.users ?? []);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, searchUsers]);

  return (
    <Autocomplete
      options={users}
      onInputChange={(_, value) => setSearchInput(value)}
      loading={loading}
      filterOptions={(options) => options}
    />
  );
}
```

---

## Performance Expectations

What we want:

- no search query on initial page load
- sub-500ms search response in normal cases
- small payloads per interaction
- smooth typing with minimal browser work

Directional improvement versus eager loading:

- page load cost drops to near zero for the search feature
- search work happens only when the user asks for it
- memory usage stays bounded by the current result set

---

## Backend Follow-Up

`useLazyQuery` is the frontend half of the solution. For large datasets, the backend still needs dedicated search
support.

### Recommended next step

Move from broad list reads plus temporary client filtering to dedicated backend search queries.

Example shape:

```graphql
type Query {
  searchEvents(query: String!, limit: Int = 20, offset: Int = 0): [Event!]!
}
```

### Why this matters

- proper text indexes
- better relevance
- smaller payloads
- simpler frontend logic

### Current repo follow-up worth keeping in mind

The event search bar still benefits from a dedicated backend text-search query rather than relying on broad list reads
plus post-filtering.

---

## Future Candidates In Gatherle

- venue search
- organization search
- mention and tagging search
- admin user/event lookups
- category search if the taxonomy becomes large

Keep `useQuery` for:

- current-user data
- event detail pages
- settings payloads
- small lookup tables

---

## Summary

For Gatherle, `useLazyQuery` is the default pattern for user-driven search and autocomplete.

The rules are straightforward:

- do not fetch on mount
- debounce
- require 2+ characters
- limit results
- show loading states
- move real search logic into the backend as datasets grow
