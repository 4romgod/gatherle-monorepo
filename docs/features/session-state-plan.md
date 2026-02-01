# Session state persistence proposal

## Why this matters

Refreshing a page today discards the tab the user was on, any partially filled form data, and other UI choices that are
valuable context for the next visit. Persisting the _right_ subset of client-side state keeps power users productive,
reduces accidental data loss, and can later be extended to **support cross-device continuity**.

## Candidate pieces of state to save

1. **Selected tab (especially admin console tabs & account settings tabs)** – losing the current tab forces the user to
   scroll back to the same section after every reload.
2. **Draft event data** – the most painful experience is writing a long event form and accidentally refreshing. Saving
   the form state (either per field or as the entire payload) prevents retyping.
3. **Filters/search/scroll positions in heavy lists (events list, category explorer)** – these are lower priority but
   worth capturing once we have the infrastructure.
4. **Any modal/dialog state where closing/reloading loses progress** (e.g., multi-step admin actions).

## Requirements

- Persistence should survive a full page reload but not necessarily a logout (sensitive data must not linger).
- It must work in the client-only forms/context (admin tabs and account settings pages already run in the browser).
- Storage should be scoped per user and namespace to avoid cross-user leakage in shared browsers (use combined keys
  e.g., `ntlango:sessionstate:account-events-tab:<userId>`).
- Provide a way to clear stale drafts (e.g., “Discard draft” button on the event form) and automatically expire data
  after a configurable duration.
- Minimal impact on bundle size/performance. We already ship MUI/Tailwind; adding a small helper hook is acceptable.

## Implementation options

| Option                                                 | Pros                                                                          | Cons                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `localStorage` with custom hook (`usePersistentState`) | Simple, synchronous, no extra dependencies, works across reloads              | Requires serialization/guarding for server-side renders; no built-in expiration          |
| `sessionStorage`                                       | Same API as localStorage but clears on tab close (safer for sensitive drafts) | Users expect persistence across browser restarts; session storage would drop data        |
| IndexedDB (via wrapper like `idb-keyval`)              | Can handle larger payloads, async, can store structured data                  | More complex, async plumbing, overkill for small state                                   |
| Cookies                                                | Automatically scoped and can set expirations                                  | Not ideal for per-component state, limited size (~4kb)                                   |
| Server-side persistence (features table)               | Works across devices and browsers                                             | Introduces backend read/write complexity, requires schema + migration, increases latency |

## Proposed approach

1. **Start with a lightweight `usePersistentState` hook (backed by `localStorage`).**
   - Hook accepts a key, default value, and options like `ttl` and `storageType` (`localStorage` vs `sessionStorage`).
   - Handles hydration guard (no `window` references during SSR) and JSON serialization/deserialization.
   - Automatically namespaces keys with the user ID when provided.
2. **Apply the hook for tab state.**
   - Wrap `CustomTabs` with a prop that stores the selected tab index/key; on mount read from `localStorage`, on change
     persist.
   - Admin console and account settings pages can pass the same hook via `tabsProps`.
3. **Use the hook around the event creation/edit form.**
   - Persist the entire form payload as the user types.
   - Add a “Discard draft” control (or auto-clear after successful submit).
   - Consider throttling updates to avoid excessive writes (e.g., `useDebouncedCallback`).
4. **Future expansions**
   - Once the hook is reliable, extend to filters or other panels.
   - Potentially add a global “draft manager” UI that lists saved drafts.
5. **Cleanup & boundaries**
   - Clear stored drafts when the user explicitly resets the form, navigates away after submission, or logs out.
   - Provide a dev helper to inspect stored keys (optional, but helpful during testing).

## Next steps

1. Implement `usePersistentState` in `apps/webapp/hooks/` or `utils` with tests covering serialization/expiration.
2. Update `CustomTabs` to accept optional persistence config (key + default index) and persist the selected tab.
3. Wrap the event mutation form state in the new hook, add UI for clearing drafts, and ensure that submit clears the
   storage entry.
4. Review other high-impact areas (filters, dialog state) and expand once the pattern proves stable.
5. Document the preserved keys/pattern in `docs/session-state-plan.md` plus any new README additions for future
   contributors.

## Persisted keys & UX notes

