# Social Features Assessment

**Date:** 13 January 2026  
**Status:** ✅ Development  
**Feature:** User & Organization Follow System

## Executive Summary

The follow system has been successfully implemented for both users and organizations, enabling social connections with
configurable approval workflows, notification preferences, and comprehensive error handling. The implementation follows
enterprise-grade patterns with proper authentication, authorization, validation, optimistic UI updates, and real-time
follower count displays.

## Feature Overview

### Core Capabilities

- **Follow/Unfollow Users & Organizations**: Full follow support for both entity types
- **Configurable Approval Workflow**: FollowPolicy setting (Public/RequireApproval) per user/organization
- **User-Based Muting**: `mutedUserIds` and `mutedOrgIds` arrays on User model for muting content
- **Query Operations**: Retrieve following lists, followers, pending requests, and follower counts
- **Real-time Follower Counts**: Dynamically computed via FieldResolver with optimistic UI updates
- **Pending State Management**: UI properly handles pending, accepted, and rejected states
- **Blocking System**: `blockedUserIds` array on User model with cascade follow deletion

### Current Behavior

- Follow requests respect the target's `followPolicy` setting:
  - **Public**: Auto-accepts all follow requests immediately
  - **RequireApproval**: Creates pending request requiring manual approval
- Follow button shows contextual states: "Follow", "Following", or "Requested"
- Follower counts update optimistically in the UI without page refresh
- Organizations display follower stats in a dedicated card component

## Backend Implementation

### Data Model (`packages/commons/lib/types/follow.ts`)

**Follow Entity:**

```typescript
@ObjectType('Follow')
@index({ followerUserId: 1, targetType: 1, targetId: 1 }, { unique: true })
class Follow {
  followId: string;
  followerUserId: string;
  targetType: FollowTargetType; // User | Organization
  targetId: string;
  approvalStatus: FollowApprovalStatus; // Pending | Accepted | Rejected
  createdAt: Date;
  updatedAt: Date;
}
```

**User Muting & Blocking** (`packages/commons/lib/types/user.ts`):

```typescript
class User {
  // ... other fields
  mutedUserIds?: string[]; // Users whose content is muted
  mutedOrgIds?: string[]; // Organizations whose content is muted
  blockedUserIds?: string[]; // Blocked users (cannot follow/be followed)
}
```

**FollowPolicy Enum** (`packages/commons/lib/types/user.ts`):

```typescript
export enum FollowPolicy {
  Public = 'Public', // Auto-accept all follow requests
  RequireApproval = 'RequireApproval', // Require manual approval
}
```

**Enums:**

- `FollowTargetType`: User, Organization
- `FollowApprovalStatus`: Pending, Accepted, Rejected
- `FollowPolicy`: Public, RequireApproval (on User and Organization types)

**Muting Architecture:**

- Muting is stored on the User model via `mutedUserIds` and `mutedOrgIds` arrays
- This allows muting users/orgs independently of follow status (e.g., mute a commenter)
- Consistent with blocking pattern using `blockedUserIds`
- Default: `contentVisibility: Active`

### GraphQL API (`apps/api/lib/graphql/resolvers/follow.ts`)

**Mutations:**

1. `follow(input: CreateFollowInput): Follow`
   - Creates follow relationship
   - Checks target's `followPolicy` to determine initial approval status
   - Returns `Accepted` for Public targets, `Pending` for RequireApproval
   - Validates input with Zod schema

- Requires authentication (userRole set to Admin, Host, or User)

2. `unfollow(targetType, targetId): Boolean`
   - Removes follow relationship (works for both pending and accepted)
   - Returns true on success

3. `acceptFollowRequest(followId): Follow`
   - Target user accepts pending follow
   - Authorization check: only target can accept

4. `rejectFollowRequest(followId): Boolean`
   - Target user rejects pending follow
   - Authorization check: only target can reject

5. `removeFollower(followerUserId, targetType): Boolean`
   - Target user removes a follower from their list
   - Authorization check: only target can remove followers

**Queries:**

1. `readFollowing(): [Follow]`
   - Returns authenticated user's following list

2. `readFollowers(targetType, targetId): [Follow]`
   - Returns followers of specified user/org
   - Public query (no auth required)

