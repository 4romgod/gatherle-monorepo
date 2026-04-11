# MongoDB Knowledge And Optimization Guide For Gatherle

This document is a MongoDB knowledge and optimization reference grounded in how this repository uses MongoDB today.

The project does not use MongoDB in a generic "save some JSON" way. It uses a fairly typical production stack:

- MongoDB as the database
- Mongoose as the ODM
- Typegoose to define Mongoose schemas from TypeScript classes
- TypeGraphQL on top of that for the API schema
- DAO classes in `apps/api/lib/mongodb/dao` as the database access layer

The goal is to cover MongoDB concepts thoroughly while also mapping them to the concrete data model, query patterns, and
optimization opportunities in this codebase.

## 1. Executive Summary

MongoDB is a document database. Instead of rows in tables, it stores BSON documents in collections. BSON is a binary
representation of JSON with extra types like `ObjectId`, `Date`, and binary data.

MongoDB is strong when:

- your domain objects are naturally hierarchical or flexible
- you want fast iteration on schema evolution
- you need high write throughput
- you want horizontal scale through sharding
- you are comfortable thinking in document and access-pattern terms, not purely in normalized relational terms

MongoDB is not "schema-less" in the sense of "no structure." It is better to think of it as "schema-flexible." In
serious systems, the schema still exists. It is just enforced at the application layer, ODM layer, and often by
validation rules, not only by rigid database tables.

In this repository, MongoDB backs:

- users
- events
- organizations
- event participation
- follows
- activity feed items
- notifications
- websocket connections
- password reset and email verification tokens
- a denormalized user feed collection for recommendations

That already gives you several important MongoDB topics:

- referencing vs embedding
- unique constraints
- compound indexes
- TTL indexes
- aggregation pipelines with `$lookup`
- bulk upserts
- denormalized read models
- N+1 avoidance in GraphQL

## 2. How This System Uses MongoDB

The MongoDB architecture in this repo is layered:

1. Shared domain classes live in `packages/commons/lib/types`.
2. Those classes use Typegoose decorators like `@prop`, `@index`, and `@modelOptions`.
3. API-side models are instantiated in `apps/api/lib/mongodb/models` using `getModelForClass(...)`.
4. DAO classes in `apps/api/lib/mongodb/dao` perform all database reads and writes.
5. GraphQL resolvers call DAOs instead of touching models directly.

That is important. It keeps database access maintainable in a few clear ways:

- model definitions are centralized
- query logic is centralized in DAOs
- resolvers stay focused on API and authorization logic

There is also query instrumentation in
[mongoDbClient.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/clients/mongoDbClient.ts), where Mongoose
`Query.exec` is wrapped so query timing is logged. That is a real production-minded touch: observability matters as much
as schema design.

## 3. What MongoDB Is

At its core, MongoDB stores data as documents.

Example mental model:

- relational DB: table -> row -> column
- MongoDB: collection -> document -> field

A document might look like:

```json
{
  "_id": "67e4...",
  "eventId": "67e4...",
  "title": "Saturday Run Club",
  "location": {
    "address": {
      "city": "Cape Town",
      "country": "South Africa"
    }
  },
  "organizers": [{ "user": "user-1", "role": "Host" }]
}
```

### Core Concepts

- `database`: container for collections
- `collection`: group of related documents
- `document`: a BSON object
- `_id`: the primary key for each document
- `index`: extra structure that accelerates reads at the cost of extra write/storage overhead
- `replica set`: multiple copies of data for high availability
- `sharding`: partitioning data across multiple machines

### Why BSON Matters

BSON is not just JSON. It supports types that matter operationally:

- `ObjectId`
- `Date`
- numbers with exact stored types
- binary payloads

That matters because queries, sorting, and indexing depend on actual stored types. A date stored as a string is not
equivalent to a date stored as a `Date`.

## 4. What Mongoose Is

Mongoose is an ODM: Object Document Mapper.

If MongoDB is the database and the MongoDB Node driver is the low-level client, Mongoose sits above that and gives you:

- schemas
- validation
- middleware/hooks
- model APIs like `find`, `findOne`, `create`, `updateOne`
- casting
- defaults
- virtuals
- middleware like `pre('validate')`, `pre('save')`, `pre('updateOne')`

In this repository, Mongoose is the runtime engine behind the models. For example:

- [event.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/models/event.ts)
- [user.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/models/user.ts)
- [eventParticipant.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/models/eventParticipant.ts)

### Important Distinction

Mongoose is not MongoDB itself.

- MongoDB = database
- MongoDB driver = low-level client
- Mongoose = higher-level ODM

If asked why teams use Mongoose, the answer is usually:

- safer schema enforcement
- consistent model lifecycle hooks
- easier validation/defaults
- more ergonomic query API

If asked what the tradeoff is:

- more abstraction
- sometimes more magic
- sometimes harder to reason about exact raw driver behavior
- performance tuning may still require understanding native MongoDB semantics

## 5. What Typegoose Is

This repo does not hand-write raw Mongoose schemas everywhere. It uses Typegoose.

Typegoose lets you define models using TypeScript classes and decorators, then generates Mongoose schemas from those
classes.

Example patterns in this repo:

- `@prop(...)` defines fields
- `@index(...)` defines indexes
- `@modelOptions(...)` defines schema options like timestamps