- **`ntlango:sessionstate:<componentId>` tabs** – `CustomTabs` now accepts optional persistence metadata (`key`,
  `namespace`, `userId`). The admin console and account settings pages use it to write the selected tab index into
  `localStorage` via the hook, so reloads begin on the last tab and each user keeps their own view.
- **`event-mutation:<eventId|slug|new>` drafts** – The event creation/edit form feeds its entire payload through
  `usePersistentState` (title, summary, description, dates/location data, switches, category array, media/links,
  capacity/rsvp settings, etc.). Drafts live for 7 days and are scoped by the current `userId`. A “Discard draft” button
  now opens `ConfirmDialog` and only clears storage when the user explicitly confirms, preventing accidental loss.
- **`venue-mutation:<userId>:venue-creation-form` drafts** – The venue creation form persists all form fields (name,
  type, address, capacity, amenities, URL) via `usePersistentState` with a 7-day TTL. Users can resume creating a venue
  after page reload, with a "Discard draft" button to clear the saved state. Draft is automatically cleared on
  successful venue creation.
- **`filters:events-filter-state`** – `EventFilterProvider` serializes the categories, statuses, search query, date
  range (with Dayjs dates converted to ISO strings), and location filters via `usePersistentState`, keeping them around
  for seven days per user. Reloading the events page rehydrates that snapshot, so power users return to the filter set
  they last configured, while the existing "Clear filters"/reset helpers now also truncate the stored copy. Custom
  `serialize`/`deserialize` functions handle Dayjs object conversion to ensure safe JSON storage.
- **Category filter state** – When the form hands `eventData.eventCategories` to `CategoryFilter`, the dropdown seeds
  its local selection array from that prop, so the rendered chips always reflect the persisted event category list
  without relying on `EventFilterContext`.

## Phased rollout

1. **✅ Phase 1 – Foundational client hook & tabs (Goal: 2–3 dev days).** Delivered the `usePersistentState` helper with
   hydration guards, TTL handling, and user-scoped key generation, then wired it into `CustomTabs` (admin + account
   settings). The focus was on proving the hook works across reloads without bloating bundles.
2. **✅ Phase 2 – Event draft persistence (Goal: 5–7 dev days).** Extended the hook into `EventMutationForm`, added the
   "Discard draft" affordance, and ensured successful submits/logouts clear storage.
3. **✅ Phase 3 – Filters & multi-step forms (Goal: iterative).** Implemented filter persistence with custom Dayjs
   serialization in `EventFilterProvider`, added venue form persistence with hydration-safe display state, and
   documented all persisted keys. Fixed hydration mismatches and infinite loop issues.

**All core phases complete!** Optional enhancements: draft manager UI, server sync for cross-device continuity,
additional form persistence based on user feedback.

---

## Features that depend on session state

### Cross-device continuity

- Once the client-side persistence proves reliable, we can sync a subset of the saved state (tab selection, active
  draft, filters) to the backend so the user sees the same state across devices.
- Implement this by having the persistence hook optionally call a GraphQL mutation (or REST endpoint) that stores the
  serialized state in a user-specific record (e.g., `UserPreference` or `UserSessionState`).
- Only sync non-sensitive data, respect privacy (no auth tokens), and version the payload so we can evolve the schema
  without breaking older stored states.
- On hydration, read from the server first (if available), fall back to `localStorage`, and write through the hook when
  the user changes the state again.
- Provide a migration/clear path so stale or corrupted server-side state can be reset without impacting the local draft.

### Location-based onboarding

- When a new visitor lands on the site, we can ask for browser geolocation permission and, if granted, save the
  coordinates + consent flag via the persistence hook so we can apply location filters for future sessions without
  re-prompting.
- Store a `(permissionGranted, { latitude, longitude })` tuple alongside other session state keys so we know whether to
  auto-apply `EventsQueryOptionsInput.location` when building the initial feed (the backend already supports this via
  `createLocationMatchStage`).
- If the user denies permission, persist that decision and keep showing the global (non-location-filtered) view, but
  surface a “Enable location discovery” CTA later so they can grant access and reset the saved preference.
- Treat the stored location as non-sensitive (no auth tokens); clear it when the user explicitly signs out or revokes
  the preference. Include a UI affordance to “Forget my location” so the hook can drop the entry and re-prompt on next
  visit.