3. `readPendingFollowRequests(targetType): [Follow]`
   - Returns pending follow requests for authenticated user
   - Used for notifications/approval UI

**FieldResolvers** (`apps/api/lib/graphql/resolvers/organization.ts`, `user.ts`):

- `followersCount`: Dynamically computes follower count using `FollowDAO.countFollowers()`
- Returns count of accepted follows only (excludes pending/rejected)

### Data Access Layer (`apps/api/lib/mongodb/dao/follow.ts`)

**Methods:**

- `upsert()`: Create or update follow with approval status
  - Uses find+save pattern (not findOneAndUpdate) to trigger Mongoose hooks
  - Accepts optional `approvalStatus` parameter based on target's policy
- `updateApprovalStatus()`: Accept/reject with authorization check
- `readPendingFollows()`: Query pending requests by target user
- `readFollowingForUser()`: Query user's following list
- `readFollowers()`: Query followers of user/org (accepted only)
- `countFollowers()`: Efficient count using `countDocuments` with accepted status filter
- `remove()`: Delete follow relationship
- `removeFollower()`: Remove a follower from the target's follower list

**Authorization:**

- `updateApprovalStatus()` verifies caller is the target user
- Prevents unauthorized approval/rejection of follow requests

**Pattern Note:** All DAO operations now use the find+save pattern instead of findOneAndUpdate to ensure Mongoose
pre-validation hooks run consistently.

### Validation (`apps/api/lib/validation/zod/social.ts`)

**Schemas:**

- `CreateFollowInputSchema`: Validates targetType, targetId
- Uses MongoDB ObjectId validation for IDs
- Enum validation for targetType

## Frontend Implementation

### GraphQL Operations

**Queries** (`apps/webapp/data/graphql/query/Follow/query.ts`):

- `GetFollowingDocument`: Fetch user's following list
- `GetFollowersDocument`: Fetch followers of user/org
- `GetPendingFollowRequestsDocument`: Fetch pending requests

**Mutations** (`apps/webapp/data/graphql/mutation/Follow/mutation.ts`):

- `FollowDocument`: Create follow
- `UnfollowDocument`: Remove follow
- `AcceptFollowRequestDocument`: Accept pending request
- `RejectFollowRequestDocument`: Reject pending request
- `RemoveFollowerDocument`: Remove a follower

**Type Exports** (`apps/webapp/data/graphql/query/Follow/types.ts`):

- `Following`: Type alias for following list items
- `Follower`: Type alias for follower list items
- Exported from main query index for developer convenience

### React Hooks (`apps/webapp/hooks/useFollow.ts`)

**1. useFollow()**

- Provides `follow()` and `unfollow()` functions
- Loading states: `isLoading`, `followLoading`, `unfollowLoading`
- Refetches following list on mutation via `refetchQueries`
- Passes JWT token via Apollo context

**2. useFollowing()**

- Queries authenticated user's following list
- Returns `following` array, `loading`, `error`
- Uses `skip: !token` to prevent unauthenticated queries
- Uses `fetchPolicy: 'cache-and-network'` for fresh data on user switch
- Auto-refetches when mutations complete

**3. useFollowers(targetType, targetId)**

- Queries followers of specified user/org
- Returns `followers` array, `loading`, `error`

**4. useFollowRequests(targetType)**

- Queries pending follow requests
- Provides `accept()` and `reject()` functions
- Returns `requests` array with loading states
- Combined `isLoading` includes query + mutation states

**5. useUpdateFollowPreferences()**

- Updates notification preferences (Active/Muted)
- Returns `updatePreferences()` function and loading state

**Authentication:**

- All hooks use `useSession()` to get JWT token
- Token passed via Apollo context headers: `{ token: session?.user?.token }`
- Hooks skip queries when token is not available

### UI Components

**FollowButton** (`apps/webapp/components/users/follow-button.tsx`):

**Features:**

- Supports both User and Organization targets via `targetType` prop
- Three visual states: "Follow", "Following", "Requested" (pending)
- Shows PersonAdd/PersonRemove/HourglassEmpty icons per state
- Loading state with CircularProgress
- Authentication check with redirect to login
- Approval status check for proper state display
- Error handling with toast notifications
- Two style variants: `default` and `primary`

**Props:**

