/**
 * Migration script to geocode existing events that have addresses but no coordinates.
 * 
 * Usage: npx ts-node -r tsconfig-paths/register lib/scripts/geocode-events.ts
 * 
 * Note: This script respects Nominatim's rate limit (1 request/second).
 */

import {getConfigValue, MongoDbClient} from '@/clients';
import {Event as EventModel} from '@/mongodb/models';
import {geocodeAddress} from '@/utils/geocode';
import {logger} from '@/utils/logger';
import {SECRET_KEYS} from '@/constants';

const TARGET_INTERVAL_MS = 1100; // Target 1.1 seconds between request starts to respect Nominatim rate limit

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

async function geocodeExistingEvents() {
  logger.info('Starting geocoding migration for existing events...');

  const mongoDbUrl = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(mongoDbUrl);
  logger.info('Connected to MongoDB');

  try {
    // Find all events with venue location that have address but no coordinates
    const events = await EventModel.find({
      'location.locationType': 'venue',
      'location.address': {$exists: true},
      $or: [
        {'location.coordinates': {$exists: false}},
        {'location.coordinates.latitude': {$exists: false}},
        {'location.coordinates.longitude': {$exists: false}},
      ],
    }).exec();

    logger.info(`Found ${events.length} events to geocode`);
    
    // Show estimated time
    const estimatedMs = events.length * TARGET_INTERVAL_MS;
    logger.info(`Estimated time: ${formatDuration(estimatedMs)} (at ~${TARGET_INTERVAL_MS}ms per request)`);
    logger.info('');

    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const address = event.location?.address;
      const requestStartTime = Date.now();
      
      // Calculate progress and ETA
      const progress = ((i + 1) / events.length * 100).toFixed(1);
      const elapsed = Date.now() - startTime;
      const avgTimePerEvent = i > 0 ? elapsed / i : TARGET_INTERVAL_MS;
      const remainingEvents = events.length - i - 1;
      const eta = formatDuration(remainingEvents * avgTimePerEvent);
      
      logger.info(`[${i + 1}/${events.length}] (${progress}% | ETA: ${eta}) Processing: "${event.title}"`);
      logger.info(`  Address: ${address?.city}, ${address?.state}, ${address?.country}`);

      try {
        // Geocode the address directly
        const coordinates = await geocodeAddress({
          street: address?.street,
          city: address?.city,
          state: address?.state,
          zipCode: address?.zipCode,
          country: address?.country,
        });

        if (coordinates) {
          // Update the event in the database
          await EventModel.updateOne(
            {_id: event._id},
            {$set: {'location.coordinates': coordinates}}
          );
          
          logger.info(`  ✓ Geocoded to: ${coordinates.latitude}, ${coordinates.longitude}`);
          successCount++;
        } else {
          logger.warn(`  ✗ Could not geocode address`);
          failCount++;
        }
      } catch (error) {
        logger.error(`  ✗ Error geocoding event:`, error);
        failCount++;
      }

      // Respect rate limit: sleep only for remaining time to reach target interval
      // If request took 500ms and target is 1100ms, sleep for 600ms
      if (i < events.length - 1) {
        const requestDuration = Date.now() - requestStartTime;
        const remainingDelay = Math.max(0, TARGET_INTERVAL_MS - requestDuration);
        if (remainingDelay > 0) {
          await sleep(remainingDelay);
        }
      }
    }

    logger.info('');
    logger.info('=== Geocoding Migration Complete ===');
    logger.info(`  Successful: ${successCount}`);
    logger.info(`  Failed: ${failCount}`);
    logger.info(`  Total: ${events.length}`);
    logger.info(`  Duration: ${formatDuration(Date.now() - startTime)}`);
  } finally {
    await MongoDbClient.disconnectFromDatabase();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the migration
geocodeExistingEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