---

## Phase 3 Implementation Notes (Filter Persistence)

### Changes Made

1. **Enhanced `usePersistentState` hook** with custom serialization support:
   - Added `serialize` and `deserialize` optional parameters to `PersistentStateOptions`
   - Allows complex types (like Dayjs) to be properly stored in localStorage
   - Maintains backward compatibility for hooks without custom serialization

2. **Updated `EventFilterProvider`**:
   - Replaced `useState` with `usePersistentState`
   - Added `serializeFilters` helper to convert Dayjs dates to ISO strings
   - Added `deserializeFilters` helper to convert ISO strings back to Dayjs objects
   - Storage key: `filters:<userId>:events-filter-state`
   - TTL: 7 days
   - `resetFilters()` now calls `clearStorage()` to remove persisted state

3. **Updated `EventsPageClient`**:
   - Extracts `userId` from session
   - Passes `userId` prop to `EventFilterProvider`
   - Enables per-user filter persistence

### Technical Details

**Serialization Strategy:**

```typescript
// Before storage (Dayjs → ISO string)
const serializeFilters = (filters: EventFilters): SerializedEventFilters => ({
  categories: filters.categories,
  dateRange: {
    start: filters.dateRange.start ? filters.dateRange.start.toISOString() : null,
    end: filters.dateRange.end ? filters.dateRange.end.toISOString() : null,
    filterOption: filters.dateRange.filterOption,
  },
  // ... other fields
});

// After retrieval (ISO string → Dayjs)
const deserializeFilters = (serialized: SerializedEventFilters): EventFilters => ({
  dateRange: {
    start: serialized.dateRange.start ? dayjs(serialized.dateRange.start) : null,
    end: serialized.dateRange.end ? dayjs(serialized.dateRange.end) : null,
    // ...
  },
  // ... other fields
});
```

**Storage Key Pattern:**

- Format: `filters:<userId>:events-filter-state`
- Example: `filters:user-123:events-filter-state`
- Non-authenticated users: `filters:events-filter-state` (no userId segment)

### User Experience

- **On filter change**: Automatically persisted to localStorage
- **On page reload**: Filters restore to last saved state
- **On "Clear filters"**: Both UI and localStorage are reset
- **After 7 days**: Expired entries are automatically dropped
- **Per user**: Different users on the same browser see their own filter state

### Testing Recommendations

1. Set filters (categories, date range, status, location, search)
2. Reload the page → verify filters persist
3. Click "Clear filters" → verify localStorage is cleared
4. Switch users → verify each user has independent filter state
5. Wait for expiry (or manually adjust `expiresAt`) → verify expired filters are cleared

## Backend Sync Implementation (Phase 3 Extension)

### Architecture

Backend sync enables cross-device continuity by optionally persisting session state to MongoDB via GraphQL. The
implementation follows a **write-through cache pattern**: localStorage acts as the fast, synchronous cache while the
backend provides authoritative state for cross-device access.

### Backend Components

**1. GraphQL Schema** (`packages/commons/lib/types/user.ts`)

- `SessionState` type: Stores key/value pairs with versioning and timestamps

  ```typescript
  @ObjectType()
  export class SessionState {
    @Field(() => String)
    key: string;

    @Field(() => GraphQLJSON)
    value: Record<string, any>;

    @Field(() => Int, { nullable: true })
    version?: number;

    @Field(() => Date)
    updatedAt: Date;
  }
  ```

- `SessionStateInput`: Input type for saving state
- `UserPreferences.sessionState`: Array of session states attached to user

**2. GraphQL Resolvers** (`apps/api/lib/graphql/resolvers/user.ts`)

- `saveSessionState`: Upsert session state for a specific key
- `readSessionState`: Fetch state for a single key
- `readAllSessionStates`: Fetch all states for current user
- `clearSessionState`: Remove state for a specific key
- `clearAllSessionStates`: Wipe all session states

**3. DAO Layer** (`apps/api/lib/mongodb/dao/user.ts`)

- `saveSessionState()`: Updates or creates session state in user's preferences using `markModified('preferences')` for
  Mongoose
- `readSessionState()`: Retrieves state by key with find/filter logic
- `readAllSessionStates()`: Returns all states for a user
- `clearSessionState()`: Filters out specific key from array
- `clearAllSessionStates()`: Clears sessionState array entirely

