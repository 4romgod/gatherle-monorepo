# Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented in the Gatherle webapp to achieve faster page loads and
better user experience.

## Implemented Optimizations

### 1. Parallelized GraphQL Queries ✅

**Problem**: Sequential `await` statements were blocking page renders, causing 2-4 second load times.

**Solution**: Used `Promise.all()` to execute independent queries in parallel.

#### Before (Sequential - SLOW)

```tsx
// Each query waits for the previous one to complete
const { data: events } = await getClient().query({ query: GetAllEventsDocument });
const { data: categories } = await getClient().query({ query: GetAllEventCategoriesDocument });
const orgs = await getClient().query({ query: GET_ORGANIZATIONS });
const venues = await getClient().query({ query: GET_VENUES });
// Total time: T1 + T2 + T3 + T4 (additive)
```

#### After (Parallel - FAST)

```tsx
// All queries execute simultaneously
const [{ data: events }, { data: categories }, orgs, venues] = await Promise.all([
  getClient().query({ query: GetAllEventsDocument }),
  getClient().query({ query: GetAllEventCategoriesDocument }),
  getClient().query({ query: GET_ORGANIZATIONS }),
  getClient().query({ query: GET_VENUES }),
]);
// Total time: max(T1, T2, T3, T4) (concurrent)
```

**Impact**: 50-75% reduction in Time To First Byte (TTFB)

**Pages optimized**:

- [Homepage](../../apps/webapp/app/page.tsx) - 4 parallel queries
- [Events page](../../apps/webapp/app/events/page.tsx) - 2 parallel queries
- Organizations page - single query (no change needed)
- Venues page - single query (no change needed)

---

### 2. Enhanced Apollo Client Caching ✅

**Problem**: Default Apollo cache configuration didn't have optimized merge policies.

**Solution**: Added explicit type policies to Apollo Client cache configuration.

#### Implementation

```typescript
// apps/webapp/data/graphql/apollo-client.ts
new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        readEvents: { merge: false }, // Replace instead of merge
        readEventCategories: { merge: false },
        readOrganizations: { merge: false },
        readVenues: { merge: false },
        readFeed: { merge: false },
      },
    },
  },
});
```

**Benefits**:

- Prevents unnecessary array merging operations
- Ensures fresh data on each query
- Reduces memory overhead from accumulated cache entries

---

### 3. Incremental Static Regeneration (ISR) ✅

**Problem**: Every page request hit the API, even for semi-static content.

**Solution**: Added `revalidate` export to enable Next.js ISR with CDN-level caching.

#### Implementation

```typescript
// Frequently updated content (events, homepage)
export const revalidate = 60; // Revalidate every 60 seconds

// Less frequently updated content (organizations, venues)
export const revalidate = 120; // Revalidate every 2 minutes
```

**Benefits**:

- **First load after revalidation**: Fresh data from API
- **Subsequent loads within window**: Instant response from CDN cache
- **Reduces API load**: Fewer database queries
- **Better UX**: Near-instant page loads for cached content

**Pages configured**:

- Homepage: 60s revalidation
- Events page: 60s revalidation
- Organizations page: 120s revalidation
- Venues page: 120s revalidation

---

### 4. Performance Monitoring Utilities ✅

**Created**: [`apps/webapp/lib/utils/performance.ts`](../../apps/webapp/lib/utils/performance.ts)

Utilities for measuring query and operation times:

```typescript
import { measureAsync, measureParallel } from '@/lib/utils/performance';

// Measure single async operation
const result = await measureAsync('Load events', () => getClient().query({ query: GetAllEventsDocument }));

// Measure parallel operations with individual timing
const [events, categories] = await measureParallel([
  { name: 'Events', fn: () => getClient().query({ query: GetAllEventsDocument }) },
  { name: 'Categories', fn: () => getClient().query({ query: GetAllEventCategoriesDocument }) },
]);
```

**Output example**:

