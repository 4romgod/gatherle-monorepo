import {getConfigValue, MongoDbClient} from '@/clients';
import {
  ActivityDAO,
  EventCategoryDAO,
  EventCategoryGroupDAO,
  EventDAO,
  FollowDAO,
  IntentDAO,
  OrganizationDAO,
  OrganizationMembershipDAO,
  UserDAO,
  EventParticipantDAO,
  VenueDAO,
} from '@/mongodb/dao';
import {
  usersMockData,
  eventsMockData,
  eventCategoryMockData,
  eventCategoryGroupMockData,
  followSeedData,
  intentSeedData,
  activitySeedData,
} from '@/mongodb/mockData';
import type {FollowSeed, IntentSeed, ActivitySeed} from '@/mongodb/mockData/social';
import type {EventSeedData} from '@/mongodb/mockData';
import type {OrganizationSeedData} from '@/mongodb/mockData/organizations';
import organizationsData from '@/mongodb/mockData/organizations';
import type {VenueSeedData} from '@/mongodb/mockData/venues';
import venuesData from '@/mongodb/mockData/venues';
import type {OrganizationMembershipSeed} from '@/mongodb/mockData/organizationMemberships';
import organizationMembershipsData from '@/mongodb/mockData/organizationMemberships';
import type {
  CreateEventCategoryGroupInput,
  CreateEventCategoryInput,
  CreateEventInput,
  CreateOrganizationInput,
  CreateUserInput,
  CreateVenueInput,
  Event,
  EventCategory,
  Organization,
  Venue,
} from '@ntlango/commons/types';
import {SECRET_KEYS} from '@/constants';
import {ParticipantStatus, ParticipantVisibility} from '@ntlango/commons/types';
import {EventVisibility} from '@ntlango/commons/types/event';
import {logger} from '@/utils/logger';

function getRandomUniqueItems(array: Array<string>, count: number) {
  const copyArray = [...array];
  for (let i = copyArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copyArray[i], copyArray[j]] = [copyArray[j], copyArray[i]];
  }

  const randomItems: Array<string> = [];
  let index = 0;
  while (randomItems.length < count && index < copyArray.length) {
    if (!randomItems.includes(copyArray[index])) {
      randomItems.push(copyArray[index]);
    }
    index++;
  }
  return randomItems;
}

async function seedEventCategories(categories: Array<CreateEventCategoryInput>) {
  logger.info('Starting to seed event category data...');
  
  const existing = await EventCategoryDAO.readEventCategories();
  
  for (const category of categories) {
    try {
      const found = existing.find(c => c.name === category.name);
      
      if (found) {
        logger.info(`   Event Category "${category.name}" already exists, skipping...`);
        continue;
      }
      
      const eventCategoryResponse = await EventCategoryDAO.create(category);
      logger.info(`   Created Event Category item with id: ${eventCategoryResponse.eventCategoryId}`);
    } catch (error) {
      logger.warn(`   Failed to create Event Category "${category.name}":`, error);
    }
  }
  logger.info('Completed seeding event category data.');
}

async function seedEventCategoryGroups(eventCategoryGroupsInputList: Array<CreateEventCategoryGroupInput>, eventCategoryList: Array<EventCategory>) {
  logger.info('Starting to seed event category groups data...');

  const existingGroups = await EventCategoryGroupDAO.readEventCategoryGroups();

  for (const groupInput of eventCategoryGroupsInputList) {
    try {
      const found = existingGroups.find(g => g.name === groupInput.name);
      if (found) {
        logger.info(`   Event Category Group "${groupInput.name}" already exists, skipping...`);
        continue;
      }

      const resolvedCategoryIds = groupInput.eventCategories.map((categoryName) => {
        const match = eventCategoryList.find((category) => category.name === categoryName);
        if (!match) {
          throw new Error(`Event category not found: ${categoryName}`);
        }
        return match.eventCategoryId;
      });

      const categoryGroupWithIds = {
        ...groupInput,
        eventCategories: resolvedCategoryIds,
      };

      await EventCategoryGroupDAO.create(categoryGroupWithIds);

      logger.info(`   Seeded group: ${groupInput.name}`);
    } catch (error) {
      logger.warn(`   Failed to create Event Category Group "${groupInput.name}":`, error);
    }
  }

  logger.info('Completed seeding event category group data.');
}

async function seedUsers(users: Array<CreateUserInput>, eventCategoryIds: Array<string>) {
  logger.info('Starting to seed user data...');
  const existingUsers = await UserDAO.readUsers();
  
  for (const user of users) {
    try {
      // Check if user with this email already exists (case-insensitive)
      const found = existingUsers.find(u => u.email?.toLowerCase() === user.email?.toLowerCase());
      if (found) {
        logger.info(`   User with email "${user.email}" already exists, skipping...`);
        continue;
      }

      const userResponse = await UserDAO.create({
        ...user,
        interests: getRandomUniqueItems(eventCategoryIds, 5),
      });
      logger.info(`   Created User item with id: ${userResponse.userId}`);
    } catch (error) {
      logger.warn(`   Failed to create User "${user.email}":`, error);
    }
  }
  logger.info('Completed seeding user data.');
}