### Frontend Integration

**Enhanced `usePersistentState` Hook** (`apps/webapp/hooks/usePersistentState.ts`)

Added `syncToBackend` and `token` options to enable cross-device sync.

**Optimized Behavior with Backend Sync:**

**Original Implementation (Blocking):**

- Read: Wait for backend query → set isHydrated → render with data
- Problem: 500ms+ wait before UI renders, poor UX

**Optimized Implementation (Non-blocking):**

1. **Instant hydration**: First useLayoutEffect loads localStorage immediately, sets `isHydrated=true`
2. **Background sync**: Second useLayoutEffect syncs from backend when data arrives, updates localStorage cache
3. **Write**: Synchronous write to localStorage → async write to backend (fire-and-forget)
4. **Error handling**: Backend failures don't block user; localStorage continues working
5. **Priority**: Backend data takes precedence when available, but doesn't block initial render

**Key Code Structure:**

```typescript
// First effect: Instant localStorage hydration
useLayoutEffect(() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(fullKey);
    if (stored) {
      const parsed = deserializeValue(stored);
      if (!isExpired(parsed.expiresAt)) {
        setInternalValue(parsed.value);
      }
    }
    setIsHydrated(true); // Always set hydrated after localStorage check
  }
}, [fullKey]);

// Second effect: Background sync from backend
useLayoutEffect(() => {
  if (syncToBackend && backendData && !backendLoading) {
    // Update localStorage cache with backend data
    // Silent update without blocking
  }
}, [backendData, backendLoading, syncToBackend]);
```

**Performance Metrics:**

- localStorage read: 0-1ms (synchronous)
- Backend query: 100-500ms (asynchronous, non-blocking)
- UI render: Instant with cached data

### Components Using Backend Sync

**1. EventFilterProvider** (`apps/webapp/components/events/filters/EventFilterContext.tsx`)

- **Enabled**: ✅ Backend sync active
- **Key**: `filters:<userId>:events-filter-state`
- **Config**: `syncToBackend: true, token: session?.user?.token`
- **Bug fixes applied**:
  - Defensive defaults in `deserializeFilters`: `categories || []`, `searchQuery || ''`, `location || {}`
  - Optional chaining in `hasActiveFilters`: `filters.location?.city`
  - Prevents "cannot access property 'city', filters.location is undefined" errors

**2. CustomTabs** (`apps/webapp/components/core/tabs/CustomTabs.tsx`)

- **Enabled**: ✅ Backend sync active for admin console and account settings
- **Keys**:
  - `admin-console-tabs`
  - `account-settings-tabs`
- **Config**: Passed via `TabPersistenceConfig` with `syncToBackend` and `token`
- **Hydration fix applied**:
  - Uses `displayValue = isHydrated ? value : defaultTab` pattern
  - Prevents React hydration mismatch between server (defaultTab) and client (persisted value)
  - Server and initial client render both use defaultTab, smooth transition after hydration

### Integration Steps

To enable backend sync for a component using `usePersistentState`:

1. Add `syncToBackend: true` to options
2. Pass `token: session?.user?.token`
3. Ensure `userId` is provided
4. Test cross-device: login on multiple browsers/devices

**Example:**

```typescript
const { value, setValue, isHydrated } = usePersistentState({
  key: 'my-component-state',
  defaultValue: initialState,
  userId: session?.user?.id,
  syncToBackend: true,
  token: session?.user?.token,
  ttl: 7,
});

// For hydration-safe rendering (SSR):
const displayValue = isHydrated ? value : defaultValue;
```

### Security & Privacy

- All mutations require authentication (`@Authorized` decorator)
- Session state is scoped per user (no cross-user leakage)
- Non-sensitive data only (no passwords, tokens, or PII)
- Versioning supports schema evolution
- JWT tokens passed via Apollo Client context, never stored in session state

### Known Issues & Fixes

**Issue 1: Slow persisted state (500ms blocking)**

- **Symptom**: UI freezes waiting for backend query before rendering
- **Root cause**: Original implementation waited for backend before setting `isHydrated=true`
- **Solution**: Split hydration into two phases - instant localStorage load + background backend sync
- **Status**: ✅ Fixed

