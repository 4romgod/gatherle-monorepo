# Navigation Restructure Spec

## Goal

Remove the competing drawer/hamburger navigation from native mobile and mobile-sized web, make the bottom nav the only
primary app navigation on those surfaces, and repurpose the toolbar/header as contextual page chrome.

This spec follows the parity rule from `.github/agents/frontend.agent.md`: the primary alignment target is the native
mobile app and the mobile-sized webapp, not the desktop webapp.

## Core Rules

1. Bottom nav is the only primary navigation on native mobile and mobile-sized web.
2. No hamburger in main-tab toolbars or default stack headers.
3. Toolbars are for page actions, not for global destination menus.
4. Discovery destinations that used to live in drawers move into explicit discovery surfaces.
5. Account-only destinations move into the Account hub and account sheet.
6. On mobile-sized web, the sixth tab should point to `/account`, not to the current user's public profile route.
7. Public profile routes stay shareable, but they are no longer the primary "me" entry point.

## Toolbar Families

| Family                | Typical layout                                                      | Typical actions                     | Typical routes                                         |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Marketing             | Brand left, auth CTA right                                          | Log in, Join                        | `/`                                                    |
| Primary Search        | Section title or brand left, contextual search in toolbar           | Search, Filters, Find people        | Home, Events, Messages                                 |
| Secondary Search/List | Back left, title center, list actions right                         | Search, Add, Invite, Filter         | Categories, Organizations, Venues, Connections         |
| Inbox                 | Title left, quick action right                                      | Mark all read, Feed filter          | Notifications                                          |
| Account Hub           | Avatar/title left, primary account action(s) right                  | Host event, Account sheet           | Account                                                |
| Detail                | Back left, title or identity center, contextual action right        | Share, Save, More, Edit, Directions | Event detail, org detail, venue detail, message thread |
| Form/Modal            | Close or back left, task title center, commit action optional right | Create, Save, Publish               | Create/edit/auth flows                                 |
| Immersive             | No standard toolbar                                                 | None                                | Moments                                                |

## Drawer Destination Migration

| Current drawer item   | New home                                             | Notes                                                           |
| --------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Categories            | Home -> Browse -> Categories                         | Keep Events as the action destination after category selection. |
| Organizations         | Home -> Browse -> Organizations                      | Creation belongs under Account, not discovery.                  |
| Venues                | Home -> Browse -> Venues                             | Venue creation stays permissioned.                              |
| Community             | Home -> Browse -> People and Messages -> Find people | Keep the route during migration; reassess later.                |
| My Organizations      | Account sheet and Account quick action               | Account-only destination.                                       |
| Settings              | Account sheet and Account quick action               | Settings remains the source of truth.                           |
| Admin Portal          | Account sheet, conditional                           | Hidden unless the user can access it.                           |
| Theme toggle          | Account sheet quick toggle and Settings -> Theme     | Quick toggle is convenience, settings page remains canonical.   |
| Logout                | Account sheet or Settings -> Session                 | Keep it out of discovery/navigation surfaces.                   |
| Host an event         | Account toolbar primary action and Account CTA       | Do not bury it in a menu.                                       |
| Follow Gatherle links | Settings/footer/account extras only                  | Not a navigation concern.                                       |

## Surface-Level IA Changes

### Home becomes the replacement for discovery drawer links

Add an explicit browse surface near the top of Home on both native mobile and mobile-sized web:

- Categories
- Organizations
- Venues
- People

This is the critical replacement for removing the drawer. If these destinations are not visible from Home, the drawer
removal will feel like feature removal.

People discovery remains authenticated-only in v1.

- Native mobile should keep the current signed-in requirement for People discovery.
- Mobile-sized web should keep `/users` authenticated-only.
- Guests can still see public user profiles via direct links, but they do not get an open member directory.

### Account becomes the replacement for account drawer links

Account should become a true hub on both surfaces and own:

- Profile shortcut
- Settings shortcut
- My Organizations
- Host an event
- Admin Portal, if allowed
- Theme
- Logout

### Public profile and Account should be separate concepts on web

The current mobile web bottom nav behavior conflates "my public profile" and "my account/settings". The end state should
be:

- bottom nav sixth item -> `/account`
- public profile remains `/users/[username]`
- Account links to the public profile instead of being replaced by it
- the mobile web sixth tab should not move to `/account` until the Account hub and account sheet are in place

