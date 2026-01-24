# Next.js streaming + suspense for faster server pages

## Motivation

Server-rendered pages block rendering until every awaited data fetch resolves. If the upstream APIs are slow, the user
waits on a blank screen. Next.js offers two ways to improve the perceived load:

1. **Streaming HTML**: return parts of the page as soon as they're ready by splitting UI into segments that either load
   in parallel (`<Suspense>` + `use` in server components) or are rendered by client components that fetch after
   hydration.
2. **Client + server split**: keep metadata, headers, and other fast logic in the server component while delegating
   heavier data fetching to a client child that can show placeholders (skeletons) or partial UI while waiting.

## How streaming works in the App Router

- Next.js collects `await` expressions as it renders the tree.
- When streaming is enabled (default for any async server component), it can start sending HTML for parts of the tree
  that are ready. Suspense boundaries (`<Suspense>` or React `use` inside server components) create natural cutoff
  points.
- A slow data dependency (e.g., `await getClient().query(...)`) can sit behind a suspense boundary or live inside a
  client component, so the rest of the page is streamed earlier.
- Client components can fetch with `useQuery` or `useEffect` and show skeletons immediately. Their data loads in
  parallel with the rest of the page and hydrates when ready.

## Using suspense + placeholders

1. Wrap slow sections in `React.Suspense` (imported server-side) and provide a fallback placeholder.
2. Use `next/streaming` primitives (`suspense` + `useCache` if needed) when you need to orchestrate multiple queries.
3. Avoid awaiting large data sets in the top-level page; instead, move that logic into a child component that either:
   - Exposes a simple `loading` prop from `useQuery`, or
   - Renders `null` while data arrives but still renders the server shell immediately.

## Client/Server hybrid pattern

1. Keep `metadata`, `revalidate`, and other fast logic in the server `page.tsx`.
2. Render a lightweight client component (e.g., `HomeClient`) from the server page.
3. Inside the client component, fetch all expensive data with hooks (`useQuery`) and show skeletons while loading.
4. The server component only needs to `await auth()` or similar quick binaries; the client handles the rest.

## Pages that currently `await getClient().query(...)`

These pages are good candidates for the hybrid pattern. Each page can become a simple shell that hydrates a client
component:

- ✅ `apps/webapp/app/events/page.tsx` (covered by `EventsPageClient`)
- ✅ `apps/webapp/app/venues/page.tsx` (`VenuesClient`)
- ✅ `apps/webapp/app/users/page.tsx` (`UsersPageClient`)
- ✅ `apps/webapp/app/users/[username]/page.tsx` (`UserProfilePageClient`)
- ✅ `apps/webapp/app/events/[slug]/page.tsx`
- ✅ `apps/webapp/app/organizations/[slug]/page.tsx`
- ✅ `apps/webapp/app/organizations/page.tsx` (covered by `OrganizationsClient`)
- `apps/webapp/app/(protected)/account/events/[slug]/edit/page.tsx`
- `apps/webapp/app/(protected)/account/page.tsx`
- `apps/webapp/app/(protected)/account/events/page.tsx`
- `apps/webapp/app/(protected)/account/profile/page.tsx` (multiple queries)
- `apps/webapp/app/(protected)/account/events/[slug]/page.tsx`
- `apps/webapp/app/(protected)/account/events/create/page.tsx`

## Suggested steps for each page

1. Create a new client component (e.g., `OrganizationsClient`) that uses Apollo `useQuery`/`useMutation` and renders
   skeletons/placeholders while loading.
2. Keep the server page as an async wrapper that fetches minimal info (auth, locale, etc.) and renders the client
   component.
3. If you still need pre-rendered data (for SEO), keep a small `await getClient().query` call but wrap the rest in
   suspense or move it to the client component.
4. Introduce skeletons or placeholders (cards, loaders) in the client component so the UI doesn’t jump when data
   eventually arrives.

## Additional notes

- Streaming is opt-in per suspense boundary; use it selectively for expensive data.
- Client components can still share layout/theme/surfaces defined at the server level.
- Keep documenting the migration per page so the team can review incremental changes.