**Issue 2: Location undefined error**

- **Symptom**: `TypeError: can't access property 'city', filters.location is undefined`
- **Root cause**: Backend data could have undefined nested properties
- **Solution**: Added defensive defaults (`|| []`, `|| ''`, `|| {}`) and optional chaining (`?.`)
- **Status**: ✅ Fixed

**Issue 3: React hydration mismatch in CustomTabs**

- **Symptom**: Console warning about mismatched `aria-selected` and `tabIndex` attributes
- **Root cause**: Server rendered defaultTab=0, client immediately showed persisted value=2
- **Solution**: Implemented `displayValue` pattern to ensure server and initial client render match
- **Status**: ✅ Fixed

### Error Handling & Retry Logic

**Exponential Backoff Implementation**

The `usePersistentState` hook includes resilient error handling for backend sync failures:

**Configuration:**

- **Max retry attempts**: 3 (configurable via `maxRetries` option)
- **Initial delay**: 1 second
- **Max delay**: 10 seconds
- **Backoff strategy**: Exponential with 30% jitter
- **Formula**: `baseDelay * 2^attempt * (1 + random(0, 0.3))`

**Retry Behavior:**

```typescript
const calculateRetryDelay = (attempt: number): number => {
  const exponentialDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, MAX_RETRY_DELAY);
  const jitter = cappedDelay * Math.random() * 0.3;
  return cappedDelay + jitter;
};
```

**Sync Status Tracking:**

The hook exposes three new return values for monitoring sync state:

- `syncStatus`: `'idle' | 'syncing' | 'error' | 'success'`
- `syncError`: `Error | null` - Contains the error details if sync failed
- `retrySync()`: Function to manually trigger a retry

**Example Usage:**

```typescript
const { value, setValue, syncStatus, syncError, retrySync } = usePersistentState({
  key: 'my-state',
  defaultValue: {},
  syncToBackend: true,
  token: session?.user?.token,
  onSyncError: (error, attempt) => {
    console.error(`Sync failed (attempt ${attempt}):`, error.message);
  },
  maxRetries: 3, // Optional, defaults to 3
});

// Show error UI when sync fails
{
  syncStatus === 'error' && (
    <Alert severity="error" action={<Button onClick={retrySync}>Retry</Button>}>
      Failed to sync changes: {syncError?.message}
    </Alert>
  );
}
```

**Error Flow:**

1. User changes state → `persistValue()` writes to localStorage (instant)
2. Backend sync attempt 1 fails → wait 1-1.3s (jitter)
3. Backend sync attempt 2 fails → wait 2-2.6s (jitter)
4. Backend sync attempt 3 fails → wait 4-5.2s (jitter)
5. After 3 failures → `syncStatus = 'error'`, `syncError` set, `onSyncError` callback fired
6. User can call `retrySync()` to manually attempt sync again
7. localStorage continues working regardless of backend sync status

**Graceful Degradation:**

- Backend failures **never block** the UI
- localStorage remains fully functional as fallback
- User can continue working even if backend is unavailable
- Sync automatically resumes when backend recovers

### Migration & Admin Tools

**Migration Utility** (`apps/webapp/lib/utils/migrateSessionState.ts`)

Migrates existing localStorage data to backend for users upgrading to cross-device sync.

**Functions:**

- `migrateLocalStorageToBackend()` - Standalone function for one-time migration
- `useMigrateSessionState()` - React hook version with state management

**Features:**

- Scans localStorage for keys matching namespace pattern
- Skips expired entries (respects TTL)
- Progress tracking via `onProgress(current, total, key)` callback
- Error handling with detailed error array in result
- Returns `MigrationResult { success, migratedKeys[], errors[] }`

**Example Usage:**

```typescript
const { migrate, isMigrating, result } = useMigrateSessionState();

const handleMigrate = async () => {
  const result = await migrate({
    token: session.user.token,
    userId: session.user.id,
    namespace: 'ntlango:sessionstate',
    onProgress: (current, total, key) => {
      console.log(`Migrating ${current}/${total}: ${key}`);
    },
  });

  if (result.success) {
    console.log(`Migrated ${result.migratedKeys.length} keys`);
  }
};
```

**Admin Tools**