See:

- [user.ts](/home/bigfish/code/projects/gatherle-monorepo/packages/commons/lib/types/user.ts)
- [event.ts](/home/bigfish/code/projects/gatherle-monorepo/packages/commons/lib/types/event.ts)
- [userFeed.ts](/home/bigfish/code/projects/gatherle-monorepo/packages/commons/lib/types/userFeed.ts)

This gives the project one shared domain definition layer that is reused by the API and aligned with GraphQL types.

## 6. How The Data Model Works In This Repo

The most important MongoDB design question is not "What collections do I have?"

It is:

"What are my access patterns, and how should documents be shaped to support them?"

This system mostly uses references, not large embedded documents.

### Main Collections

- `users`
- `events`
- `eventparticipants`
- `organizations`
- `organizationmemberships`
- `follows`
- `activities`
- `notifications`
- `userfeeds`
- `websocketconnections`
- token collections for password reset and email verification

### Why References Are Used Heavily

Examples:

- an event stores organizer user IDs, not the full user documents
- event participants live in a separate `eventparticipants` collection
- follows are separate relationship documents
- organization memberships are separate relationship documents

That is a deliberate design choice.

Why it makes sense:

- users change independently of events
- many-to-many relationships are easier as separate collections
- separate collections avoid unbounded array growth
- separate collections make unique edges enforceable via compound indexes

### Embedding vs Referencing

This is one of the core MongoDB modeling topics.

Embed when:

- the child data is tightly bound to the parent
- it is always read with the parent
- the child cardinality is bounded
- atomic single-document updates are valuable

Reference when:

- the child is shared across multiple parents
- the child changes independently
- the array could grow without bound
- many-to-many relationships exist
- you need separate query patterns on the child collection

In Gatherle:

- `Event.organizers` is embedded enough to keep the organizer role next to the event, but the actual user data is still
  referenced
- `EventParticipant` is separate because participants can grow and need independent querying
- `OrganizationMembership` is separate because it is a relationship edge
- `UserFeedItem` is its own collection because it is a denormalized read model, per user, with TTL

## 7. `_id` Versus Application IDs In This Repo

A very noticeable pattern in this codebase is that many models have both MongoDB `_id` and an application field like:

- `userId`
- `eventId`
- `participantId`
- `followId`
- `membershipId`

And in model hooks, those IDs are often set from `_id.toString()`.

Examples:

- [event.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/models/event.ts)
- [user.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/models/user.ts)
- [follow.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/models/follow.ts)

### Why Do This?

Possible benefits:

- GraphQL and application code consistently use string IDs
- clients do not need to care about `ObjectId` objects
- explicit domain IDs make APIs clearer

### Tradeoff

It duplicates identity information:

- `_id` already uniquely identifies the document
- `userId` or `eventId` becomes a mirrored field

The practical takeaway is:

"This improves application ergonomics and GraphQL consistency, but it adds some redundancy. The code keeps them aligned
by assigning the string ID from `_id` in model hooks."

## 8. Indexing: The Single Most Important Performance Topic

If you know one thing deeply for MongoDB performance, make it indexing.

MongoDB performance is usually dominated by:

- whether the query can use a good index
- how selective that index is
- whether sorting also aligns with the index
- whether the query becomes a scatter-gather across shards

### What Is An Index?

An index is an extra data structure that lets MongoDB find documents faster without scanning the whole collection.

Tradeoff:

- reads become faster
- writes become slower
- storage usage increases

### Common Index Types

- single-field index
- compound index
- unique index
- TTL index
- text index
- geospatial index
- hashed index

### Indexes Already Present In This Repo

This project already uses several important index types.

#### Unique and primary-like fields

Examples:

- `User.userId`, `User.email`, `User.username`
- `Event.eventId`, `Event.slug`
- `EventParticipant.participantId`

These support direct lookups and uniqueness guarantees.

#### Compound unique relationship indexes

Examples:

- `EventParticipant`: `{ eventId: 1, userId: 1 }` unique
- `OrganizationMembership`: `{ orgId: 1, userId: 1 }` unique
- `Follow`: `{ followerUserId: 1, targetType: 1, targetId: 1 }` unique

These are excellent examples of MongoDB modeling discipline.

Why they matter:

- they prevent duplicate relationship edges
- they support common access patterns
- they encode business invariants in the database

#### Sorted read indexes

Examples:

- `Notification`: `{ recipientUserId: 1, createdAt: -1 }`
- `Notification`: `{ recipientUserId: 1, isRead: 1 }`
- `Activity`: `{ actorId: 1, eventAt: -1 }`
- `UserFeedItem`: `{ userId: 1, score: -1 }`

These match list-style reads where you filter on one field and then sort by another.

#### TTL indexes

Examples:

- `UserFeedItem.expiresAt`
- `WebSocketConnection.expiresAt`
- password reset token `expiresAt`
- email verification token `expiresAt`

TTL indexes automatically delete expired documents in the background.

This is one of the best MongoDB features for ephemeral data.

#### Why TTL Is A Great Fit Here

Some data in this system should disappear automatically:

- recommendation feed snapshots become stale
- websocket connection presence should expire
- reset and verification tokens must expire for security

