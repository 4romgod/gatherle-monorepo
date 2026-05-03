import { config } from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'path';
import { clearRuntimeContext } from './runtimeContext';

// Load the API .env before importing constants so env vars are present during module init
config({ path: resolve(__dirname, '../../.env') });

// Imported AFTER dotenv so constants are initialised with the correct env vars
import { getConfigValue } from '@/clients';
import { SECRET_KEYS } from '@/constants';

/**
 * Title prefixes used in e2e test events. Any event whose title starts with
 * one of these strings is assumed to be test data and safe to delete.
 */
const TEST_TITLE_PREFIXES = [
  'Test EventSeries Title', // eventSeries.e2e.ts
  'Trending E2E Test EventSeries', // trending.e2e.ts
  'Feed Test EventSeries', // feed.e2e.ts
  'Cold Start E2E EventSeries', // reserved prefix for cold-start tests
  'Social Feed EventSeries', // social.e2e.ts
  'Participant EventSeries', // eventSeriesParticipant.e2e.ts
  'Occurrence Query Event', // eventOccurrence.e2e.ts (base buildEventInput)
  'Occurrence Query Recurring Series', // eventOccurrence.e2e.ts
  'Occurrence Query Single Series', // eventOccurrence.e2e.ts
  'Occurrence Detail Recurring Series', // eventOccurrence.e2e.ts
  'Occurrence Detail Single Series', // eventOccurrence.e2e.ts
  'Occurrence Exception Update Series', // eventOccurrence.e2e.ts
  'Occurrence Cancellation Series', // eventOccurrence.e2e.ts
  'Occurrence RSVP Series', // eventOccurrenceParticipant.e2e.ts
  'Split Source Series', // eventSeries.e2e.ts (split test setup)
  'Split Successor Series', // eventSeries.e2e.ts (split test output)
];

/**
 * Email domain suffixes used by dynamically-created test users.
 * - Seed users use @gatherle.local (excluded by isTestUser flag)
 * - Regular test users use @example.com
 * - Updated-email test users use @email.com
 */
const TEST_USER_EMAIL_SUFFIXES = ['@example.com', '@email.com'];

/**
 * Name prefixes used in e2e test organizations.
 * Keep in sync with every createOrganization() call across the e2e test suite.
 */
const TEST_ORG_NAME_PREFIXES = [
  // organization.e2e.ts
  'create-org-',
  'e2e-org-',
  'org-update-',
  'org-list-',
  'org-page-',
  'org-sort-',
  'read-my-org-',
  'unauthorized-org-',
  'org-no-auth-',
  'duplicate-org-',
  'owner-override-',
  'Test Organization Name ',
  // eventSeries.e2e.ts
  'org-guard-',
  'org-guard-remove-',
  // organizationMembership.e2e.ts
  'Membership Org ',
  'Membership Update Org ',
  'Membership Read Org ',
  'Membership Delete Org ',
  'Membership Unauthorized Org ',
  // venue.e2e.ts — every org created in that test file
  'Venue Org ', // covers all 'Venue Org <Suffix> <randomId>' variants
  'Org1 Venues ',
  'Org2 Venues ',
  // social.e2e.ts
  'Follow Org ', // 'Follow Org ${Date.now()}'
  'Social Org ',
  // future / generic safety nets
  'EventSeries Org ',
  'event-org-',
  'delete-org-',
  'follow-org-',
  'read-orgs-',
];

/**
 * Name prefixes/exact names used by e2e test venues (venue.e2e.ts).
 * Includes both prefix-based names (with uniqueVenueName helper) and exact static names.
 */
const TEST_VENUE_NAME_PREFIXES = [
  'E2E Venue', // createVenue() helper default
  'Created Venue', // 'creates a venue with valid input'
  'Physical Venue', // 'creates venues with different types'
  'Hybrid Venue', // 'creates venues with different types'
  'New Venue Name', // 'updates venue name' (static string after update)
  'Updated Venue', // 'updates a venue with valid input'
];