**1. SessionStateManager** (`apps/webapp/components/admin/SessionStateManager.tsx`)

Admin UI for viewing and managing user session states. Located in Admin Console → "Session States" tab.

**Features:**

- **View all states**: Table display of all session state keys for admin user
- **Search/filter**: Find specific keys by name
- **Inspect values**: Expand rows to view JSON data with copy-to-clipboard
- **Size calculation**: Shows storage size in KB
- **Delete individual**: Remove specific session state entries
- **Clear all**: Bulk delete all session states with confirmation
- **Refresh**: Reload data from backend

**Use Cases:**

- Debugging user-reported issues with persisted state
- Viewing what data is stored per user
- Clearing corrupted or stuck states
- Support operations

**2. SessionStateSettings** (`apps/webapp/components/settings/SessionStateSettings.tsx`)

User-facing UI for resetting session data. Located in Account Settings → "Session Data" tab.

**Features:**

- **Educational content**: Explains what session state is and why to reset it
- **Reset all button**: Clear all session states with confirmation dialog
- **Success/error alerts**: Auto-dismiss feedback (5s timeout)
- **Safe operation**: Confirmation dialog prevents accidental resets

**Use Cases:**

- User wants fresh start (clear all filters, tabs, drafts)
- Troubleshooting stuck or corrupted state
- Privacy: removing all stored preferences
- Self-service without admin intervention

## Testing

### Unit Tests

**Test Suite**: `apps/webapp/test/unit/spec/hooks/usePersistentState.test.ts`

**Coverage**: 61% statements, 67% branches (18/18 tests passing)

**Test Cases:**

**localStorage Functionality (5 tests):**

1. **Hydrates from existing storage entries**
   - Pre-fills localStorage with data
   - Verifies hook loads persisted value
   - Confirms entry remains in storage

2. **Persists updates with TTL metadata**
   - Sets TTL to 1 second
   - Changes value via `setValue()`
   - Verifies localStorage contains `expiresAt` timestamp
   - Confirms expiry is in the future

3. **Clears storage and resets to default value**
   - Sets value, then calls `clearStorage()`
   - Verifies localStorage entry is removed
   - Confirms value resets to default

4. **Namespaces storage keys correctly**
   - Provides custom `namespace` and `userId`
   - Verifies key format: `${namespace}:${userId}:${key}`
   - Confirms scoped storage works

5. **Drops expired entries before hydrating**
   - Pre-fills localStorage with expired data (`expiresAt` in past)
   - Verifies hook ignores expired entry
   - Confirms localStorage clears expired data
   - Defaults to initial value

**Backend Sync (disabled) & Migration Tests:**

**Note**: Cross-device backend sync (`syncToBackend` option) is currently **disabled** in all components. The infrastructure remains in place for future enablement, but testing focus is on localStorage-only persistence.

**Test Suite**: `apps/webapp/test/unit/spec/utils/migrateSessionState.test.tsx`

**Migration Utility Test Cases (11 tests):**

1. **Key Matching**: Only migrates keys matching namespace pattern
2. **TTL Expiry**: Skips entries with expired `expiresAt` timestamp
3. **No Expiry**: Handles entries without `expiresAt` field
4. **Parse Failures**: Skips invalid JSON, continues migration
5. **Multiple Keys**: Successfully migrates multiple keys
6. **Progress Callback**: Invokes `onProgress` callback correctly
7. **Error Collection**: Collects errors when mutations fail
8. **Continue After Failure**: Migration continues after individual failures
9. **Empty Results**: Returns empty result when no keys match
10. **Empty localStorage**: Handles empty localStorage gracefully
11. **Default Namespace**: Uses default namespace when not provided

**Mocking Strategy:**

```typescript
// Mock auth utility to avoid jose ESM issues
jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
}));

// Mock Apollo Client for backend sync (infrastructure only)
jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({ data: null, loading: false, error: null })),
  useMutation: jest.fn(() => [mockMutate, { loading: false, error: null }]),
}));
```

**Test Improvements:**

- Removed flaky `waitFor` calls (not needed for synchronous `useLayoutEffect`)
- Simplified to synchronous assertions
- Faster test execution (~2.4s for full suite)
- CI/CD-friendly (no timing-dependent assertions)
- Added comprehensive migration utility tests