async function seedOrganizations(seedData: OrganizationSeedData[], ownerIds: string[]) {
  logger.info('Starting to seed organization data...');
  const created: Organization[] = [];
  const existingOrgs = await OrganizationDAO.readOrganizations();
  
  for (let i = 0; i < seedData.length; i++) {
    try {
      const config = seedData[i];
      const ownerId = ownerIds[i % ownerIds.length];
      
      // Check if organization with this name already exists
      const found = existingOrgs.find(o => o.name === config.name);
      if (found) {
        logger.info(`   Organization "${config.name}" already exists, using existing...`);
        created.push(found);
        continue;
      }

      const organizationInput: CreateOrganizationInput = {
        ...config,
        ownerId,
      };
      const organization = await OrganizationDAO.create(organizationInput);
      created.push(organization);
      logger.info(`   Created Organization with id: ${organization.orgId}`);
    } catch (error) {
      logger.warn(`   Failed to create Organization:`, error);
    }
  }
  logger.info('Completed seeding organization data.');
  return created;
}

async function seedVenues(seedData: VenueSeedData[], organizations: Organization[]) {
  logger.info('Starting to seed venue data...');
  const createdVenues: Venue[] = [];
  const existingVenues = await VenueDAO.readVenues();
  
  for (const venueSeed of seedData) {
    try {
      const organization = organizations[venueSeed.orgIndex];
      if (!organization) {
        throw new Error(`Organization not found for venue index ${venueSeed.orgIndex}`);
      }
      
      // Check if venue with this name already exists
      const found = existingVenues.find(v => v.name === venueSeed.name);
      if (found) {
        logger.info(`   Venue "${venueSeed.name}" already exists, using existing...`);
        createdVenues.push(found);
        continue;
      }

      const {orgIndex, ...venueFields} = venueSeed;
      const venueInput: CreateVenueInput = {
        ...venueFields,
        orgId: organization.orgId,
      };
      const venue = await VenueDAO.create(venueInput);
      createdVenues.push(venue);
      logger.info(`   Created Venue with id: ${venue.venueId}`);
    } catch (error) {
      logger.warn(`   Failed to create Venue:`, error);
    }
  }
  logger.info('Completed seeding venue data.');
  return createdVenues;
}

async function seedOrganizationMemberships(seedData: OrganizationMembershipSeed[], organizations: Organization[], userIds: string[]) {
  logger.info('Starting to seed organization membership data...');
  
  for (const membership of seedData) {
    try {
      const organization = organizations[membership.orgIndex];
      if (!organization) {
        throw new Error(`Organization not found for membership orgIndex ${membership.orgIndex}`);
      }
      const userId = userIds[membership.userIndex % userIds.length];
      
      // Check if membership already exists by querying for this specific org
      const existingMemberships = await OrganizationMembershipDAO.readMembershipsByOrgId(organization.orgId);
      const found = existingMemberships.find(m => m.userId === userId);
      
      if (found) {
        logger.info(`   OrganizationMembership for user ${userId} in org ${organization.orgId} already exists, skipping...`);
        continue;
      }
      
      await OrganizationMembershipDAO.create({
        orgId: organization.orgId,
        userId,
        role: membership.role,
      });
      logger.info(`   Created OrganizationMembership for user ${userId}`);
    } catch (error) {
      logger.warn(`   Failed to create OrganizationMembership:`, error);
    }
  }
  logger.info('Completed seeding organization membership data.');
}

async function seedEvents(
  events: EventSeedData[],
  userIds: Array<string>,
  eventCategoryIds: Array<string>,
  organizations: Organization[],
  venues: Venue[],
): Promise<Event[]> {
  logger.info('Starting to seed event data...');
  const createdEvents: Event[] = [];
  const existingEvents = await EventDAO.readEvents();
  
  for (const event of events) {
    try {
      // Check if event with this title already exists
      const found = existingEvents.find(e => e.title === event.title);
      if (found) {
        logger.info(`   Event "${event.title}" already exists, using existing...`);
        createdEvents.push(found);
        continue;
      }

      const organization = typeof event.orgIndex === 'number' ? organizations[event.orgIndex] : undefined;
      const venue = typeof event.venueIndex === 'number' ? venues[event.venueIndex] : undefined;

      const organizerIds = getRandomUniqueItems(userIds, 2);
      const participantCount = Math.floor(Math.random() * 5) + 2; // Random number between 2 and 6
      const participantIds = getRandomUniqueItems(userIds, participantCount);
      const categorySelection =
        event.eventCategories && event.eventCategories.length ? event.eventCategories : getRandomUniqueItems(eventCategoryIds, 5);

      const {orgIndex, venueIndex, ...eventBase} = event;
      const eventInput: CreateEventInput = {
        ...eventBase,
        organizers: organizerIds.map((userId, index) => ({
          user: userId,
          role: index === 0 ? 'Host' : 'CoHost',
        })),
        eventCategories: categorySelection,
        orgId: organization?.orgId,
        venueId: venue?.venueId,
      };

      const eventResponse = await EventDAO.create(eventInput);

      for (const userId of participantIds) {
        let sharedVisibility: ParticipantVisibility;
        if (eventResponse.visibility === undefined) {
          throw new Error(
            `Event with id ${eventResponse.eventId} has undefined visibility. Please ensure all seed events have a visibility value set.`,
          );
        } else if (eventResponse.visibility === EventVisibility.Public) {
          sharedVisibility = ParticipantVisibility.Public;
        } else {
          sharedVisibility = ParticipantVisibility.Followers;
        }
        try {
          await EventParticipantDAO.upsert({
            eventId: eventResponse.eventId,
            userId,
            status: ParticipantStatus.Going,
            sharedVisibility,
          });
        } catch (err) {
          logger.error(`Failed to upsert participant (userId: ${userId}) for event (eventId: ${eventResponse.eventId}):`, err);
        }
      }
      logger.info(`   Created Event item with id: ${eventResponse.eventId}`);
      createdEvents.push(eventResponse);
    } catch (error) {
      logger.warn(`   Failed to create Event:`, error);
    }
  }
  logger.info('Completed seeding event data.');
  return createdEvents;
}

