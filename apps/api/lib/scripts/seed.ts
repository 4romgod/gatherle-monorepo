import { getConfigValue, MongoDbClient } from '@/clients';
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
import type { FollowSeed, IntentSeed, ActivitySeed } from '@/mongodb/mockData/social';
import type { EventSeedData } from '@/mongodb/mockData';
import type { OrganizationSeedData } from '@/mongodb/mockData/organizations';
import organizationsData from '@/mongodb/mockData/organizations';
import type { VenueSeedData } from '@/mongodb/mockData/venues';
import venuesData from '@/mongodb/mockData/venues';
import type { OrganizationMembershipSeed } from '@/mongodb/mockData/organizationMemberships';
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
  UpdateVenueInput,
  User,
  Venue,
} from '@ntlango/commons/types';
import { SECRET_KEYS } from '@/constants';
import { OrganizationRole, ParticipantStatus, ParticipantVisibility } from '@ntlango/commons/types';
import { EventVisibility } from '@ntlango/commons/types/event';
import { logger } from '@/utils/logger';

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

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedEventCategories(categories: Array<CreateEventCategoryInput>) {
  logger.info('Starting to seed event category data...');

  const existing = await EventCategoryDAO.readEventCategories();

  for (const category of categories) {
    try {
      const found = existing.find((c) => c.name === category.name);

      if (found) {
        logger.info(`   Event Category "${category.name}" already exists, skipping...`);
        continue;
      }

      const eventCategoryResponse = await EventCategoryDAO.create(category);
      logger.info(`   Created Event Category item with id: ${eventCategoryResponse.eventCategoryId}`);
    } catch (error) {
      logger.warn(`   Failed to create Event Category "${category.name}":`, { error });
    }
  }
  logger.info('Completed seeding event category data.');
}

