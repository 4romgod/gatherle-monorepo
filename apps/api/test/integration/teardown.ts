import {MongoDbClient} from '@/clients';
import {getConfigValue} from '@/clients/AWS/secretsManager';
import {SECRET_KEYS} from '@/constants';
import {
  User,
  Event,
  EventCategory,
  EventCategoryGroup,
  EventParticipant,
  Organization,
  OrganizationMembership,
  Venue,
  Follow,
  Intent,
  Activity,
} from '@/mongodb/models';

/**
 * Centralized test data prefixes for consistent cleanup across all tests.
 * When adding new test fixtures, add the prefix here to ensure proper cleanup.
 */
const TEST_DATA_PREFIXES = {
  EMAIL: ['test-', 'social-', 'event@', 'updated-', 'organization-admin@', 'venue-', 'membership-', 'eventCategory-'],
  USERNAME: ['test', 'social', 'event', 'venue', 'membership', 'eventCategory', 'organization'],
  ORGANIZATION: ['test-', 'integration-', 'create-org', 'update-org'],
  EVENT: ['test', 'social feed event', 'social-feed', 'integration'],
  CATEGORY: ['test', 'integration', 'social feed', 'social-feed'],
  VENUE: ['test', 'integration'],
} as const;

/**
 * Builds a case-insensitive regex from an array of prefixes.
 */
const buildPrefixRegex = (prefixes: readonly string[]): RegExp => {
  const escaped = prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^(${escaped.join('|')})`, 'i');
};

/**
 * Global teardown for integration tests.
 * Cleans up test data using patterns that identify test-created records.
 * This catches orphaned data from failed tests or incomplete per-test cleanup.
 */
const teardown = async () => {
  console.log('\nTearing down integration tests - cleaning up test data...');

  try {
    const mongoDbUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
    await MongoDbClient.connectToDatabase(mongoDbUrl);

    // Clean up test users (emails/usernames with test patterns)
    const userResult = await User.deleteMany({
      $or: [
        {email: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.EMAIL)}},
        {username: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.USERNAME)}},
      ],
    });
    if (userResult.deletedCount > 0) {
      console.log(`  Cleaned up ${userResult.deletedCount} test users`);
    }

    // Clean up test organizations
    const orgResult = await Organization.deleteMany({
      $or: [
        {name: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.ORGANIZATION)}},
        {slug: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.ORGANIZATION)}},
      ],
    });
    if (orgResult.deletedCount > 0) {
      console.log(`  Cleaned up ${orgResult.deletedCount} test organizations`);
    }

    // Clean up test events
    const eventResult = await Event.deleteMany({
      $or: [
        {title: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.EVENT)}},
        {slug: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.EVENT)}},
      ],
    });
    if (eventResult.deletedCount > 0) {
      console.log(`  Cleaned up ${eventResult.deletedCount} test events`);
    }

    // Clean up test event categories
    const categoryResult = await EventCategory.deleteMany({
      $or: [
        {name: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.CATEGORY)}},
        {slug: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.CATEGORY)}},
      ],
    });
    if (categoryResult.deletedCount > 0) {
      console.log(`  Cleaned up ${categoryResult.deletedCount} test event categories`);
    }

    // Clean up test event category groups
    const groupResult = await EventCategoryGroup.deleteMany({
      name: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.VENUE)},
    });
    if (groupResult.deletedCount > 0) {
      console.log(`  Cleaned up ${groupResult.deletedCount} test event category groups`);
    }

    // Clean up test venues
    const venueResult = await Venue.deleteMany({
      $or: [
        {name: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.VENUE)}},
        {slug: {$regex: buildPrefixRegex(TEST_DATA_PREFIXES.VENUE)}},
      ],
    });
    if (venueResult.deletedCount > 0) {
      console.log(`  Cleaned up ${venueResult.deletedCount} test venues`);
    }

    // Clean up test event participants (orphaned by event/user deletion)
    const participantResult = await EventParticipant.deleteMany({});
    if (participantResult.deletedCount > 0) {
      console.log(`  Cleaned up ${participantResult.deletedCount} test event participants`);
    }

    // Clean up test organization memberships (orphaned by org/user deletion)
    const membershipResult = await OrganizationMembership.deleteMany({});
    if (membershipResult.deletedCount > 0) {
      console.log(`  Cleaned up ${membershipResult.deletedCount} test organization memberships`);
    }

    // Clean up all follows (test data only - no production follows in test DB)
    const followResult = await Follow.deleteMany({});
    if (followResult.deletedCount > 0) {
      console.log(`  Cleaned up ${followResult.deletedCount} test follows`);
    }

    // Clean up all intents (test data only)
    const intentResult = await Intent.deleteMany({});
    if (intentResult.deletedCount > 0) {
      console.log(`  Cleaned up ${intentResult.deletedCount} test intents`);
    }

    // Clean up all activities (test data only)
    const activityResult = await Activity.deleteMany({});
    if (activityResult.deletedCount > 0) {
      console.log(`  Cleaned up ${activityResult.deletedCount} test activities`);
    }

    await MongoDbClient.disconnectFromDatabase();
    console.log('Done tearing down integration tests!');
  } catch (error) {
    console.error('Error during teardown:', error);
    // Don't throw - allow Jest to complete even if cleanup fails
  }
};

export default teardown;