```typescript
interface FollowButtonProps {
  targetId: string;
  targetType?: FollowTargetType; // Default: User
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  variant?: 'default' | 'primary';
}
```

**Styling:**

- `default`: White background with shadow, dark text
- `primary`: Uses MUI contained button styling
- Elevation Zero design system compliant

---

**FollowStatsCard** (`apps/webapp/components/organization/follow-stats-card.tsx`):

**Features:**

- Displays organization follower count with icon
- Integrates FollowButton for organization following
- **Optimistic UI updates**: Count adjusts immediately on follow/unfollow
- Uses refs to track previous state and prevent double-counting
- Waits for initial data load before tracking changes

**Implementation Details:**

```typescript
// Tracks follow state changes with refs (not useState) to prevent re-renders
const wasFollowingRef = useRef<boolean | null>(null);
const initialLoadDoneRef = useRef(false);

// Only adjusts count after initial load completes
if (initialLoadDoneRef.current && wasFollowingRef.current !== isCurrentlyFollowing) {
  setFollowersCount((prev) => (isCurrentlyFollowing ? prev + 1 : prev - 1));
}
```

---

**UserFollowStats** (`apps/webapp/components/users/user-follow-stats.tsx`):

**Features:**

- Displays user stats: Followers, Events Created, Events Attending, Interests
- **Optimistic UI updates** for follower count (same pattern as FollowStatsCard)
- Styled as horizontal stat row with consistent typography

**Integration:**

- Used in user profile page (`apps/webapp/app/users/[username]/page.tsx`)
- Receives initial counts from server-side query
- Updates optimistically based on follow state changes

## Architecture Decisions

### Why FollowPolicy Instead of Auto-Accept?

- Gives users and organizations control over who can follow them
- `Public` maintains backward compatibility (auto-accept behavior)
- `RequireApproval` enables private accounts without breaking existing flows
- Simple enum on User/Organization model, no complex privacy settings table
- Easy to extend with additional policies later (e.g., `Closed`, `FollowersOfFollowers`)

### Why Computed followersCount via FieldResolver?

- Eliminates need for denormalized counter maintenance
- Always accurate (no sync issues between count and actual follows)
- Uses efficient `countDocuments` query with index on `{targetType, targetId, approvalStatus}`
- Trades minor query overhead for data consistency
- Frontend uses optimistic updates to maintain UX responsiveness

### Why Optimistic UI with Refs?

- Provides immediate feedback without waiting for server response
- `useRef` instead of `useState` prevents effect re-triggers and double-counting
- `initialLoadDoneRef` prevents false increment on initial data load
- Pattern reused across FollowStatsCard and UserFollowStats components

### Why Nested Notification Preferences?

- Extensibility: Can add push, email, event-type filters later
- Keeps follow model clean and focused
- MongoDB handles nested objects efficiently
- GraphQL ObjectType provides clear API contract

### Why Separate Accept/Reject Mutations?

- More explicit API than generic `updateApprovalStatus(input)`
- Cleaner client code: `accept(id)` vs `update({id, status: Accepted})`
- Prevents accidental status changes
- Easier to add business logic per action

### Why JWT in Apollo Context?

- Keeps auth logic in custom Apollo links
- Avoids modifying apollo-wrapper (architecture constraint)
- Per-request token passing for SSR compatibility
- Works with NextAuth.js session management

### Why skip: !token in useFollowing?

- Prevents unauthenticated users from making failed queries
- Avoids stale cache when switching between users
- Combined with `cache-and-network` for fresh data on login

## Testing & Validation

### Automated Testing

- ✅ 526 unit tests passing (including Phase 2 tests for privacy, blocking, and remove follower)
- ✅ Integration tests for social resolvers (follow, intent, activity)
- ✅ Unit tests for FollowResolver (with FollowPolicy and visibility handling)
- ✅ Unit tests for Organization followersCount FieldResolver
- ✅ Authorization checks for accept/reject/removeFollower mutations
- ✅ Tests for block/unblock cascade effects
- ✅ Tests for follow prevention when blocked
- ✅ Validation schemas working (Zod)

### Manual Testing Completed

- ✅ Follow/unfollow functionality for users
- ✅ Follow/unfollow functionality for organizations
- ✅ Pending state displays correctly ("Requested" button)
- ✅ Follower count updates optimistically
- ✅ Loading states display correctly
- ✅ Authentication redirect with progress bar
- ✅ Token passed correctly to GraphQL API
- ✅ Error toast notifications displaying
- ✅ User switching works (no stale cache)

