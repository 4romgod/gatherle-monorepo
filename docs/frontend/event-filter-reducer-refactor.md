# EventFilterContext — Reducer Refactor

## Why this was done

`EventFilterContext` manages a single `EventFilters` state object with several fields (categories, statuses, dateRange,
searchQuery, location). Before the refactor, each setter was an inline arrow function that called
`setFilters(prev => ...)` directly inside the provider body:

```ts
// Before
const setCategories = (categories: string[]) => {
  setFilters((prev) => ({ ...prev, categories }));
};

const removeCategory = (category: string) => {
  setFilters((prev) => ({
    ...prev,
    categories: prev.categories.filter((c) => c !== category),
  }));
};
// ...repeated for every other field
```

Problems with this approach:

- **Scattered logic.** State transition rules were spread across 8+ inline functions in the provider. To understand what
  could change and how, you had to read the entire file.
- **Hard to test.** Each transition was embedded in a closure inside a React component. To test "does removing a
  category work correctly?" you had to render a component tree.
- **Unstable references.** Arrow functions defined inside the provider body are re-created on every render. Any context
  consumer that receives these as props or dependencies gets a new reference each time, potentially triggering
  unnecessary re-renders.

---

## What changed

### New file: `filtersReducer.ts`

A pure reducer function was extracted alongside the context:

```
apps/webapp/components/events/filters/
  EventFilterContext.tsx   ← provider, types, serialization
  filtersReducer.ts        ← NEW: all state-transition logic
```

The reducer is a plain TypeScript function — no React, no hooks, no side effects:

```ts
export const filtersReducer = (state: EventFilters, action: FilterAction): EventFilters => {
  switch (action.type) {
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'REMOVE_CATEGORY':
      return { ...state, categories: state.categories.filter((c) => c !== action.payload) };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    // ...etc
  }
};
```

`FilterAction` is a discriminated union — TypeScript will error at compile time if a new action type is added to the
union but not handled in the switch.

### Refactored: `EventFilterContext.tsx`

The provider now uses a `dispatch` wrapper to bridge the reducer with `usePersistentState`:

```ts
const dispatch = useCallback(
  (action: FilterAction) => {
    setFilters((prev) => filtersReducer(prev, action));
  },
  [setFilters],
);
```

Each public setter dispatches an action rather than computing state directly:

```ts
const setCategories = useCallback(
  (categories: string[]) => dispatch({ type: 'SET_CATEGORIES', payload: categories }),
  [dispatch],
);
```

All setters are wrapped in `useCallback`, so they are stable references — they only change identity if `dispatch` itself
changes (which it doesn't, since `setFilters` from `usePersistentState` is stable).

The public API of `EventFilterContextType` is **unchanged** — no consumers needed updating.

---

## Why not use `useReducer` directly?

React's `useReducer(reducer, initialState)` replaces `useState` entirely. It would be the natural fit here, except that
`EventFilterContext` uses `usePersistentState` to sync filter state to localStorage with TTL, serialization, and
optional backend sync. `usePersistentState` owns the `useState` internally.

The solution is the `dispatch` wrapper above: we get the reducer pattern (centralized transitions, action-based
dispatch, pure logic) while `usePersistentState` continues to handle persistence. If the persistence requirement were
ever removed, the provider could switch to `useReducer(filtersReducer, initialFilters)` directly — the reducer itself
would not change at all.

---

## Testing

The refactor enables two distinct layers of testing:

### Unit tests — `filtersReducer.test.ts`

Pure function tests. No rendering, no React, no provider:

```ts
it('removes the specified category', () => {
  const state = { ...initialFilters, categories: ['Music', 'Sports', 'Tech'] };
  const result = filtersReducer(state, { type: 'REMOVE_CATEGORY', payload: 'Sports' });
  expect(result.categories).toEqual(['Music', 'Tech']);
});
```

Covers all 8 action types, edge cases (removing a non-existent item, clearing with empty arrays), and immutability (the
input state is never mutated).

### Integration tests — `EventFilterContext.test.tsx`

Renders the full provider via `renderHook` and exercises the public API end-to-end, including `hasActiveFilters` derived
state and localStorage persistence:

```ts
it('persists filter changes to localStorage', () => {
  const { result } = renderHook(() => useEventFilters(), { wrapper });

  act(() => result.current.setCategories(['Music']));

  const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
  expect(JSON.parse(stored).value.categories).toEqual(['Music']);
});
```

---

## Files affected

| File                                                           | Change                                         |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `components/events/filters/filtersReducer.ts`                  | Created — pure reducer and `FilterAction` type |
| `components/events/filters/EventFilterContext.tsx`             | Refactored — uses `dispatch` + `useCallback`   |
| `test/unit/spec/components/events/filtersReducer.test.ts`      | Created — 23 pure unit tests                   |
| `test/unit/spec/components/events/EventFilterContext.test.tsx` | Created — 23 integration tests                 |