MongoDB can handle that without cron jobs manually deleting every row.

### Practical Indexing Principle

A strong answer sounds like this:

"I design indexes based on concrete read patterns, not just field popularity. For example, if I filter notifications by
`recipientUserId` and sort by newest first, I want a compound index like `{ recipientUserId: 1, createdAt: -1 }` instead
of separate single-field indexes."

## 9. Must-Know MongoDB Constraints And Guarantees

These are the practical boundaries of MongoDB that matter in real systems, not just the happy path.

### Document Size Limit

MongoDB documents have a maximum size of 16 MB.

Why this matters:

- you should not embed unbounded arrays forever
- giant activity or participant arrays inside one event document would be risky
- large binary payloads usually belong elsewhere, with only metadata stored in MongoDB

This repo avoids that problem well by keeping:

- event participants in their own collection
- follows in their own collection
- memberships in their own collection

### Single-Document Atomicity

A single write to one document is atomic.

That means if you update multiple fields in one document, readers will not see a half-updated version of that one
document.

That is why document design matters so much in MongoDB. If your core invariant can fit inside one document, you get
strong atomicity cheaply.

### Multi-Document Operations

Operations across multiple documents are not automatically all-or-nothing unless you explicitly use transactions.

This is why MongoDB modeling often emphasizes:

- idempotent writes
- edge collections
- denormalized read models
- eventual consistency where appropriate

### Flexible Schema Does Not Mean No Discipline

If you treat MongoDB as "anything goes," you create operational chaos.

The correct mindset is:

- schema flexibility in storage
- schema discipline in application design

This repo follows that well with:

- Typegoose decorators
- GraphQL types
- Zod validation
- model hooks

## 10. Deeper Indexing Knowledge You Should Know

If you are tuning a real system, these details matter.

### B-Tree Mental Model

Most standard MongoDB indexes are B-tree-like structures.

That means they are excellent for:

- equality matches
- prefix matches on compound keys
- ordered range scans
- supporting sorted reads

### Compound Index Prefix Rule

For a compound index like:

```text
{ recipientUserId: 1, createdAt: -1 }
```

MongoDB can use it efficiently for:

- `recipientUserId`
- `recipientUserId + createdAt`

But not necessarily for queries that only filter on `createdAt` and ignore `recipientUserId`.

This is one of the most important compound-index rules.

### Cardinality

High-cardinality fields are usually more selective and make better index candidates than low-cardinality fields.

Examples:

- `email` is high cardinality
- `isRead` is low cardinality
- `recipientUserId` is likely high cardinality

That is why an index on only `isRead` is often weak, but `{ recipientUserId: 1, isRead: 1 }` is much stronger.

### Covered Queries

A covered query is one where MongoDB can satisfy the query from the index alone without reading the full documents.

That can be very fast, though it is not always necessary or achievable.

### Index Cost

Every index has a price:

- more RAM usage
- more disk usage
- slower inserts
- slower updates and deletes

A strong practical rule:

"I do not add indexes casually. I add them for real hot queries, then verify the query plan and measure the effect."

### `explain()` And Query Plans

If asked how you verify a MongoDB query is efficient, say:

- use `explain()`
- check whether the plan is using the intended index
- compare `COLLSCAN` versus `IXSCAN`
- look at docs examined versus docs returned
- check whether the sort is index-supported or in-memory

Even though this repo does not show `explain()` calls in code, in production analysis that would be essential for:

- notification reads
- feed reads
- event aggregation performance

## 11. Query Patterns In This Repo

The repo uses several patterns you should be able to explain.

### Simple Point Reads

Examples:

- read user by email
- read user by username
- read event by slug
- read websocket connection by `connectionId`

These rely on highly selective fields and usually should hit indexes.

### Relationship Reads

Examples:

- all follows for a user
- all members of an organization
- all participants of an event

These usually rely on separate edge collections plus compound indexes.

### Sorted Feeds And Paginated Reads

Examples:

- notifications by `recipientUserId`, sorted by `createdAt desc`
- user feed by `userId`, sorted by `score desc`
- activities by `actorId`, sorted by `eventAt desc`

These are classic MongoDB workload patterns.

### Upserts

Examples:

- websocket connections use `findOneAndUpdate(..., { upsert: true })`
- user feed bulk recomputation uses `bulkWrite` with `updateOne` and `upsert`

Upsert means:

- update if it exists
- insert if it does not

This is very useful when the application is maintaining "current state" or a derived read model.

### Bulk Writes

The user feed DAO uses `bulkWrite`, which is a strong design decision for throughput.

Why it matters:

- lower network overhead
- fewer round trips
- more efficient batch persistence
- common pattern for recommendation results, backfills, and fan-out updates

See [userFeed.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/dao/userFeed.ts).

## 12. Aggregation: What It Is And Why It Matters

Aggregation in MongoDB is a pipeline-based data processing framework.

Think of it as:

- filtering
- transforming
- joining
- grouping
- computing
- projecting

all inside the database.

### Important Stages

- `$match`: filter documents
- `$project`: choose or reshape fields
- `$addFields`: compute new fields
- `$lookup`: join another collection
- `$unwind`: flatten arrays
- `$group`: aggregate and summarize
- `$sort`: sort results
- `$skip` / `$limit`: paginate
- `$count`: count matching results