/** Escape a string for use inside a RegExp source. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SAFE_TEST_DATABASE_PATTERNS = [/test/i, /e2e/i, /local/i];
const LOCAL_HOST_PATTERNS = [/localhost/i, /127\.0\.0\.1/i];

function canRunDestructiveTeardown(databaseName: string): boolean {
  if (SAFE_TEST_DATABASE_PATTERNS.some((pattern) => pattern.test(databaseName))) {
    return true;
  }

  return process.env.ALLOW_SHARED_E2E_DB_TEARDOWN === 'true';
}

function isRemoteGraphQlTarget(graphQlUrl: string | undefined): boolean {
  if (!graphQlUrl) {
    return false;
  }

  return !LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(graphQlUrl));
}

const teardown = async (): Promise<void> => {
  clearRuntimeContext();

  if (isRemoteGraphQlTarget(process.env.GRAPHQL_URL) && process.env.ALLOW_SHARED_E2E_DB_TEARDOWN !== 'true') {
    console.log(
      '[teardown] Skipping orphaned data cleanup for remote GraphQL target. ' +
        'Set ALLOW_SHARED_E2E_DB_TEARDOWN=true to enable shared-environment cleanup.',
    );
    return;
  }

  let mongoDbUrl: string;
  try {
    mongoDbUrl = process.env.MONGO_DB_URL ?? (await getConfigValue(SECRET_KEYS.MONGO_DB_URL));
  } catch (err) {
    console.warn('[teardown] Could not resolve MONGO_DB_URL — skipping orphaned data cleanup', err);
    return;
  }

  await mongoose.connect(mongoDbUrl);
  const db = mongoose.connection.db;
  if (!db) {
    console.warn('[teardown] MongoDB connection has no db object — skipping orphaned data cleanup');
    await mongoose.disconnect();
    return;
  }

  if (!canRunDestructiveTeardown(db.databaseName)) {
    console.warn(
      `[teardown] Refusing destructive cleanup against database "${db.databaseName}". ` +
        'Use a test-named database or set ALLOW_SHARED_E2E_DB_TEARDOWN=true for an intentional shared-environment cleanup run.',
    );
    await mongoose.disconnect();
    return;
  }

  try {
    const titlePattern = new RegExp(`^(${TEST_TITLE_PREFIXES.map(escapeRegex).join('|')})`);
    const eventsResult = await db.collection('eventseries').deleteMany({ title: { $regex: titlePattern } });
    if (eventsResult.deletedCount > 0) {
      console.log(`[teardown] Deleted ${eventsResult.deletedCount} orphaned test event(s)`);
    } else {
      console.log('[teardown] No orphaned test events found');
    }

    const venuePattern = new RegExp(`^(${TEST_VENUE_NAME_PREFIXES.map(escapeRegex).join('|')})`);
    const venuesResult = await db.collection('venues').deleteMany({ name: { $regex: venuePattern } });
    if (venuesResult.deletedCount > 0) {
      console.log(`[teardown] Deleted ${venuesResult.deletedCount} orphaned test venue(s)`);
    } else {
      console.log('[teardown] No orphaned test venues found');
    }

    const orgPattern = new RegExp(`^(${TEST_ORG_NAME_PREFIXES.map(escapeRegex).join('|')})`);
    const orgsResult = await db.collection('organizations').deleteMany({ name: { $regex: orgPattern } });
    if (orgsResult.deletedCount > 0) {
      console.log(`[teardown] Deleted ${orgsResult.deletedCount} orphaned test organization(s)`);
    } else {
      console.log('[teardown] No orphaned test organizations found');
    }

    const userPattern = new RegExp(`(${TEST_USER_EMAIL_SUFFIXES.map(escapeRegex).join('|')})$`);
    const usersResult = await db.collection('users').deleteMany({ email: { $regex: userPattern } });
    if (usersResult.deletedCount > 0) {
      console.log(`[teardown] Deleted ${usersResult.deletedCount} orphaned test user(s)`);
    } else {
      console.log('[teardown] No orphaned test users found');
    }
  } finally {
    await mongoose.disconnect();
  }
};

export default teardown;