## Mobile Route Spec

### Main tabs

| Screen                | Toolbar family | Primary actions                          | Notes                                                                                                                 |
| --------------------- | -------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `HomeScreen`          | Primary Search | Search expand                            | Remove the in-content search bar. Add a Browse section for Categories, Organizations, Venues, and People.             |
| `EventsScreen`        | Primary Search | Search expand, Filters with active count | Remove the in-content search bar. Keep active filter chips in content.                                                |
| `MomentsScreen`       | Immersive      | None                                     | Keep this surface visually clean and full-height.                                                                     |
| `MessagesScreen`      | Primary Search | Search expand, Find people or New chat   | Remove the in-content search field. Member discovery starts here.                                                     |
| `NotificationsScreen` | Inbox          | Mark all read, feed filter               | Feed filter should support at least `All`, `Unread`, and `Requests`.                                                  |
| `AccountScreen`       | Account Hub    | Host event, Account sheet                | Add visible quick actions for Profile, My Organizations, and Settings. This becomes the account-only destination hub. |

### Discovery, social, and detail screens

| Screen                      | Toolbar family        | Primary actions                                    | Notes                                                                                                            |
| --------------------------- | --------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `CategoriesScreen`          | Secondary Search/List | Search expand                                      | Entry point: Home -> Browse -> Categories. Move current search field into the toolbar.                           |
| `CommunityScreen`           | Secondary Search/List | Search expand                                      | Entry points: Home -> Browse -> People and Messages -> Find people. Keep route during migration; reassess later. |
| `OrganizationsScreen`       | Secondary Search/List | Search expand                                      | Creation entry belongs under Account/My Organizations, not on the discovery route.                               |
| `OrganizationDetailsScreen` | Detail                | Share, manager overflow                            | Manager overflow should hold `Members` and `Edit` when permitted.                                                |
| `OrganizationMembersScreen` | Secondary Search/List | Search, Invite/manage if allowed                   | Move current search field into the toolbar.                                                                      |
| `VenuesScreen`              | Secondary Search/List | Search expand, Add venue if permitted              | Move current search field into the toolbar.                                                                      |
| `VenueDetailsScreen`        | Detail                | Directions or Share, edit in overflow if permitted | Use the former menu slot for the most useful venue action.                                                       |
| `EventDetailsScreen`        | Detail                | Save, Share, More                                  | Owner/host actions should move into contextual overflow instead of depending on a generic menu button.           |
| `UserProfileScreen`         | Detail                | Share                                              | Follow/message stay in content. If this is the current user, Account remains the primary "me" route.             |
| `UserHostedEventsScreen`    | Detail                | None in v1                                         | Keep it simple unless search is clearly needed.                                                                  |
| `UserConnectionsScreen`     | Secondary Search/List | Search expand                                      | Useful for large follower/following lists.                                                                       |
| `MessageThreadScreen`       | Detail                | Profile/info action                                | The identity chrome should live in the toolbar. The in-content thread header can be simplified or removed.       |
| `AdminScreen`               | Detail                | Refresh                                            | Read-only in v1 is fine; the important part is no hamburger fallback.                                            |

### Account, management, and utility screens

| Screen                     | Toolbar family                                            | Primary actions                     | Notes                                                                                                   |
| -------------------------- | --------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `MyEventsScreen`           | Deprecated -> absorb into `AccountScreen`                 | If retained temporarily: Host event | End state should fold `Going`, `Past`, `Hosting`, and `Saved` into Account.                             |
| `MyOrganizationsScreen`    | Detail                                                    | Add organization                    | Reachable from Account sheet and Account quick action.                                                  |
| `SettingsScreen`           | Detail                                                    | None in v1                          | This remains the source of truth for profile, account, privacy, alerts, theme, and session preferences. |
| `EditProfileScreen`        | Deprecated -> deep link into `SettingsScreen` profile tab | If retained temporarily: Save       | Avoid parallel profile-editing flows.                                                                   |
| `CreateEventScreen`        | Form/Modal                                                | Create or Publish if feasible       | If the form UX is not ready for toolbar commits, keep submit in content and keep the toolbar minimal.   |
| `EditEventScreen`          | Form/Modal                                                | Save                                | No global menu affordance.                                                                              |
| `CreateOrganizationScreen` | Form/Modal                                                | Create                              | No hamburger.                                                                                           |
| `EditOrganizationScreen`   | Form/Modal                                                | Save                                | No hamburger.                                                                                           |
| `CreateVenueScreen`        | Form/Modal                                                | Create                              | No hamburger.                                                                                           |
| `EditVenueScreen`          | Form/Modal                                                | Save                                | No hamburger.                                                                                           |