### Practical Framing

Aggregation is not only for analytics. It is also used for operational query shaping.

That is exactly what this repo does.

### Aggregation In This Repo

The strongest example is the event lookup pipeline:

- start with events
- `$lookup` event categories
- `$lookup` organizer users
- map organizers into enriched objects
- `$lookup` participants
- `$lookup` users for those participants
- compute `rsvpCount`
- `$lookup` follows to compute `savedByCount`

See:

- [events.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/dao/events.ts)
- [lookup.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/utils/queries/aggregate/lookup.ts)

This is a strong example because it shows that the team is using aggregation not just for reports, but to build API
response shapes.

### Another Good Aggregation Example

`UserDAO.countByInterestCategoryIds(...)` uses:

- `$match`
- `$unwind`
- another `$match`
- `$group`

to count how many users are interested in each category.

See [user.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/mongodb/dao/user.ts).

That is the correct mental model:

- aggregation can transform arrays
- aggregation can compute counts without pulling everything into application memory

## 13. Why Aggregation Helps This System

Without aggregation, event reads would require many sequential queries:

- read event
- read categories
- read organizer users
- read participants
- read participant users
- count saves
- count RSVPs

Aggregation allows more of that assembly to happen inside MongoDB.

Benefits:

- fewer application-level round trips
- less resolver orchestration
- easier production of "ready-to-serve" response objects
- better fit for API responses that need computed fields

Tradeoff:

- pipelines can become expensive and hard to read
- `$lookup` can get costly at scale
- pipeline tuning becomes important
- in a sharded cluster, cross-shard lookups need more care

## 14. `populate()` Versus `$lookup()` Versus DataLoader

This is another important design area.

There are several ways to resolve references in MongoDB-backed Node applications.

### Mongoose `populate()`

`populate()` is convenient and expressive, but it is still an application-layer abstraction. Depending on the case, it
may involve extra queries and can hide performance costs if overused.

### MongoDB `$lookup`

`$lookup` performs the join logic in the aggregation pipeline inside MongoDB.

Benefits:

- fewer application round trips
- response shaping can happen in one pipeline
- useful for computed or enriched API payloads

Tradeoffs:

- can become expensive
- can get hard to maintain
- cross-shard implications matter later

### DataLoader

DataLoader batches repeated lookups at the GraphQL resolver layer.

Benefits:

- great for nested resolver fan-out
- avoids N+1 query patterns
- pairs well with simple indexed point reads

### What This Repo Chooses

This repo uses a mix of:

- aggregation `$lookup` for event-heavy enriched reads
- DataLoader for repeated nested point lookups
- not much visible reliance on `populate()`

That is actually a sensible split.

Use `$lookup` when:

- the whole result needs shaping in one DB pipeline

Use DataLoader when:

- many resolvers need to batch the same kind of direct lookup

## 15. Mongoose `.lean()` And Why It Matters

This repo uses `.lean()` in DataLoaders for batched nested reads, for example:

- [userLoader.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/graphql/loaders/userLoader.ts)
- [eventLoader.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/graphql/loaders/eventLoader.ts)

`lean()` tells Mongoose:

"Give me plain JavaScript objects, not fully hydrated Mongoose documents."

Why that is useful:

- less memory overhead
- less CPU overhead
- faster for read-only cases

This is a good optimization when you do not need document methods, middleware behavior, or later mutation/save on the
returned objects.

## 16. DataLoader And N+1 Problems

This is technically a GraphQL topic, but in this repo it directly affects MongoDB load.

The N+1 problem:

- query 1 gets a list of items
- then each item triggers another query for a related object
- suddenly 1 API call causes dozens or hundreds of DB queries

This repo mitigates that using DataLoader for per-request batching.

Examples:

- `createUserLoader`
- `createEventLoader`
- `createEventCategoryInterestCountLoader`

This matters because database performance is not just about indexes. It is also about query shape at the application
layer.

## 17. Validation And Schema Enforcement

MongoDB itself is schema-flexible, but this project still has strong structure.

The system enforces data correctness through:

- Typegoose model definitions
- Mongoose model hooks
- Zod validation in `apps/api/lib/validation/zod`
- GraphQL input typing

Examples:

- password hashing in user model hooks
- lowercasing email in user model hooks
- slug creation for events
- generated string IDs from `_id`

This is exactly how mature MongoDB systems operate:

- let MongoDB stay flexible
- enforce domain correctness at the model and application boundaries

## 18. Transactions And Consistency

MongoDB supports multi-document ACID transactions, especially in replica sets and sharded clusters.

But you should know two things:

1. Single-document writes in MongoDB are already atomic.
2. Multi-document transactions are powerful but should be used carefully.

### What This Repo Does Today

This repo does not appear to lean on MongoDB transactions for its normal flow.

That is not automatically a flaw. Many MongoDB systems intentionally model data so that single-document atomicity plus
idempotent workflows are enough most of the time.

### Practical Rule

"MongoDB supports transactions, but I do not reach for them automatically. First I ask whether the model can be shaped
so the core invariant lives in one document or an idempotent edge write. Transactions are useful when true
cross-document atomicity matters, but they come with overhead."

### Where Transactions Might Matter Here

Potential examples in a future evolution:

- creating an event and simultaneously creating multiple side-effect documents with all-or-nothing guarantees
- applying organization membership changes plus audit activity records atomically
- fan-out notification writes combined with state changes when strict consistency is required

## 19. Replication, High Availability, And Read/Write Semantics

A replica set is MongoDB's high-availability unit:

- one primary accepts writes
- secondaries replicate from the primary
- failover can promote a secondary if the primary dies

### Why This Matters

Common operational questions here are:

- how do you get HA in MongoDB?
- can secondaries serve reads?
- what is the tradeoff?

Good answer:

- yes, secondaries can serve reads depending on read preference
- but reads from secondaries may be stale
- write concern controls durability guarantees
- read concern controls consistency semantics

### Oplog And Replication

A useful deeper detail:

- MongoDB replication uses an oplog
- secondaries replay operations from the oplog

That is why replication lag can exist, and why secondary reads may be behind the primary.

### Elections

If the primary fails, a new primary is elected from eligible secondaries.

That means:

- clients need retry logic
- short failover windows are normal
- write availability can briefly pause during election

### Write Concern

Write concern is about how durable a write must be before MongoDB acknowledges it.

Examples:

- acknowledge after primary only
- acknowledge after replication to multiple members

Higher durability usually means:

- safer writes
- but higher latency

### Read Preference

Read preference controls where reads go:

- primary
- primary preferred
- secondary
- secondary preferred
- nearest

### Read Concern

Read concern controls how consistent or isolated reads are.

The exact options matter less than understanding the concept:

- stronger guarantees usually cost more
- stale or eventually consistent reads are sometimes acceptable

For this repo, critical paths like authentication, authorization, membership checks, and RSVP state are the kinds of
reads where correctness matters more than offloading reads to secondaries.

### Practical View For This System

For a social/event platform:

- primary reads and writes are simplest for correctness-sensitive paths
- some analytics or less-sensitive reads could tolerate slightly stale secondaries
- durability matters for user accounts, memberships, RSVPs, and notifications

## 20. How MongoDB Is Optimized For Horizontal Scaling

This is one of the most important scaling topics in MongoDB.

MongoDB is optimized for horizontal scaling primarily through sharding.

### What Is Horizontal Scaling?

Horizontal scaling means:

- instead of making one machine bigger, you spread data and workload across multiple machines

MongoDB's shard architecture makes this possible by partitioning data into chunks distributed across shards.

### Key Components Of A Sharded Cluster

- `shard`: stores part of the data; each shard is usually a replica set
- `mongos`: routing layer that sends queries to the correct shards
- `config servers`: metadata store for chunk and shard mapping
- `balancer`: moves chunks to keep distribution even

### Why MongoDB Fits Horizontal Scale Well

- documents are natural partition units
- collections can be split across shards
- queries that include the shard key can be routed efficiently
- writes can be distributed instead of all landing on one machine
- each shard can itself be a replica set, so you get both scale and HA

### Important Caveat

MongoDB only scales well horizontally if shard keys and query patterns are chosen well.

Sharding is not magic.

Bad shard key choice can create:

- hot shards
- scatter-gather reads
- painful resharding
- poor balancing

## 21. What Sharding Is

Sharding means partitioning a collection's documents across multiple shards based on a shard key.

MongoDB splits the key space into chunks and places those chunks on different shards.

Example idea:

- users with certain shard-key values go to shard A
- others go to shard B
- others go to shard C

### Why Sharding Helps

- larger total storage capacity
- more aggregate read throughput
- more aggregate write throughput
- reduced pressure on a single primary node
- operational isolation of distributed data

### When To Consider Sharding

Usually when:

- one replica set is too large
- write throughput is too high for one primary
- working set no longer fits comfortably
- a few hot collections dominate load

## 22. Sharding Strategies

This is another core scaling topic.

MongoDB commonly uses these shard key strategies.

### 1. Ranged Sharding

Shard key values are assigned by ordered ranges.

Example:

- `createdAt` from Jan-March on shard A
- April-June on shard B

Benefits:

- efficient range queries
- predictable locality

Drawbacks:

- can create hotspotting if inserts are mostly increasing
- new writes may all hit the latest range

### 2. Hashed Sharding

MongoDB hashes the shard key before distributing chunks.

Benefits:

- good even write distribution
- reduces hotspotting

Drawbacks:

- poor for range queries on that key
- routing exact-match queries is great, range locality is not

### 3. Zoned Sharding

Specific key ranges are pinned to specific shards or regions.

Benefits:

- data locality
- regulatory or geographic placement control
- tiered hardware placement

Drawbacks:

- more operational complexity

### 4. Compound Shard Keys

Use more than one field in the shard key.

This can help when you need:

- some distribution
- some query locality

But compound shard keys require careful design around cardinality, prefixes, and query patterns.

## 23. How To Choose A Shard Key

This is the most important sharding design question.

A good shard key usually has these properties:

- high cardinality
- even distribution
- appears in common query filters
- avoids monotonic hotspotting
- remains stable over time

### Bad Shard Key Smells

- very low cardinality
- highly skewed traffic
- always-increasing values that push new writes to one shard
- a key that almost no query includes

### Examples Applied To This Repo

#### Good candidate: hashed `userId` on `userfeeds`