async function seedFollows(seedData: FollowSeed[], userIds: string[], organizations: Organization[]) {
  logger.info('Starting to seed follow edges...');
  for (const seed of seedData) {
    const followerUserId = userIds[seed.followerIndex];
    const targetId =
      seed.targetUserIndex !== undefined
        ? userIds[seed.targetUserIndex]
        : seed.targetOrgIndex !== undefined
          ? organizations[seed.targetOrgIndex]?.orgId
          : undefined;

    if (!followerUserId || !targetId) {
      logger.warn('Skipping follow seed due to missing IDs', seed);
      continue;
    }

    await FollowDAO.upsert({
      followerUserId,
      targetType: seed.targetType,
      targetId,
      status: seed.status,
    });
  }
  logger.info('Completed seeding follow edges.');
}

async function seedIntents(seedData: IntentSeed[], userIds: string[], events: Event[]) {
  logger.info('Starting to seed intents...');
  for (const seed of seedData) {
    const userId = userIds[seed.userIndex];
    const event = events[seed.eventIndex];
    if (!userId || !event?.eventId) {
      logger.warn('Skipping intent seed due to missing IDs', seed);
      continue;
    }

    await IntentDAO.upsert({
      userId,
      eventId: event.eventId,
      status: seed.status,
      visibility: seed.visibility,
      source: seed.source,
      metadata: seed.metadata,
    });
  }
  logger.info('Completed seeding intents.');
}

async function seedActivities(seedData: ActivitySeed[], userIds: string[], events: Event[]) {
  logger.info('Starting to seed activity feed...');
  for (const seed of seedData) {
    const actorId = userIds[seed.actorIndex];
    const objectId = seed.objectRef === 'event' ? events[seed.objectIndex]?.eventId : userIds[seed.objectIndex];
    if (!actorId || !objectId) {
      logger.warn('Skipping activity seed due to missing IDs', seed);
      continue;
    }

    let metadata = seed.metadata;
    if (!metadata && seed.objectRef === 'event') {
      metadata = {eventTitle: events[seed.objectIndex]?.title};
    }
    let targetId: string | undefined;
    if (seed.targetIndex !== undefined) {
      targetId = seed.targetRef === 'event' ? events[seed.targetIndex]?.eventId : userIds[seed.targetIndex];
    }

    await ActivityDAO.create({
      actorId,
      verb: seed.verb,
      objectType: seed.objectType,
      objectId,
      targetType: seed.targetType,
      targetId,
      visibility: seed.visibility,
      eventAt: seed.eventAt ? new Date(seed.eventAt) : undefined,
      metadata,
    });
  }
  logger.info('Completed seeding activity feed.');
}

async function main() {
  logger.info('Starting to seed data into the database...');

  const secret = await getConfigValue(SECRET_KEYS.MONGO_DB_URL);
  await MongoDbClient.connectToDatabase(secret);

  await seedEventCategories(eventCategoryMockData);
  const allEventCategories = await EventCategoryDAO.readEventCategories();
  const allEventCategoriesIds = allEventCategories.map((category) => category.eventCategoryId!);

  await seedEventCategoryGroups(eventCategoryGroupMockData, allEventCategories);

  await seedUsers(usersMockData, allEventCategoriesIds);
  const allUserIds = (await UserDAO.readUsers()).map((user) => user.userId);

  const createdOrganizations = await seedOrganizations(organizationsData, allUserIds);
  const createdVenues = await seedVenues(venuesData, createdOrganizations);
  await seedOrganizationMemberships(organizationMembershipsData, createdOrganizations, allUserIds);

  const createdEvents = await seedEvents(eventsMockData, allUserIds, allEventCategoriesIds, createdOrganizations, createdVenues);

  await seedFollows(followSeedData, allUserIds, createdOrganizations);
  await seedIntents(intentSeedData, allUserIds, createdEvents);
  await seedActivities(activitySeedData, allUserIds, createdEvents);
  logger.info('Completed seeding data into the database.');
  await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
  logger.error('An error occurred while attempting to seed the database:', err);
});