### localStorage Persistence Testing Checklist

This testing guide covers localStorage-only session state persistence. Cross-device backend sync is **disabled** but infrastructure remains for future enablement.

#### Test Environment Setup

- [x] Multiple browsers (Chrome, Firefox, Safari)
- [x] Same browser, different profiles/windows
- [x] Desktop + mobile device (or mobile emulator)
- [x] Clear localStorage before each test
- [x] Dev tools open to inspect localStorage

#### 1. Basic localStorage Functionality

**Test 1.1: Tab Selection Persistence**

- [ ] **Browser A**: Login → Navigate to Admin Console → Select "Events" tab
- [ ] **Browser A**: Reload page
- [ ] **Expected**: "Events" tab is pre-selected
- [ ] **Browser A**: Switch to "Categories" tab → Reload
- [ ] **Expected**: "Categories" tab is selected after reload
- [ ] **Browser B**: Login with same account (different profile/window)
- [ ] **Expected**: Tabs are independent (no sync between browsers)

**Test 1.2: Filter State Persistence**

- [ ] **Browser A**: Login → Navigate to Events page → Set filters (categories, date range, location)
- [ ] **Browser A**: Reload page
- [ ] **Expected**: Same filters are applied after reload
- [ ] **Browser A**: Clear filters → Reload
- [ ] **Expected**: Filters remain cleared
- [ ] **Browser B**: Login with same account
- [ ] **Expected**: Filters are independent (no sync between browsers)

**Test 1.3: Draft Persistence**

- [ ] **Browser A**: Login → Start creating event → Fill in title, description
- [ ] **Browser A**: Reload page
- [ ] **Expected**: Draft data is restored (title, description visible)
- [ ] **Browser A**: Discard draft → Reload
- [ ] **Expected**: Draft is cleared, form is empty
- [ ] **Browser B**: Login with same account → Navigate to create event
- [ ] **Expected**: No draft visible (localStorage is browser-specific)

#### 2. Multi-User Isolation

**Test 2.1: User-Scoped Storage**

