# Gatherle Product Manual

This is the canonical product context document for Gatherle.

Use it to translate strategy into decisions about UI, API shape, architecture, testing, copy, prioritization, and
reviews.

If a product-facing task conflicts with older notes, use this document first and treat
[docs/project-brief.md](../project-brief.md) as the market/strategy companion.

## 1. Product In One Sentence

**Gatherle is a social-first event discovery product that helps people decide what to do next by showing what is
happening nearby, where their people are gathering, and which experiences feel worth showing up for.**

## 2. Core User Questions

Gatherle succeeds when the product answers these questions quickly:

1. What is happening around me?
2. Which of these things feel alive right now?
3. Are people I care about involved?
4. Is this worth committing to?
5. What should I do next: RSVP, save, share, follow, or show up?

The ideal emotional reaction is:

> "My people are doing things. I should probably be there."

## 3. What Gatherle Is

Gatherle is:

- a consumer product, not a back-office tool
- a discovery and participation product, not just a directory
- a social context layer for real-world experiences
- an event-led network, where people, communities, venues, and moments strengthen the value of events
- a product that should create momentum, curiosity, confidence, and FOMO in healthy ways

## 4. What Gatherle Is Not

Gatherle is not:

- a generic event listing board
- a host CRM dressed up as a consumer app
- an Instagram clone with event-themed decoration
- a random stories platform where content floats free from real-world experiences
- a feature factory where more buttons automatically mean a better product

When in doubt:

- **events, communities, venues, and people come first**
- **generic social behavior comes later, if ever**

## 5. Launch Context

Gatherle launches from a Gauteng-first context and should feel locally relevant, practical, and energetic.

Important launch truths:

- people often decide late
- distance, trust, time, and social proof heavily influence attendance
- the product must feel useful even when a user only has a few minutes to decide what to do
- local context matters: neighborhood familiarity, venue confidence, safety signals, and recency all shape trust

## 6. Primary Product Promise

For attendees:

- show me relevant experiences
- show me where real participation is happening
- help me commit quickly and confidently

For hosts:

- help the right audience discover the event
- help events feel active before they are full
- turn visibility into participation

For the platform:

- social context is not decoration
- social context is the conversion engine

## 7. Primary Audiences

### Core audience

- socially active people looking for something worth doing soon
- users who care about nightlife, culture, community, sports, lifestyle, and events that feel alive

### Adjacent audiences

- organizers and community builders
- people discovering new circles through trusted activity
- users who want more than "what exists" and care about "what is actually happening"

## 8. Core Product Loops

### 8.1 Discovery Loop

1. User opens Gatherle.
2. User sees events with context, not just listings.
3. Social proof or momentum creates curiosity.
4. User opens event details.
5. User RSVPs, saves, shares, or follows.

### 8.2 Participation Loop

1. User RSVPs.
2. Event becomes part of the user’s active plans.
3. User sees moments, updates, or related activity.
4. User attends and creates more visible participation.
5. Participation strengthens profile identity and future recommendations.

### 8.3 Social Loop

1. User follows people, communities, or organizers.
2. Gatherle surfaces their activity and related experiences.
3. User discovers events because of people, not only because of search.
4. User contributes more social signal back into the system.

### 8.4 Host Loop

1. Host creates event.
2. Event becomes discoverable.
3. Social proof, saves, RSVPs, and moments build momentum.
4. Trust and turnout improve host credibility.

## 9. Surface Roles

Every major surface has a job. Do not let surfaces drift into each other.

### Home

Home is **personal re-entry**.

Home should answer:

- what did I already commit to?
- what are people I follow doing?
- what should I re-open now?

Home is not the broadest discovery surface.

### Explore / Events

Explore is **broad discovery**.

Explore should answer:

- what is out there?
- what fits my time, location, and taste?
- what is trending or nearby?

Explore is allowed to be wider than Home.

### Event Card

Every event card should answer:

1. What is this?
2. When is it?
3. Where is it?
4. Why should I care?
5. Who is involved?

If a card does not answer "why should I care?" it is incomplete.

### Event Detail

Event detail is **decision support**.

Its job is to remove uncertainty and make RSVP feel obvious.

### Moments

Moments are **proof of life**.

Their job is to make events, venues, communities, and participation feel real.

Moments should strengthen:

- event discovery
- event confidence
- community identity
- social momentum

Moments should not become a detached generic social feed.

### Profile

Profile is **identity through participation**.

A good profile should show:

- what this person is into
- what they attend
- what they host
- what communities they are adjacent to

Profiles should feel like a person, not a settings form with an avatar.

### Notifications

Notifications are **social and operational nudges**.

They should support action, coordination, follow activity, and participation.

### Messages

Messages are **coordination**, not the primary product.

Messaging should support experiences and relationships already created elsewhere in the product.

## 10. Product Laws

These laws should guide design, engineering, and review decisions.

### Law 1: People Beat Counts

Humans care about humans more than statistics.

Prefer:

- `Anele and 4 others are going`
- `2 people you follow are interested`

Over:

- `5 going`
- `12 saves`

Counts still matter, but they should usually support people-first storytelling, not replace it.

### Law 2: RSVP Is The Primary Event Action

RSVP is the strongest expression of event intent.