- high cardinality
- every query is user-scoped
- write distribution is good

#### Good candidate: hashed `recipientUserId` on `notifications`

- aligned with reads
- aligned with unread-count queries
- aligned with mark-as-read operations

#### Risky candidate: `createdAt` range shard key on append-heavy collections

- new writes would cluster on the latest range
- one shard could become hot

#### Risky candidate: low-cardinality status fields

- fields like `isRead` or `status` alone would distribute terribly

## 24. How Sharding Would Benefit This System

Now connect theory to the actual repository.

Today, the collections most likely to become hot first are not necessarily `events` or `users`. More likely candidates
are:

- `userfeeds`
- `notifications`
- `activities`
- `follows`
- `eventparticipants`
- possibly `websocketconnections`

Why?

- they grow with user activity
- they are frequently written
- many are naturally partitionable by user or event
- several are feed-like or edge-like collections

### Best Initial Sharding Candidates

#### `userfeeds`

This is the strongest candidate.

Why:

- every feed item belongs to a user
- reads are naturally scoped by `userId`
- recomputation and cleanup are also per-user
- the collection is already denormalized and query-local

Good shard key candidate:

- hashed `userId`

Why hashed `userId` works:

- even distribution
- exact-match reads by `userId` route cleanly
- feed writes distribute well

#### `notifications`

Another strong candidate.

Why:

- almost every read is by `recipientUserId`
- unread counts are also by `recipientUserId`
- marking notifications read is user-scoped

Likely shard key:

- hashed `recipientUserId`

#### `activities`

Potential candidate if social feed volume grows heavily.

Likely key:

- hashed `actorId`

#### `websocketconnections`

Potential candidate in large real-time scale.

Possible key:

- hashed `userId`
- or hashed `connectionId`, depending which access pattern dominates

### Collections I Would Not Shard First

#### `events`

Not the first choice unless event volume or write rate becomes huge.

Why:

- event queries often use many filters
- event reads use heavy aggregation and lookups
- geospatial and search behavior need cleanup first
- sharding events too early can make query planning more complex

#### `users`

Usually not the first collection to shard in a system like this.

User records are important, but traffic often concentrates more heavily in edge/feed collections than in the user
profile collection itself.

## 25. What We Would Change To Implement Sharding Here

Another direct user requirement.

If this system needed sharding, I would not jump straight into "enable sharding for everything."

I would do it in phases.

### Phase 1: Confirm Hot Collections And Query Patterns

Use metrics to answer:

- which collections are largest?
- which collections have the highest write rates?
- which queries dominate p95/p99 latency?
- which queries already include a strong partition key?

The repo already has query timing instrumentation in
[mongoDbClient.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/clients/mongoDbClient.ts). That is a
useful starting point, but in real production I would also want:

- collection-level read/write metrics
- slow query profiling
- `explain()` plans for hot queries
- shard-key simulation before rollout

### Phase 2: Shard The Most Naturally Partitioned Collections First

Start with:

- `userfeeds` on hashed `userId`
- `notifications` on hashed `recipientUserId`

Why first:

- queries are naturally user-scoped
- low ambiguity in access pattern
- shard targeting is straightforward

### Phase 3: Adjust Indexing For Shard-Aware Querying

In sharded MongoDB, indexes still matter, but now shard keys matter too.

For example, if `notifications` is sharded by `recipientUserId`, then common queries like:

- `find notifications for recipientUserId sorted by createdAt`

should align with both:

- the shard key
- the local per-shard sort/index strategy

You would likely want indexes like:

- `{ recipientUserId: 1, createdAt: -1 }`
- `{ recipientUserId: 1, isRead: 1 }`

This repo already has those, which is good.

### Phase 4: Update Query Design To Include Shard Keys Consistently

If a collection is sharded, queries that omit the shard key may become scatter-gather operations.

This means `mongos` has to ask many shards instead of routing directly to one.

So part of sharding is not only infra work. It is application query discipline.

For this repo, that means:

- keep notification queries user-scoped
- keep feed queries user-scoped
- keep websocket reads scoped by connection or user consistently

### Phase 5: Revisit Aggregation Pipelines

The event aggregation pipeline currently does multiple `$lookup`s across collections.

Under sharding, I would review:

- are joined collections co-located in any meaningful way?
- does the pipeline cause cross-shard fan-out?
- should some computed fields be precomputed instead?
- should some read paths be denormalized?

Possible future change:

- precompute some event counters such as `rsvpCount` or `savedByCount` rather than deriving them on every read

That is a classic MongoDB tradeoff:

- more write complexity
- much faster reads

### Phase 6: Fix Geospatial Modeling Before Heavy Event-Scale Sharding

Current event location filtering computes distance manually in aggregation using latitude and longitude fields.

See [filter.ts](/home/bigfish/code/projects/gatherle-monorepo/apps/api/lib/utils/queries/aggregate/filter.ts).

That works, but for serious scale I would strongly consider:

- storing GeoJSON `Point`
- adding a `2dsphere` index
- using `$geoNear` or native geospatial queries

Why:

- more correct geospatial semantics
- faster location search
- better MongoDB-native optimization

In practice, this shows an understanding of MongoDB beyond CRUD.

### Phase 7: Reevaluate Uniqueness Constraints Under Sharding