### Code Quality

- ✅ No TypeScript errors
- ✅ Proper error handling with user feedback
- ✅ Follows Elevation Zero design system
- ✅ Consistent find+save DAO pattern across codebase
- ✅ Authentication checks in place

## Current Limitations

1. **No Bulk Operations**:
   - Cannot remove all followers
   - Cannot accept/reject multiple requests at once

2. **No Follow Limits**:
   - No rate limiting on follow actions
   - No maximum following/follower counts

## Future Enhancements

### Phase 1: Core UX (High Priority) ✅

- [x] Create PendingFollowRequests component for approval UI
- [x] Add notification badge for pending requests count
- [x] Create FollowersList and FollowingList components
- [x] Add loading skeleton for follow lists
- [x] Add FollowPolicy toggle to user/org settings page

### Phase 2: Privacy & Control (Medium Priority) ✅

- [x] Add "Remove Follower" functionality
- [x] Block/unblock users feature
- [x] Hide followers/following lists based on privacy settings
- [x] Mute notifications from specific followers

### Phase 3: Advanced Features (Low Priority)

- [ ] Push notification preferences per follow
- [ ] Email notification settings
- [ ] Event-type filter preferences
- [ ] Mutual follow detection and display
- [ ] Follow suggestions based on mutual follows
- [ ] Activity feed filtered by follows

### Phase 4: Scale & Performance

- [ ] Pagination for large follower/following lists
- [ ] Rate limiting on follow actions
- [ ] Redis caching for frequently accessed counts
- [ ] Background job for notification cleanup
- [ ] Virtual scrolling for large lists

## Completed Features ✅

### Phase 2 Complete (15 January 2026)

- ✅ **List visibility controls**: Uses `SocialVisibility` enum (Public/Followers/Private)
  - Users can control who sees their followers and following lists via settings
  - readFollowers/readFollowing resolvers enforce visibility rules
  - Organizations also support `followersListVisibility` setting
- ✅ **Remove follower capability**: New `removeFollower` mutation
  - Only target user can remove followers from their list
  - FollowDAO.removeFollower method with proper authorization
  - UI with confirmation dialog to prevent accidental removals
- ✅ **Block/unblock system**: Complete user blocking functionality
  - `blockedUserIds` array on User model
  - `blockUser`/`unblockUser` mutations with cascade follow deletion
  - Blocked users automatically unfollowed in both directions
  - Follow mutation checks block status and prevents blocked users from following
  - BlockedUsersList component to manage blocked users
  - "Block User" option in user profile menu
  - FollowButton shows "Blocked" state when target is blocked
- ✅ **Notification muting**: User-based muting using `mutedUserIds` and `mutedOrgIds`
  - `muteUser`/`unmuteUser` mutations on User resolver
  - `muteOrganization`/`unmuteOrganization` mutations for organizations
  - Mute/unmute icon button with tooltip on following-list-item
  - MutedFollowersList component shows all muted users with unmute option
  - Visual indicator shows muted state (notifications off icon)
- ✅ **Comprehensive tests**: Added unit tests for all new features
  - Tests for visibility rules (Public/Followers/Private enforcement)
  - Tests for removeFollower authorization
  - Tests for block/unblock cascade effects
  - Tests for follow prevention when blocked
  - All 526 API tests passing

### Latest Updates (14 January 2026 - Evening)

- ✅ **Re-follow after rejection fix**: Updated FollowDAO.upsert to properly handle re-following after rejection
  - When UserA follows UserB again after being rejected, the follow status now correctly updates from Rejected to
    Pending (or Accepted for Public accounts)
  - Prevents rejected follows from staying in Rejected state on subsequent follow attempts
  - Added test case: "updates existing follow when re-following after rejection"
- ✅ **Follow button logic fix for rejected status**: Updated FollowButton to treat Rejected status same as not
  following
  - Button now correctly calls `follow()` instead of `unfollow()` when status is Rejected
  - Prevents "Failed to unfollow" error when trying to re-follow after rejection