Action hierarchy:

1. RSVP
2. Save
3. Share

Do not make Save or Share compete equally with RSVP unless there is a strong product reason.

### Law 3: Moments Must Strengthen Discovery

Moments exist to make real-world experiences feel alive.

Default anchor points:

- event moments
- venue moments
- organizer/community moments

Generic posting is a product risk and should be treated carefully.

### Law 4: Home Is Personal, Explore Is Broad

If a surface starts feeling confusing, ask whether it forgot its role:

- Home = personal, active, re-entry, network-aware
- Explore = broad, open, searchable, filterable

### Law 5: Social Proof Must Feel Earned

Do not invent fake energy.

Social proof should come from:

- actual attendees
- followers/friends
- real moments
- meaningful host or venue momentum

### Law 6: Empty States Must Move The User Forward

Every empty state should:

- explain what is missing
- explain why it matters
- offer the next useful action

Avoid dead-end empties.

### Law 7: Trust Is Product

Users only attend real-world experiences if the product feels trustworthy.

Trust can come from:

- recognizable people
- venue credibility
- clear event metadata
- sane privacy and visibility controls
- moderation and safety signals

### Law 8: Gatherle Should Feel Alive, Not Busy

More UI is not the same thing as more momentum.

Prefer:

- stronger signal
- clearer hierarchy
- fewer repeated facts
- fewer decorative features with weak value

## 11. Product Heuristics By Area

### 11.1 Event Cards

Good event cards:

- establish event identity fast
- avoid duplicate information
- show at least one reason to care
- show who is involved when possible
- keep actions visually clear and subordinate to the card’s core decision

Bad event cards:

- repeat attendance in multiple places without adding meaning
- treat all actions as equally important
- show numbers with no human context

### 11.2 Event Details

Good event detail pages reduce hesitation.

They should increase confidence around:

- timing
- venue
- host/community
- attendance and momentum
- media and moments

### 11.3 Home

Good Home content should feel like:

- plans I already care about
- useful re-entry points
- proof that something interesting is happening

Good Home is not just a smaller Explore feed.

### 11.4 Explore

Good Explore should feel:

- broad
- useful
- fast to scan
- location/time aware

### 11.5 Moments

Good Moments make users think:

- "this event looks active"
- "people are really there"
- "this community feels real"

Bad Moments make users think:

- "why is this in Gatherle instead of Instagram?"

### 11.6 Profile

Good profiles communicate:

- personality
- interests
- participation history
- social adjacency

If a profile is correct but emotionally flat, it is not done.

## 12. Beta Priorities

Before beta launch, the highest-value product improvements are:

1. stronger social proof across feeds and cards
2. people-first event discovery
3. sharper event/community/venue identity
4. profiles that show participation and taste
5. moments that clearly support events and communities

## 13. Anti-Goals For Now

Do not prioritize these ahead of core momentum and discovery:

- generic social feature expansion
- decorative gamification
- reaction packs and novelty interactions with weak product value
- AI assistant features that do not improve discovery or participation
- admin-style complexity on consumer surfaces

## 14. What Good Product Reviews Usually Mean

When a product review says:

- **"The app doesn’t feel social enough"**
  - add more human context, not more counters
- **"Moments have an identity problem"**
  - clarify what moments are for, not just how they animate
- **"The app feels polished but not compelling"**
  - improve social gravity and re-entry value
- **"This feels like Instagram"**
  - re-anchor the experience around events, communities, venues, and participation
- **"This feels like a listing site"**
  - add momentum, people, and reasons to care

## 15. Translation Rules For Engineering Work

### For frontend work

Ask:

1. Which surface role is affected?
2. Does this increase clarity, confidence, or momentum?
3. Does this make the product feel more human or more statistical?
4. Does this preserve RSVP hierarchy?
5. Does this move Gatherle toward events-plus-people, or toward generic content?

### For backend work

Ask:

1. Does this schema or resolver expose the right social context?
2. Are we enabling people-first surfaces or only raw counters?
3. Are visibility and privacy rules aligned with trust?
4. Does this support real participation and discovery quality?

### For architecture work

Ask:

1. Does this investment strengthen discovery, participation, trust, or social proof?
2. Are we optimizing the core loop or building infrastructure for speculative features?
3. Does this support the social-first event model rather than generic CRUD scale?

### For testing work

Ask:

1. Are we only testing mechanics, or also the product promise?
2. Do tests protect hierarchy, empty-state guidance, social proof rendering, and visibility rules where relevant?

## 16. Agent Checklist Before Product-Facing Changes

Before making product-facing changes, agents should:

1. identify the user journey being affected
2. identify the surface role being affected
3. identify the product law most relevant to the change
4. explain whether the change strengthens discovery, participation, trust, or social proof
5. call out any risk of turning Gatherle into a generic listings app or generic social app

## 17. Canonical Short Version

If an agent only remembers a few lines, remember these:

- Gatherle is a social-first event discovery product.
- Humans care about humans more than counts.
- RSVP is the primary event action.
- Home is personal; Explore is broad.
- Moments prove that experiences are alive; they do not replace the product.
- Profiles should show identity through participation.
- Trust, clarity, and momentum matter more than feature quantity.