async function seedEventCategoryGroups(
  eventCategoryGroupsInputList: Array<CreateEventCategoryGroupInput>,
  eventCategoryList: Array<EventCategory>,
) {
  logger.info('Starting to seed event category groups data...');

  const existingGroups = await EventCategoryGroupDAO.readEventCategoryGroups();

  for (const groupInput of eventCategoryGroupsInputList) {
    try {
      const found = existingGroups.find((g) => g.name === groupInput.name);
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
      logger.warn(`   Failed to create Event Category Group "${groupInput.name}":`, { error });
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
      const found = existingUsers.find((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
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
      logger.warn(`   Failed to create User "${user.email}":`, { error });
    }
  }
  logger.info('Completed seeding user data.');
}

async function seedOrganizations(seedData: OrganizationSeedData[], usersByEmail: Map<string, User>) {
  logger.info('Starting to seed organization data...');
  const created: Organization[] = [];
  const existingOrgs = await OrganizationDAO.readOrganizations();

  for (let i = 0; i < seedData.length; i++) {
    try {
      const config = seedData[i];
      const { ownerEmail, ...organizationPayload } = config;
      const ownerKey = ownerEmail.toLowerCase();
      const owner = usersByEmail.get(ownerKey);
      if (!owner) {
        logger.warn(
          `   Skipping organization "${organizationPayload.name}" because owner email "${ownerEmail}" was not found`,
        );
        continue;
      }

      // Check if organization with this name already exists
      const found = existingOrgs.find((o) => o.name === organizationPayload.name);
      let organization: Organization;
      if (found) {
        logger.info(`   Organization "${organizationPayload.name}" already exists, using existing...`);
        organization = found;
      } else {
        const organizationInput: CreateOrganizationInput = {
          ...organizationPayload,
          ownerId: owner.userId,
        };
        organization = await OrganizationDAO.create(organizationInput);
        logger.info(`   Created Organization with id: ${organization.orgId}`);
      }

      created.push(organization);
      await ensureOwnerMembershipForOrganization(organization);
    } catch (error) {
      logger.warn(`   Failed to create Organization:`, { error });
    }
  }
  logger.info('Completed seeding organization data.');
  return created;
}

async function ensureOwnerMembershipForOrganization(organization: Organization) {
  try {
    const membershipExists = await OrganizationMembershipDAO.readMembershipByOrgIdAndUser(
      organization.orgId,
      organization.ownerId,
    );
    if (membershipExists) {
      return;
    }

    await OrganizationMembershipDAO.create({
      orgId: organization.orgId,
      userId: organization.ownerId,
      role: OrganizationRole.Owner,
    });
    logger.info(`   Ensured owner membership for organization "${organization.name}" (${organization.orgId})`);
  } catch (error) {
    logger.warn(
      `   Failed to ensure owner membership for organization "${organization.name}" (${organization.orgId})`,
      { error },
    );
  }
}

function buildLocationFromVenue(venue: Venue): CreateEventInput['location'] {
  const address = venue.address
    ? {
        street: venue.address.street ?? '',
        city: venue.address.city,
        state: venue.address.region ?? '',
        zipCode: venue.address.postalCode ?? '',
        country: venue.address.country,
      }
    : undefined;

  const location: CreateEventInput['location'] = {
    locationType: 'venue',
  };

  if (address) {
    location.address = address;
  }

  if (venue.geo) {
    location.coordinates = {
      latitude: venue.geo.latitude,
      longitude: venue.geo.longitude,
    };
  }

  return location;
}

async function seedVenues(seedData: VenueSeedData[], organizations: Organization[]) {
  logger.info('Starting to seed venue data...');
  const createdVenues: Venue[] = [];
  const existingVenues = await VenueDAO.readVenues();

  for (const venueSeed of seedData) {
    try {
      const { orgSlug, slug, ...venueFields } = venueSeed;
      const organization = organizations.find((org) => org.slug === orgSlug);
      if (!organization) {
        throw new Error(`Organization not found for venue slug ${orgSlug}`);
      }

      // Check if venue with this name already exists
      const found = existingVenues.find((v) => v.name === venueSeed.name);
      if (found) {
        const updateInput: UpdateVenueInput = {
          venueId: found.venueId,
          ...venueFields,
          orgId: organization.orgId,
          slug,
        };
        const updatedVenue = await VenueDAO.update(updateInput);
        createdVenues.push(updatedVenue);
        logger.info(`   Updated Venue "${venueSeed.name}" with id: ${updatedVenue.venueId}`);
        continue;
      }

      const venueInput: CreateVenueInput = {
        ...venueFields,
        orgId: organization.orgId,
        slug,
      };
      const venue = await VenueDAO.create(venueInput);
      createdVenues.push(venue);
      logger.info(`   Created Venue with id: ${venue.venueId}`);
    } catch (error) {
      logger.warn(`   Failed to create Venue:`, { error });
    }
  }
  logger.info('Completed seeding venue data.');
  return createdVenues;
}

async function seedOrganizationMemberships(
  seedData: OrganizationMembershipSeed[],
  organizations: Organization[],
  usersByEmail: Map<string, User>,
) {
  logger.info('Starting to seed organization membership data...');

  for (const membership of seedData) {
    try {
      const organization = organizations.find((org) => org.slug === membership.orgSlug);
      if (!organization) {
        throw new Error(`Organization not found for slug ${membership.orgSlug}`);
      }
      const user = usersByEmail.get(membership.userEmail.toLowerCase());
      if (!user) {
        throw new Error(`User not found for email ${membership.userEmail}`);
      }

      // Check if membership already exists by querying for this specific org
      const existingMemberships = await OrganizationMembershipDAO.readMembershipsByOrgId(organization.orgId);
      const found = existingMemberships.find((m) => m.userId === user.userId);

      if (found) {
        logger.info(
          `   OrganizationMembership for user ${user.userId} in org ${organization.orgId} already exists, skipping...`,
        );
        continue;
      }

      await OrganizationMembershipDAO.create({
        orgId: organization.orgId,
        userId: user.userId,
        role: membership.role,
      });
      logger.info(`   Created OrganizationMembership for user ${user.userId}`);
    } catch (error) {
      logger.warn(`   Failed to create OrganizationMembership:`, { error });
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
      const found = existingEvents.find((e) => e.title === event.title);
      if (found) {
        logger.info(`   Event "${event.title}" already exists, using existing...`);
        createdEvents.push(found);
        continue;
      }

      const organization = event.orgSlug ? organizations.find((org) => org.slug === event.orgSlug) : undefined;
      const venue = event.venueSlug ? venues.find((venueItem) => venueItem.slug === event.venueSlug) : undefined;

      const organizerIds = getRandomUniqueItems(userIds, 2);
      const categorySelection =
        event.eventCategories && event.eventCategories.length
          ? event.eventCategories
          : getRandomUniqueItems(eventCategoryIds, 5);

      const { orgSlug: _orgSlug, venueSlug: _venueSlug, ...eventBase } = event;
      const locationFromVenue = venue ? buildLocationFromVenue(venue) : undefined;
      const resolvedLocation = locationFromVenue ?? eventBase.location;

      if (!resolvedLocation) {
        throw new Error(`Event "${event.title}" is missing a location`);
      }
      const eventInput: CreateEventInput = {
        ...eventBase,
        location: resolvedLocation,
        organizers: organizerIds.map((userId, index) => ({
          user: userId,
          role: index === 0 ? 'Host' : 'CoHost',
        })),
        eventCategories: categorySelection,
        orgId: organization?.orgId,
        venueId: venue?.venueId,
      };

      const eventResponse = await EventDAO.create(eventInput);

      logger.info(`   Created Event item with id: ${eventResponse.eventId}`);
      createdEvents.push(eventResponse);
    } catch (error) {
      logger.warn(`   Failed to create Event:`, { error });
    }
  }
  logger.info('Completed seeding event data.');
  return createdEvents;
}

async function seedFollows(seedData: FollowSeed[], usersByEmail: Map<string, User>, organizations: Organization[]) {
  logger.info('Starting to seed follow edges...');
  for (const seed of seedData) {
    const followerUser = usersByEmail.get(seed.followerEmail.toLowerCase());
    const targetUser = seed.targetUserEmail ? usersByEmail.get(seed.targetUserEmail.toLowerCase()) : undefined;
    const targetOrganization = seed.targetOrgSlug
      ? organizations.find((org) => org.slug === seed.targetOrgSlug)
      : undefined;
    const targetId = targetUser?.userId ?? targetOrganization?.orgId;

    if (!followerUser || !targetId) {
      logger.warn('Skipping follow seed due to missing IDs', seed);
      continue;
    }

    await FollowDAO.upsert({
      followerUserId: followerUser.userId,
      targetType: seed.targetType,
      targetId,
      approvalStatus: seed.approvalStatus,
    });
  }
  logger.info('Completed seeding follow edges.');
}

async function seedIntents(seedData: IntentSeed[], usersByEmail: Map<string, User>, events: Event[]) {
  logger.info('Starting to seed intents...');
  for (const seed of seedData) {
    const user = usersByEmail.get(seed.userEmail.toLowerCase());
    const event = events.find((candidate) => candidate.title === seed.eventTitle);
    if (!user || !event?.eventId) {
      logger.warn('Skipping intent seed due to missing IDs', seed);
      continue;
    }

    await IntentDAO.upsert({
      userId: user.userId,
      eventId: event.eventId,
      status: seed.status,
      visibility: seed.visibility,
      source: seed.source,
      metadata: seed.metadata,
    });
  }
  logger.info('Completed seeding intents.');
}

async function seedActivities(seedData: ActivitySeed[], usersByEmail: Map<string, User>, events: Event[]) {
  logger.info('Starting to seed activity feed...');
  for (const seed of seedData) {
    const actor = usersByEmail.get(seed.actorEmail.toLowerCase());
    let objectId: string | undefined;
    if (seed.objectRef === 'event') {
      objectId = events.find((event) => event.title === seed.objectIdentifier)?.eventId;
    } else {
      objectId = usersByEmail.get(seed.objectIdentifier.toLowerCase())?.userId;
    }
    if (!actor || !objectId) {
      logger.warn('Skipping activity seed due to missing IDs', seed);
      continue;
    }

    let metadata = seed.metadata;
    if (!metadata && seed.objectRef === 'event') {
      metadata = { eventTitle: events.find((event) => event.title === seed.objectIdentifier)?.title };
    }
    let targetId: string | undefined;
    if (seed.targetIdentifier) {
      if (seed.targetRef === 'event') {
        targetId = events.find((event) => event.title === seed.targetIdentifier)?.eventId;
      } else if (seed.targetRef === 'user') {
        targetId = usersByEmail.get(seed.targetIdentifier.toLowerCase())?.userId;
      }
    }

    await ActivityDAO.create({
      actorId: actor.userId,
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

  async function seedEventParticipants(events: Event[], userIds: string[]) {
    if (events.length === 0 || userIds.length === 0) {
      return;
    }

    logger.info('Starting to seed event participants (RSVPs)...');

    const maxRsvpsPerEvent = Math.min(userIds.length, 12);
    const batchSize = 10;
    for (const event of events) {
      if (!event.eventId) {
        continue;
      }

      const rsvpCount = getRandomInt(0, maxRsvpsPerEvent);
      const selectedUserIds = getRandomUniqueItems(userIds, rsvpCount);
      if (event.visibility === undefined) {
        logger.warn('Event visibility is undefined during RSVP seed; defaulting to Public', {
          eventId: event.eventId,
        });
      }
      const sharedVisibility =
        event.visibility === undefined || event.visibility === EventVisibility.Public
          ? ParticipantVisibility.Public
          : ParticipantVisibility.Followers;
      const participantInputs = selectedUserIds.map((userId) => ({
        eventId: event.eventId,
        userId,
        status: Math.random() < 0.7 ? ParticipantStatus.Going : ParticipantStatus.Interested,
        sharedVisibility,
      }));

      for (let i = 0; i < participantInputs.length; i += batchSize) {
        const batch = participantInputs.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (input) => {
            try {
              await EventParticipantDAO.upsert(input);
            } catch (error) {
              logger.warn('Failed to upsert event participant during seed', {
                eventId: input.eventId,
                userId: input.userId,
                error,
              });
            }
          }),
        );
      }
    }

    logger.info('Completed seeding event participants.');
  }
  await seedEventCategories(eventCategoryMockData);
  const allEventCategories = await EventCategoryDAO.readEventCategories();
  const allEventCategoriesIds = allEventCategories.map((category) => category.eventCategoryId!);

  await seedEventCategoryGroups(eventCategoryGroupMockData, allEventCategories);

  await seedUsers(usersMockData, allEventCategoriesIds);
  const allUsers = await UserDAO.readUsers();
  const userByEmail = new Map<string, User>();
  allUsers.forEach((user) => {
    if (user.email) {
      userByEmail.set(user.email.toLowerCase(), user);
    }
  });
  const allUserIds = allUsers.map((user) => user.userId);

  const createdOrganizations = await seedOrganizations(organizationsData, userByEmail);
  const createdVenues = await seedVenues(venuesData, createdOrganizations);
  await seedOrganizationMemberships(organizationMembershipsData, createdOrganizations, userByEmail);

  const createdEvents = await seedEvents(
    eventsMockData,
    allUserIds,
    allEventCategoriesIds,
    createdOrganizations,
    createdVenues,
  );

  await seedEventParticipants(createdEvents, allUserIds);

  await seedFollows(followSeedData, userByEmail, createdOrganizations);
  await seedIntents(intentSeedData, userByEmail, createdEvents);
  await seedActivities(activitySeedData, userByEmail, createdEvents);
  logger.info('Completed seeding data into the database.');
  await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
  logger.error('An error occurred while attempting to seed the database:', err);
});