- ✅ **Follow stats filtering fix**: Updated readFollowers to only return Accepted follows
  - Followers list modal now only shows accepted followers (excludes pending/rejected)
  - Follower counts are accurate (only counting accepted follows via countFollowers which already filtered)
- ✅ **Dialog hydration error fix**: Removed nested Typography in DialogTitle components
  - Fixed invalid HTML structure (<h2><h6>) that caused hydration errors
  - DialogTitle already renders as h2, so removed redundant Typography wrapper

### Phase 1 Complete (14 January 2026 - Afternoon)

- ✅ FollowersList component with follow-back functionality
- ✅ FollowingList component with unfollow functionality
- ✅ FollowListSkeleton loading states for both lists
- ✅ Clickable follower/following counts in UserFollowStats
- ✅ Clickable follower count in FollowStatsCard (organizations)
- ✅ Dialog modals for viewing followers and following
- ✅ Follow privacy toggle in PersonalSettingsPage (Private Account)
- ✅ Backend field resolvers for targetUser and targetOrganization on Follow type
- ✅ GraphQL queries updated to include user/org details for followers/following
- ✅ Complete Phase 1 feature set implemented and tested

### Previously Completed (14 January 2026)

- ✅ PendingFollowRequestsList component for notifications page
- ✅ PendingFollowRequestItem component with conditional UI (Accept/Reject buttons vs status badges)
- ✅ Notification badge showing pending follow request count (desktop + mobile nav)
- ✅ Follow request history tracking (shows accepted/rejected with timestamps)
- ✅ Follow requests sorted by most recent action (updatedAt DESC)
- ✅ Follower field resolver on Follow type for user details
- ✅ ReadFollowRequests query for all statuses (Pending/Accepted/Rejected)

### Previously Completed (13 January 2026)

- ✅ FollowPolicy enum (Public/RequireApproval) for Users and Organizations
- ✅ Follow resolver respects target's followPolicy
- ✅ followersCount computed via FieldResolver (not stored in DB)
- ✅ FollowButton supports organizations with `targetType` prop
- ✅ FollowButton shows "Requested" state for pending follows
- ✅ FollowStatsCard component for organization pages
- ✅ UserFollowStats component for user profile pages
- ✅ Optimistic UI updates for follower counts
- ✅ Fixed useFollowing hook cache issues (skip + cache-and-network)
- ✅ DAO migration to find+save pattern for consistent hooks

## Integration Points

### Current Integrations

- **Authentication**: JWT tokens via NextAuth.js
- **Authorization**: TypeGraphQL @Authorized decorator
- **Validation**: Zod schemas for input validation
- **Error Handling**: Toast notifications via CustomAppContext
- **UI Loading**: NProgress for navigation, CircularProgress for buttons
- **Design System**: Elevation Zero (Material-UI v6)

### Future Integration Opportunities

- **Activity Feed**: Show posts from followed users
- **Notifications**: Real-time follow request alerts
- **Search**: Filter search by follows
- **Analytics**: Track follow growth metrics
- **Recommendations**: ML-based follow suggestions

## Security Considerations

### Current Security

- ✅ All mutations require authentication
- ✅ Authorization checks for accept/reject (target only)
- ✅ Input validation with Zod schemas
- ✅ MongoDB ObjectId validation
- ✅ Unique compound index prevents duplicate follows
- ✅ JWT token validation in authChecker

### Additional Security Needed

- [ ] Rate limiting on follow/unfollow actions
- [ ] CAPTCHA for high-frequency follow attempts
- [ ] IP-based throttling for abuse prevention
- [ ] Audit logging for follow actions
- [ ] Report/flag malicious follow behavior

## Performance Considerations

### Current Performance

- MongoDB indexes: `{followerUserId, targetType, targetId}` unique compound
- Additional indexes: `followerUserId`, `followId`
- `countDocuments` with `{targetType, targetId, approvalStatus}` filter
- Apollo Client caching with `cache-and-network` policy
- Optimistic UI updates eliminate perceived latency

### Performance Optimization Opportunities

- Add compound index for `{targetType, targetId, approvalStatus}` if counts slow down
- Implement cursor-based pagination for follower lists
- Add Redis caching for high-traffic organization counts
- Use DataLoader for batch follow lookups in activity feeds
- Implement virtual scrolling for large lists

## Developer Guidelines

### Adding Follow to New Entities