In sharded collections, unique indexes become trickier because uniqueness often has to be compatible with the shard key.

For example, if a collection is sharded by `userId`, then unique constraints that do not include `userId` may need
redesign depending on the exact MongoDB setup and rules.

So before sharding a collection, I would verify that its unique indexes are shard-compatible.

## 26. Sharding Pitfalls To Watch For

If you want to sound senior, do not talk about sharding only in terms of benefits. Talk about failure modes too.

### Scatter-Gather Queries

If a query does not include the shard key, `mongos` may have to query many or all shards.

That hurts latency and wastes cluster resources.

### Hot Shards

If one shard key range or hash bucket receives disproportionate traffic, one shard becomes the bottleneck.

### Cross-Shard Aggregation Complexity

Aggregations with `$lookup`, `$group`, and sorts may become more expensive when data is spread across shards.

### Resharding Cost

Changing a bad shard key later is possible, but it is still an operationally significant task. Choosing carefully up
front matters.

### Unique Index Constraints

Unique indexes in sharded collections require careful compatibility with the shard key and cluster rules.

### Operational Complexity

A sharded cluster introduces:

- more components
- more failure modes
- more capacity planning
- more operational tuning

That is why the right answer is usually:

"Shard only when you need it, and only after you understand your access patterns."

## 27. MongoDB Design Strengths Already Visible In This Repo

This repo already shows several good MongoDB patterns.

### 1. Edge Collections For Relationships

Examples:

- follows
- organization memberships
- event participants

This is usually better than embedding huge arrays in parent documents.

### 2. TTL For Ephemeral Data

Examples:

- websocket connections
- reset tokens
- verification tokens
- feed snapshots

This is a very MongoDB-native solution.

### 3. Denormalized Feed Storage

The `UserFeedItem` collection is not normalized source-of-truth domain data. It is a derived read model.

That is exactly the kind of thing document databases are often good at:

- compute a feed
- store it in a query-friendly shape
- expire it later

### 4. Aggregation For Response Shaping

The event pipeline is not just "get raw rows." It shapes the object the API actually wants.

### 5. DAO Layer Separation

This keeps raw query logic centralized and maintainable.

## 28. Places Where This System Could Improve

It also helps to identify limitations honestly.

### 1. Geospatial Querying Is Manual

Current location filtering:

- regex filters text fields like city/state/country
- computes approximate distance manually

That is functional, but for scale I would prefer:

- GeoJSON coordinates
- `2dsphere` index
- geospatial query operators

### 2. Some Heavy Event Reads Depend On Multiple `$lookup`s

That may be fine today, but under heavy scale:

- latency could grow
- cross-shard complexity could rise
- precomputed counters or denormalized summaries may help

### 3. Regex Search Is Flexible But Not Always Cheap

Text search in query helpers builds regex-based matching.

That is useful for simple search, but it is not the same as:

- a proper MongoDB text index
- Atlas Search
- dedicated search infrastructure

If search becomes core product functionality, this area would likely need improvement.

### 4. No Visible Transaction Strategy

That may be fine, but if the domain grows more complex, some workflows may need explicit transaction boundaries or
stronger idempotency patterns.

## 29. Common MongoDB Anti-Patterns And Why This Repo Mostly Avoids Them

These are common MongoDB design mistakes.

### Anti-Pattern: Unbounded Arrays In A Single Document

Bad example:

- storing every participant of a popular event inside one ever-growing event document

Problems:

- document growth
- update contention
- risk around size limits
- awkward querying

This repo avoids that by using `EventParticipant` as a separate collection.

### Anti-Pattern: Over-Normalizing Everything

If you split every tiny piece of data into separate collections and always rebuild responses with many joins, you lose
one of MongoDB's main strengths.

This repo does reasonably well here by:

- embedding some bounded structures inside documents
- referencing where cardinality and independence justify it
- denormalizing feed items for read efficiency

### Anti-Pattern: Indexing Everything

Too many indexes slow writes and bloat storage.

### Anti-Pattern: Ignoring Query Plans

A query that "works" can still be operationally bad if it scans too much data.

### Anti-Pattern: Using Regex Search As A Full Search Strategy Forever

Regex can be fine at small scale, but search-heavy products often need text indexes or dedicated search tooling.

### Anti-Pattern: Choosing A Shard Key Too Early Or Too Casually

Sharding based on guesses instead of measured access patterns is a common mistake.

## 30. MongoDB Versus SQL

MongoDB should not be compared to SQL systems with shallow slogans like "NoSQL is flexible."

A better comparison is:

"MongoDB is a document database, so the model is built around access patterns and document boundaries rather than
starting with heavy normalization. It is strong when data is hierarchical, when schemas evolve frequently, and when
denormalized read models or horizontal scale matter. But consistency, indexes, and the cost of cross-collection joins
still need deliberate design."

### Specific Comparison

Relational systems are often better when:

- complex multi-table transactions dominate
- strict normalization is valuable
- relational joins are the main access model

MongoDB is often better when:

- aggregates and entities map naturally to documents
- denormalization helps read performance
- schema evolves frequently
- operational scale-out matters

## 31. Common MongoDB Questions

### What Is The Difference Between MongoDB And Mongoose?

MongoDB is the database. Mongoose is the Node.js ODM used to define schemas, validations, middleware, and query helpers
on top of MongoDB.