### Auth flows

| Screen                 | Toolbar family | Primary actions    | Notes              |
| ---------------------- | -------------- | ------------------ | ------------------ |
| `LoginProvidersScreen` | Form/Modal     | Back or Close only | Keep auth focused. |
| `LoginScreen`          | Form/Modal     | Back or Close only | Keep auth focused. |
| `RegisterScreen`       | Form/Modal     | Back or Close only | Keep auth focused. |
| `ForgotPasswordScreen` | Form/Modal     | Back or Close only | Keep auth focused. |
| `ResetPasswordScreen`  | Form/Modal     | Back or Close only | Keep auth focused. |
| `VerifyEmailScreen`    | Form/Modal     | Back or Close only | Keep auth focused. |
| `VerifyPendingScreen`  | Form/Modal     | Back or Close only | Keep auth focused. |

## Web Route Spec

### Main shell routes

These are the routes that should behave like the primary app shell on mobile-sized web.

| Route                    | Toolbar family | Primary actions                          | Notes                                                                                                                            |
| ------------------------ | -------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/`                      | Marketing      | Log in, Join                             | Remove the mobile drawer. Add visible browse links/cards so guests still discover Categories, Organizations, Venues, and People. |
| `/home`                  | Primary Search | Search expand                            | Match native Home behavior.                                                                                                      |
| `/events`                | Primary Search | Search expand, Filters with active count | On mobile-sized web, move the search affordance into the toolbar. Desktop can keep richer filter layout below.                   |
| `/moments`               | Immersive      | None                                     | Keep chrome minimal.                                                                                                             |
| `/account/messages`      | Primary Search | Search expand, Find people or New chat   | Match native Messages behavior.                                                                                                  |
| `/account/notifications` | Inbox          | Mark all read, feed filter               | Match native Notifications behavior.                                                                                             |
| `/account`               | Account Hub    | Host event, Account sheet/profile menu   | This should become the sixth bottom-nav destination on mobile web.                                                               |

### Discovery and public routes

| Route                         | Toolbar family        | Primary actions                        | Notes                                                                       |
| ----------------------------- | --------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `/categories`                 | Secondary Search/List | Search expand                          | Move current search affordance into the toolbar on mobile-sized web.        |
| `/categories/[slug]`          | Detail                | View matching events, Share            | Category detail should remain discovery-first.                              |
| `/organizations`              | Secondary Search/List | Search expand                          | Organization creation should be reached from Account, not public discovery. |
| `/organizations/[slug]`       | Detail                | Share, manager overflow                | Match the native organization-detail pattern.                               |
| `/venues`                     | Secondary Search/List | Search expand, Add venue if permitted  | Match the native venue list pattern.                                        |
| `/venues/[slug]`              | Detail                | Directions or Share, Edit if permitted | Match the native venue-detail pattern.                                      |
| `/users`                      | Secondary Search/List | Search expand                          | This is the web equivalent of People/Community discovery.                   |
| `/users/[username]`           | Detail                | Share                                  | Own profile stays shareable, but it is not the primary Account destination. |
| `/users/[username]/events`    | Detail                | None in v1                             | Keep it light unless search is needed.                                      |
| `/users/[username]/followers` | Secondary Search/List | Search expand                          | Match native follower list behavior.                                        |
| `/users/[username]/following` | Secondary Search/List | Search expand                          | Match native following list behavior.                                       |
| `/events/[slug]`              | Detail                | Save, Share, More                      | Match native event-detail pattern.                                          |
| `/events/[slug]/attendees`    | Secondary Search/List | RSVP status filter                     | Back plus attendee filtering is the right use of this toolbar.              |

### Account, management, and protected routes

| Route                                    | Toolbar family | Primary actions     | Notes                                                                                        |
| ---------------------------------------- | -------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `/account/events`                        | Detail         | Create event        | Keep as a dedicated management surface on web, but do not expose it through a mobile drawer. |
| `/account/events/create`                 | Form/Modal     | Create or Publish   | Same form rule as native.                                                                    |
| `/account/events/[slug]/edit`            | Form/Modal     | Save                | Same form rule as native.                                                                    |
| `/account/organizations`                 | Detail         | Create organization | Reachable from Account hub and account sheet.                                                |
| `/account/organizations/create`          | Form/Modal     | Create              | Same form rule as native.                                                                    |
| `/account/organizations/[slug]/settings` | Form/Modal     | Save                | This is an account-management form, not a discovery surface.                                 |
| `/venues/add`                            | Form/Modal     | Create              | Protected creation route.                                                                    |
| `/venues/[slug]/edit`                    | Form/Modal     | Save                | Protected edit route.                                                                        |
| `/admin`                                 | Detail         | Refresh or none     | Keep it contextual and out of global discovery.                                              |

### Auth and utility routes

| Route                        | Toolbar family | Primary actions    | Notes                                 |
| ---------------------------- | -------------- | ------------------ | ------------------------------------- |
| `/auth/login`                | Form/Modal     | Back or Close only | Keep auth focused.                    |
| `/auth/register`             | Form/Modal     | Back or Close only | Keep auth focused.                    |
| `/auth/forgot-password`      | Form/Modal     | Back or Close only | Keep auth focused.                    |
| `/auth/reset-password`       | Form/Modal     | Back or Close only | Keep auth focused.                    |
| `/auth/verify-email`         | Form/Modal     | Back or Close only | Keep auth focused.                    |
| `/auth/verify-email/pending` | Form/Modal     | Back or Close only | Keep auth focused.                    |
| `/403`                       | Detail         | Return home        | Utility route; no global menu chrome. |

## Structural Changes Required

### Mobile

- Replace the hardcoded menu button in `apps/mobile/src/app/navigation/MainTabToolbar.tsx`.
- Remove the menu fallback in `apps/mobile/src/app/navigation/StackHeader.tsx`.
- Replace `HeaderMenuButton` usage with slot-based contextual actions.
- Decommission `apps/mobile/src/app/navigation/AppDrawer.tsx` after replacement surfaces ship.
- Promote Account into the canonical home for account-only navigation.

### Web

- Remove `apps/webapp/components/navigation/main/NavigationTemporaryDrawer.tsx` from the mobile shell.
- Stop relying on `NavLinksList` drawer mode for mobile navigation.
- Allow toolbar actions on main-shell routes, not only subpages, in `apps/webapp/components/navigation/main/index.tsx`.
- Point the mobile web bottom-nav account item at `/account`, not at the current user's public profile route.
- Keep desktop top-nav links on `md+`; the drawer removal applies to mobile-sized web.

## Recommended Rollout Order

1. Build the navigation primitives.
   - Mobile: header slots for main tabs and stack screens.
   - Web: toolbar action support on main-shell routes.
2. Build the replacement destinations before deleting the drawer.
   - Home Browse section
   - Account sheet
   - Account hub adjustments so `/account` is the correct destination shape
3. Repoint the mobile web sixth tab to `/account`.
4. Remove hamburger fallbacks after the replacement destinations are live.
   - Mobile: remove the hardcoded menu button from the main-tab toolbar
   - Mobile: remove generic menu fallback behavior from stack headers
   - Web: remove the mobile temporary drawer
5. Migrate the six primary tabs first.
   - Home
   - Events
   - Messages
   - Notifications
   - Account
   - Moments stays mostly as-is
6. Migrate search/list screens and secondary list routes.
   - Categories
   - Organizations
   - Venues
   - Community/People
   - Connections
7. Migrate detail and form screens.
8. Remove redundant routes and cleanup-only surfaces.
   - Mobile `AppDrawer`
   - Web `TemporaryDrawer`
   - Mobile `MyEventsScreen` once Account fully subsumes it
   - Mobile `EditProfileScreen` once Settings is the only profile editing path

## Locked Decisions

1. `Community` collapses into `People` entry points from Home and Messages instead of surviving as a permanent
   standalone navigation concept.
2. Home keeps the name `Home` in v1 even after it absorbs the browse replacement surface.
3. Form submit actions stay in the page body in v1. Toolbars on form screens remain minimal unless a flow is already
   clearly ready for toolbar-owned commit actions.
4. On web, the authenticated “return to app” destination should favor `/home`, not `/account`.
5. People discovery remains authenticated-only in v1. The member directory is not exposed as a public browse surface.