1. Add new value to `FollowTargetType` enum
2. Add `followPolicy` field to the entity type (if approval control needed)
3. Update GraphQL schema and types
4. Add validation for new target type
5. Update follow resolver to lookup new entity's followPolicy
6. Create frontend hooks for new type
7. Add UI components for new entity

### Modifying Approval Workflow

1. Update `FollowPolicy` enum if adding new policies
2. Modify `follow()` resolver logic for new policy types
3. Update FollowButton to handle new states
4. Add UI for managing pending requests
5. Update tests for new workflow

### Using Optimistic Updates

When adding follower counts to new components:

```typescript
// Use refs, not state, to track previous values
const wasFollowingRef = useRef<boolean | null>(null);
const initialLoadDoneRef = useRef(false);

useEffect(() => {
  if (loading) return;  // Wait for initial load

  const isCurrentlyFollowing = /* check follow status */;

  // Only adjust after initial load completes
  if (initialLoadDoneRef.current && wasFollowingRef.current !== isCurrentlyFollowing) {
    setCount(prev => isCurrentlyFollowing ? prev + 1 : prev - 1);
  }

  wasFollowingRef.current = isCurrentlyFollowing;
  initialLoadDoneRef.current = true;
}, [following, targetId, loading]);
```

### Adding Notification Preferences

1. Add new fields to `FollowNotificationPreferences` ObjectType
2. Update Zod schema for validation
3. Add UI controls in preferences component
4. Implement notification delivery logic
5. Update documentation

## Conclusion

The follow system is production-ready with configurable approval workflows and real-time follower counts. The
implementation follows best practices with:

- Clean separation of concerns (DAO, resolver, hooks, components)
- Comprehensive error handling and user feedback
- Proper authentication and authorization
- Extensible architecture for future enhancements
- Type-safe operations across the stack
- Optimistic UI updates for responsive UX
- Consistent DAO patterns (find+save for hook compatibility)

The system supports both public (auto-accept) and private (approval-required) follow policies, with UI components that
properly reflect pending states. Follower counts are dynamically computed ensuring accuracy without sync issues.

## Related Documentation

- [Data Model](../api/data-model.md)
- [Design System](../webapp/design-system.md)
- [Environment Variables](../environment-variables.md)
- [Project Brief](../project-brief.md)

## Change Log

### 15 January 2026 - Phase 2 Privacy & Control

- Uses `SocialVisibility` enum (Public/Followers/Private) for User and Organization visibility settings
- readFollowers/readFollowing resolvers now check visibility settings before returning data
- Added `removeFollower` mutation with proper authorization (target user only)
- Implemented complete block/unblock system with cascade follow deletion
- `blockUser` and `unblockUser` mutations in UserResolver
- Block checks in `follow` mutation prevent blocked users from following
- Created `useBlock` and `useBlockedUsers` hooks for frontend
- Added BlockedUsersList component for managing blocked users
- Created UserProfileActions component with block menu option
- Updated FollowButton to show "Blocked" state
- Enhanced following-list-item with mute/unmute toggle button
- Added comprehensive unit tests for all new features (526 tests passing)
- Used `CustomError` pattern consistently for error handling in follow resolver

### 13 January 2026 - FollowPolicy & Optimistic Updates

- Added `FollowPolicy` enum (Public/RequireApproval) to User and Organization types
- Follow resolver now respects target's followPolicy for approval status
- Migrated `followersCount` from stored field to computed FieldResolver
- Added `countFollowers()` DAO method using efficient `countDocuments`
- FollowButton now supports organizations via `targetType` prop
- FollowButton shows "Requested" state for pending follows
- Created FollowStatsCard component for organization pages
- Created UserFollowStats component for user profiles
- Implemented optimistic UI updates with useRef pattern
- Fixed useFollowing hook cache issues (added skip + cache-and-network)
- Migrated DAOs to find+save pattern for consistent Mongoose hook execution
- Updated all related unit and integration tests

### 12 January 2026 - Initial Implementation

- Implemented full follow system backend (types, resolvers, DAOs)
- Created frontend GraphQL operations and React hooks
- Built FollowButton component with error handling
- Integrated into user profile pages
- Completed code review and refinements
- Added approval status checking
- Implemented toast notifications for errors
- Documented in this assessment