- [ ] **User A**: Login → Set filter to "Music"
- [ ] **User A**: Logout
- [ ] **User B**: Login (different account, same browser)
- [ ] **Expected**: No filters applied (User B's default state)
- [ ] **Expected**: User B's localStorage keys use different userId namespace
- [ ] **User A**: Login again
- [ ] **Expected**: "Music" filter restored from User A's localStorage

**Test 2.2: localStorage Inspection**

- [ ] **Browser DevTools**: Open Application → Storage → Local Storage
- [ ] **Expected**: See keys like `ntlango:sessionstate:user-123:event-filter`
- [ ] **Expected**: Each user has separate namespaced keys
- [ ] **Expected**: Values are valid JSON with `value` and optional `expiresAt` fields

#### 3. Performance & Hydration

**Test 3.1: Initial Page Load Performance**

- [ ] **Measure**: Time from page load to filter hydration
- [ ] **Expected**: Filters appear instantly (< 10ms from localStorage)
- [ ] **Expected**: No visible flash/jump during hydration
- [ ] **Expected**: No hydration warnings in console

**Test 3.2: Rapid Updates**

- [ ] **Browser A**: Change filters rapidly (5+ changes in 2 seconds)
- [ ] **Expected**: UI remains responsive
- [ ] **Expected**: Each change writes to localStorage immediately
- [ ] **Expected**: No performance degradation

#### 4. TTL Expiration

**Test 4.1: Expired State Cleanup**

- [ ] **Setup**: Set TTL to 10 seconds for testing (modify code temporarily)
- [ ] **Browser A**: Set filters
- [ ] **Expected**: Filters saved with `expiresAt` timestamp
- [ ] **Wait**: 15 seconds
- [ ] **Browser A**: Reload page
- [ ] **Expected**: Expired state ignored, defaults loaded
- [ ] **Expected**: Expired entry removed from localStorage

**Test 4.2: No TTL Entries**

- [ ] **Setup**: Use component without TTL option
- [ ] **Browser A**: Set state
- [ ] **DevTools**: Inspect localStorage value
- [ ] **Expected**: No `expiresAt` field in stored JSON
- [ ] **Browser A**: Reload after long delay (hours/days)
- [ ] **Expected**: State persists indefinitely

#### 5. Error Handling

**Test 5.1: Corrupted localStorage**

- [ ] **Setup**: Manually corrupt localStorage value (set to invalid JSON)
- [ ] **Browser A**: Reload page
- [ ] **Expected**: Error logged to console
- [ ] **Expected**: Corrupted entry removed from localStorage
- [ ] **Expected**: App defaults to initial state, no crash

**Test 5.2: localStorage Quota Exceeded**

- [ ] **Setup**: Fill localStorage to near capacity (DevTools or script)
- [ ] **Browser A**: Try to save large draft
- [ ] **Expected**: Warning logged to console
- [ ] **Expected**: App continues functioning
- [ ] **Expected**: Graceful degradation (may not persist if quota full)

#### 6. Form-Specific Tests

**Test 6.1: Event Form Draft**

- [ ] **Browser A**: Create event → Fill all fields → Reload
- [ ] **Expected**: All fields restored (title, dates, location, categories, etc.)
- [ ] **Browser A**: Submit event
- [ ] **Expected**: Draft cleared after successful submission
- [ ] **Browser A**: Navigate to create new event
- [ ] **Expected**: Form is empty (previous draft cleared)

**Test 6.2: Venue Form Draft**

- [ ] **Browser A**: Create venue → Fill fields → Reload
- [ ] **Expected**: Venue draft restored
- [ ] **Browser A**: Discard draft
- [ ] **Expected**: Confirmation dialog appears
- [ ] **Browser A**: Confirm discard
- [ ] **Expected**: Form reset, localStorage cleared

#### 7. Edge Cases

**Test 7.1: Very Large State**

- [ ] **Browser A**: Create event with large description (10KB+ text)
- [ ] **Browser A**: Save draft → Reload
- [ ] **Expected**: Full draft loads correctly
- [ ] **Expected**: No truncation or data loss

**Test 7.2: Special Characters**

- [ ] **Browser A**: Use special characters in form (emoji, unicode, HTML entities)
- [ ] **Browser A**: Reload page
- [ ] **Expected**: Special characters preserved correctly
- [ ] **Expected**: No encoding/decoding issues

**Test 7.3: Rapid Navigation**

- [ ] **Browser A**: Create draft → Navigate away → Navigate back quickly
- [ ] **Expected**: Draft persists through navigation
- [ ] **Browser A**: Clear draft → Navigate away → Navigate back
- [ ] **Expected**: Cleared state persists

#### 8. Mobile-Specific Tests

**Test 8.1: Mobile Browser Behavior**

- [ ] **Mobile**: Set filters → Close browser app (not tab)
- [ ] **Mobile**: Reopen browser app after 5 minutes
- [ ] **Expected**: Filters restored from localStorage

**Test 8.2: Private/Incognito Mode**

- [ ] **Private Browser**: Login → Set filters
- [ ] **Private Browser**: Reload page (same session)
- [ ] **Expected**: Filters persist within session
- [ ] **Private Browser**: Close and reopen private window
- [ ] **Expected**: localStorage cleared (private mode behavior)

#### Test Results Documentation

For each test, document:

- **Date/Time**: When test was performed
- **Environment**: Browsers/devices used
- **Result**: Pass/Fail
- **Notes**: Any observations, edge cases, or issues
- **Screenshots**: For UI-related tests

#### Known Limitations (Backend Sync Disabled)

- ✅ **localStorage-only**: State persists per browser/device only
- ✅ **No cross-device sync**: Changes don't sync across browsers/devices
- ✅ **User isolation**: Each user's state is namespaced correctly
- ✅ **Performance**: Instant hydration, no network latency
- ⚠️ **Backend infrastructure**: Ready for future enablement (set `syncToBackend: true`)
- ⚠️ **Admin tools**: SessionStateManager and SessionStateSettings UI ready but unused
- ⚠️ **Migration utility**: `useMigrateSessionState` available for future data migration

#### Automated Testing Status

- [x] Unit tests for `usePersistentState` hook (18 tests)
- [x] Unit tests for `migrateSessionState` utility (11 tests)
- [ ] Integration test for TTL expiration with real timers
- [ ] E2E test with Playwright for full user flows
- [ ] Performance benchmarks for large state objects