### What Is The Difference Between Mongoose And Typegoose?

Mongoose is the ODM runtime. Typegoose is a layer that lets you define Mongoose schemas using TypeScript classes and
decorators.

### Why Would You Use References Instead Of Embedding?

In this system, many relationships are many-to-many and can grow independently, so separate collections plus compound
unique indexes are more appropriate than embedding large arrays.

### What Is Aggregation?

Aggregation is MongoDB's pipeline framework for filtering, transforming, joining, grouping, and computing inside the
database. This system uses it heavily for event response shaping and category interest counting.

### What Is Sharding?

Sharding is partitioning a collection across multiple shards by shard key so storage and workload can scale beyond a
single replica set.

### What Is A Good Shard Key?

A good shard key usually has:

- high cardinality
- good distribution
- alignment with common query filters
- low hotspot risk

### Why Is Hashed Sharding Good For Feeds?

Because feed reads and writes are usually scoped to a user, and hashing `userId` spreads load evenly while still routing
exact-match user queries effectively.

### What Is The Downside Of `$lookup`?

It can be expensive, especially at scale or across shards. It is powerful, but you still need to think about
cardinality, indexing, and whether precomputation or denormalization would be better.

### What Does `.lean()` Do?

It returns plain JS objects instead of hydrated Mongoose documents, reducing overhead for read-only paths.

### What Is A TTL Index?

A TTL index automatically removes documents after their expiration time. This repo uses TTL for feed items, websocket
presence, and security tokens.

### How Would This Repo's MongoDB Usage Be Optimized?

High-value improvements would include:

- add `explain()`-driven tuning for hot queries
- adopt geospatial indexing for events
- review whether some event counters should be precomputed
- shard user-scoped high-volume collections first if scale requires it
- strengthen observability around slow queries and aggregation cost

## 32. Repository MongoDB Architecture Summary

The API uses MongoDB with Mongoose and Typegoose. Shared domain classes define the schemas, API-side models instantiate
them, and DAOs centralize all database access. The model is mostly reference-based: users, events, follows, memberships,
and participants are separate collections, with compound unique indexes enforcing business edges. For read shaping, the
app uses aggregation, especially on events where it joins categories, organizers, participants, and save counts. For
scale-friendly patterns, it also uses denormalized collections like `UserFeedItem`, plus TTL indexes for ephemeral data
like feed snapshots, websocket connections, and security tokens. If the system needed horizontal scale, the most natural
first sharding targets would be user-scoped high-volume collections like feeds and notifications on hashed user keys
before core entity collections like events.

## 33. Practical Best Practices For MongoDB In This Codebase

As the system grows, these are the most useful next steps.

### Indexes

- verify every hot query with `explain()`
- keep indexes aligned with actual filter + sort patterns
- remove unused indexes because they hurt writes too

### Event Search

- consider text indexes or Atlas Search for search-heavy paths
- consider `2dsphere` indexing for event location

### Aggregations

- keep `$match` as early as possible
- limit result sets before expensive later stages when possible
- watch `$lookup` cardinality
- precompute counters when read amplification becomes too high

### Sharding

- shard only the collections that actually need it
- choose shard keys from real production access patterns
- prefer user-scoped high-volume collections first
- avoid scatter-gather query patterns

### Operational Safety

- monitor slow queries
- monitor index growth
- understand write concern and failover behavior
- test large-scale aggregation performance before product launches

## 34. Optimization Summary

If you need a compressed version of the main recommendations, use this.

### Definitions

- MongoDB: document database using BSON
- Mongoose: ODM for Node.js and MongoDB
- Typegoose: class/decorator layer on top of Mongoose
- Aggregation: MongoDB pipeline for filtering, joining, grouping, and reshaping data
- Sharding: partitioning data across multiple shards by shard key
- Replica set: high-availability cluster with primary and secondaries

### Patterns In This Repo

- references for many-to-many relationships
- compound unique indexes for edge collections
- TTL indexes for ephemeral documents
- denormalized user feed storage
- aggregation pipelines for event response assembly
- DataLoader plus `.lean()` to reduce MongoDB query overhead in GraphQL

### Best Sharding Candidates Here

- `userfeeds` by hashed `userId`
- `notifications` by hashed `recipientUserId`
- maybe `activities` by hashed `actorId`

### Improvements I Would Consider

- geospatial indexing for events
- stronger search strategy than regex-only search
- precomputed counters for heavy event reads
- shard-aware query review if scale demands it

## 35. Final Perspective

The key is not just defining MongoDB terms.

It is understanding the real engineering decisions underneath them:

- why some data is embedded and some is referenced
- why indexes are shaped around access patterns
- why aggregation is useful but not free
- why denormalization is often a deliberate optimization
- why sharding is powerful but requires disciplined shard-key design
- why observability, query shape, and application-layer batching matter as much as the database choice itself

This repo gives you plenty of concrete examples:

- user-scoped feed data with TTL
- relationship edges with compound unique indexes
- aggregation-backed event reads
- GraphQL batching with lean MongoDB reads
- ephemeral security and presence data handled with MongoDB-native expiration

If you can work through those patterns clearly, you move beyond generic MongoDB knowledge into real system design and
optimization.
