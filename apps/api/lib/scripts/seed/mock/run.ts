import {
  ActivityDAO,
  EventOccurrenceDAO,
  EventOccurrenceParticipantDAO,
  EventSeriesDAO,
  FollowDAO,
  OrganizationDAO,
  OrganizationMembershipDAO,
  UserDAO,
  VenueDAO,
} from '@/mongodb/dao';
import {
  usersMockData,
  eventSeriesMockData,
  followSeedData,
  activitySeedData,
  MOCK_USERS_PASSWORD_PROMPT_LABEL,
  readMockUsersPasswordFromEnv,
} from '@/mongodb/data/mock';
import type { FollowSeed, ActivitySeed } from '@/mongodb/data/mock/social';
import type { EventSeriesSeedData, MockUserSeedData } from '@/mongodb/data/mock';
import type { OrganizationSeedData } from '@/mongodb/data/mock/organizations';
import organizationsData from '@/mongodb/data/mock/organizations';
import type { VenueSeedData } from '@/mongodb/data/mock/venues';
import venuesData from '@/mongodb/data/mock/venues';
import type { OrganizationMembershipSeed } from '@/mongodb/data/mock/organizationMemberships';
import organizationMembershipsData from '@/mongodb/data/mock/organizationMemberships';
import type {
  CreateEventInput,
  CreateOrganizationInput,
  CreateVenueInput,
  EventSeries,
  Organization,
  UpdateVenueInput,
  User,
  Venue,
} from '@gatherle/commons/types';
import { ParticipantStatus, ParticipantVisibility } from '@gatherle/commons/types';
import { EventVisibility } from '@gatherle/commons/types/eventSeries';
import { logger } from '@/utils/logger';
import EventSeriesService from '@/services/eventSeries';
import { readSeededCatalogOrThrow } from '../catalog/run';
import { ensureOwnerMembershipForOrganization } from '../shared/organizations';
import { promptForHiddenValue } from '../shared/prompt';
import { getRandomInt, getRandomUniqueItems } from '../shared/random';
import { markSeedUserVerified } from '../shared/users';

async function resolveMockUsersPassword(): Promise<string> {
  const envPassword = readMockUsersPasswordFromEnv();
  if (envPassword) {
    return envPassword;
  }

  const password = await promptForHiddenValue(`${MOCK_USERS_PASSWORD_PROMPT_LABEL}: `);
  if (!password.trim()) {
    throw new Error('Password is required for mock users.');
  }

  return password;
}

async function seedUsers(users: Array<MockUserSeedData>, eventCategoryIds: Array<string>, password: string) {
  logger.info('Starting to seed user data...');
  const existingUsers = await UserDAO.readUsers();

  for (const user of users) {
    try {
      // Check if user with this email already exists (case-insensitive)
      const found = existingUsers.find((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
      if (found) {
        if (!found.emailVerified) {
          await markSeedUserVerified(found.userId, user.email);
        }
        logger.info(`   User with email "${user.email}" already exists, skipping...`);
        continue;
      }

      const userResponse = await UserDAO.create({
        ...user,
        password,
        interests: getRandomUniqueItems(eventCategoryIds, 5),
      });
      await markSeedUserVerified(userResponse.userId, user.email);
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
  events: EventSeriesSeedData[],
  userIds: Array<string>,
  eventCategoryIds: Array<string>,
  organizations: Organization[],
  venues: Venue[],
): Promise<EventSeries[]> {
  logger.info('Starting to seed event data...');
  const createdEvents: EventSeries[] = [];
  const existingEvents = await EventSeriesDAO.readEvents();

  for (const event of events) {
    try {
      // Check if event with this title already exists
      const found = existingEvents.find((e) => e.title === event.title);
      if (found) {
        logger.info(`   EventSeries "${event.title}" already exists, using existing...`);
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
        throw new Error(`EventSeries "${event.title}" is missing a location`);
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

      const eventResponse = await EventSeriesService.create(eventInput);

      logger.info(`   Created EventSeries item with id: ${eventResponse.eventId}`);
      createdEvents.push(eventResponse);
    } catch (error) {
      logger.warn(`   Failed to create EventSeries:`, { error });
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

async function seedActivities(seedData: ActivitySeed[], usersByEmail: Map<string, User>, events: EventSeries[]) {
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

export async function runMockDataSeed() {
  logger.info('Starting to seed data into the database...');

  async function seedEventParticipants(events: EventSeries[], userIds: string[]) {
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
        logger.warn('EventSeries visibility is undefined during RSVP seed; defaulting to Public', {
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
              const occurrence = await EventOccurrenceDAO.readFirstByEventSeriesId(input.eventId);
              if (!occurrence) {
                logger.warn('Skipping seeded RSVP because no occurrence exists for event series', {
                  eventId: input.eventId,
                  userId: input.userId,
                });
                return;
              }

              await EventOccurrenceParticipantDAO.upsert({
                occurrenceId: occurrence.occurrenceId,
                userId: input.userId,
                status: input.status,
                sharedVisibility: input.sharedVisibility,
              });
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
  const allEventCategories = await readSeededCatalogOrThrow();
  const allEventCategoriesIds = allEventCategories.map((category) => category.eventCategoryId!);
  const mockUsersPassword = await resolveMockUsersPassword();

  await seedUsers(usersMockData, allEventCategoriesIds, mockUsersPassword);
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
    eventSeriesMockData,
    allUserIds,
    allEventCategoriesIds,
    createdOrganizations,
    createdVenues,
  );

  await seedEventParticipants(createdEvents, allUserIds);

  await seedFollows(followSeedData, userByEmail, createdOrganizations);
  await seedActivities(activitySeedData, userByEmail, createdEvents);
  logger.info('Completed seeding data into the database.');
}