```
[Performance] Starting 4 parallel operations...
  ✓ Events: 245.32ms
  ✓ Categories: 189.47ms
  ✓ Organizations: 312.18ms
  ✓ Venues: 278.91ms
[Performance] All operations completed in 315.24ms total
```

---

## Performance Metrics

### Expected Improvements

| Metric             | Before      | After      | Improvement          |
| ------------------ | ----------- | ---------- | -------------------- |
| Homepage TTFB      | 2000-4000ms | 500-1000ms | **60-75%**           |
| Events Page TTFB   | 800-1500ms  | 250-500ms  | **60-70%**           |
| Cache Hit Response | N/A         | <50ms      | **New capability**   |
| API Query Load     | 100%        | 30-40%     | **60-70% reduction** |

### Measurement

Use browser DevTools or Lighthouse to measure:

1. **TTFB (Time To First Byte)**: Network tab → First document request
2. **LCP (Largest Contentful Paint)**: Performance tab → Core Web Vitals
3. **FCP (First Contentful Paint)**: Shows when content starts rendering
4. **Server Response Time**: Should be <600ms for good UX

---

## Best Practices for Future Development

### When Adding New Pages

1. **Always parallelize independent queries**:

   ```tsx
   // ❌ DON'T
   const data1 = await query1();
   const data2 = await query2();

   // ✅ DO
   const [data1, data2] = await Promise.all([query1(), query2()]);
   ```

2. **Add ISR revalidation based on data freshness**:

   ```tsx
   // Real-time data (user feed, notifications): No revalidation
   // Dynamic data (events, posts): 60s revalidation
   // Semi-static (orgs, venues, categories): 120-300s revalidation
   // Static content (about, terms): 3600s revalidation
   ```

3. **Use performance monitoring during development**:
   ```tsx
   const data = await measureAsync('Operation name', () => fetchData());
   ```

### When Adding New Queries

1. **Check if queries can be combined** into a single GraphQL query
2. **Consider client-side fetching** for non-SEO-critical data
3. **Add proper loading states** if moving queries to client-side
4. **Document expected response times** in code comments

### Query Optimization Checklist

- [ ] Are independent queries parallelized with `Promise.all()`?
- [ ] Is ISR revalidation configured appropriately?
- [ ] Are queries only fetching needed fields (avoid over-fetching)?
- [ ] Is data properly cached in Apollo Client?
- [ ] Are loading states handled gracefully for client-side queries?
- [ ] Are error states handled with user-friendly messages?

---

## Debugging Performance Issues

### Check Server Logs

Server-side rendering logs can be viewed in the terminal running `npm run dev:web`

### Use Performance Monitoring

```tsx
import { measureParallel } from '@/lib/utils/performance';

const queries = await measureParallel([
  { name: 'Query 1', fn: () => query1() },
  { name: 'Query 2', fn: () => query2() },
]);
```

### Verify ISR is Working

1. Load page → Check response headers for `x-nextjs-cache`
2. First load: `MISS` or `STALE`
3. Subsequent loads within revalidation window: `HIT`

### Profile with Next.js Speed Insights

```bash
# Install Vercel Speed Insights
npm install @vercel/speed-insights
```

Add to root layout:

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Additional Optimization Opportunities

### Future Enhancements

1. **GraphQL Query Batching**
   - Combine multiple queries into a single network request
   - Requires Apollo Link Batch HTTP setup

2. **React Server Components Streaming**
   - Use `<Suspense>` boundaries to stream content as it loads
   - Show skeleton loaders for slower queries

3. **Database Query Optimization**
   - Add indexes for frequently queried fields
   - Use projection to limit returned fields
   - Consider database query caching (Redis)

4. **Image Optimization**
   - Use Next.js `<Image>` component everywhere
   - Add blur placeholders for hero images
   - Consider WebP format with fallbacks

5. **Code Splitting**
   - Dynamic imports for heavy components
   - Route-based code splitting is already enabled

---

## References

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [Apollo Client Caching](https://www.apollographql.com/docs/react/caching/cache-configuration/)
- [Web.dev Performance](https://web.dev/performance/)
