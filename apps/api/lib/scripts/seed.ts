import {getConfigValue, MongoDbClient} from '@/clients';
import {
  EventCategoryDAO,
  EventCategoryGroupDAO,
  EventDAO,
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
} from '@/mongodb/mockData';
import type {EventSeedData} from '@/mongodb/mockData';
import organizationsData, {OrganizationSeedData} from '@/mongodb/mockData/organizations';
import venuesData, {VenueSeedData} from '@/mongodb/mockData/venues';
import organizationMembershipsData, {OrganizationMembershipSeed} from '@/mongodb/mockData/organizationMemberships';
import type {
  CreateEventCategoryGroupInput,
  CreateEventCategoryInput,
  CreateEventInput,
  CreateOrganizationInput,
  CreateUserInput,
  CreateVenueInput,
  EventCategory,
  Organization,
  Venue,
} from '@ntlango/commons/types';
import {SECRET_KEYS} from '@/constants';
import {ParticipantStatus, ParticipantVisibility} from '@ntlango/commons/types';
import {EventVisibility} from '@ntlango/commons/types/event';

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
  console.log('Starting to seed event category data...');
  for (const category of categories) {
    const eventCategoryResponse = await EventCategoryDAO.create(category);
    console.log(`   Created Event Category item with id: ${eventCategoryResponse.eventCategoryId}`);
  }
  console.log('Completed seeding event category data.');
}

async function seedEventCategoryGroups(eventCategoryGroupsInputList: Array<CreateEventCategoryGroupInput>, eventCategoryList: Array<EventCategory>) {
  console.log('Starting to seed event category groups data...');

  for (const groupInput of eventCategoryGroupsInputList) {
    // Replace category names with corresponding IDs
    const resolvedCategoryIds = groupInput.eventCategoryList.map((categoryName) => {
      const match = eventCategoryList.find((category) => category.name === categoryName);
      if (!match) {
        throw new Error(`Event category not found: ${categoryName}`);
      }
      return match.eventCategoryId;
    });

    const categoryGroupWithIds = {
      ...groupInput,
      eventCategoryList: resolvedCategoryIds,
    };

    await EventCategoryGroupDAO.create(categoryGroupWithIds);

    console.log(`   Seeded group: ${groupInput.name}`);
  }

  console.log('Completed seeding event category group data.');
}

async function seedUsers(users: Array<CreateUserInput>, eventCategoryIds: Array<string>) {
  console.log('Starting to seed user data...');
  for (const user of users) {
    const userResponse = await UserDAO.create({
      ...user,
      interests: getRandomUniqueItems(eventCategoryIds, 5),
    });
    console.log(`   Created User item with id: ${userResponse.userId}`);
  }
  console.log('Completed seeding user data.');
}

async function seedOrganizations(seedData: OrganizationSeedData[], ownerIds: string[]) {
  console.log('Starting to seed organization data...');
  const created: Organization[] = [];
  for (let i = 0; i < seedData.length; i++) {
    const config = seedData[i];
    const ownerId = ownerIds[i % ownerIds.length];
    const organizationInput: CreateOrganizationInput = {
      ...config,
      ownerId,
    };
    const organization = await OrganizationDAO.create(organizationInput);
    created.push(organization);
    console.log(`   Created Organization with id: ${organization.orgId}`);
  }
  console.log('Completed seeding organization data.');
  return created;
}

async function seedVenues(seedData: VenueSeedData[], organizations: Organization[]) {
  console.log('Starting to seed venue data...');
  const createdVenues: Venue[] = [];
  for (const venueSeed of seedData) {
    const organization = organizations[venueSeed.orgIndex];
    if (!organization) {
      throw new Error(`Organization not found for venue index ${venueSeed.orgIndex}`);
    }
    const {orgIndex, ...venueFields} = venueSeed;
    const venueInput: CreateVenueInput = {
      ...venueFields,
      orgId: organization.orgId,
    };
    const venue = await VenueDAO.create(venueInput);
    createdVenues.push(venue);
    console.log(`   Created Venue with id: ${venue.venueId}`);
  }
  console.log('Completed seeding venue data.');
  return createdVenues;
}

async function seedOrganizationMemberships(seedData: OrganizationMembershipSeed[], organizations: Organization[], userIds: string[]) {
  console.log('Starting to seed organization membership data...');
  for (const membership of seedData) {
    const organization = organizations[membership.orgIndex];
    if (!organization) {
      throw new Error(`Organization not found for membership orgIndex ${membership.orgIndex}`);
    }
    const userId = userIds[membership.userIndex % userIds.length];
    await OrganizationMembershipDAO.create({
      orgId: organization.orgId,
      userId,
      role: membership.role,
    });
    console.log(`   Created OrganizationMembership for user ${userId}`);
  }
  console.log('Completed seeding organization membership data.');
}

async function seedEvents(
  events: EventSeedData[],
  userIds: Array<string>,
  eventCategoryIds: Array<string>,
  organizations: Organization[],
  venues: Venue[],
) {
  console.log('Starting to seed event data...');
  for (const event of events) {
    const organization = typeof event.orgIndex === 'number' ? organizations[event.orgIndex] : undefined;
    const venue = typeof event.venueIndex === 'number' ? venues[event.venueIndex] : undefined;

    const organizerIds = getRandomUniqueItems(userIds, 2);
    const participantIds = getRandomUniqueItems(userIds, 4);
    const categorySelection =
      event.eventCategoryList && event.eventCategoryList.length
        ? event.eventCategoryList
        : getRandomUniqueItems(eventCategoryIds, 5);

    const {orgIndex, venueIndex, ...eventBase} = event;
    const eventInput: CreateEventInput = {
      ...eventBase,
      organizerList: organizerIds,
      eventCategoryList: categorySelection,
      orgId: organization?.orgId,
      venueId: venue?.venueId,
    };

    const eventResponse = await EventDAO.create(eventInput);

    for (const userId of participantIds) {
      let sharedVisibility: ParticipantVisibility;
      if (eventResponse.visibility === undefined) {
        throw new Error(`Event with id ${eventResponse.eventId} has undefined visibility. Please ensure all seed events have a visibility value set.`);
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
        console.error(`Failed to upsert participant (userId: ${userId}) for event (eventId: ${eventResponse.eventId}):`, err);
      }
    }
    console.log(`   Created Event item with id: ${eventResponse.eventId}`);
  }
  console.log('Completed seeding event data.');
}

async function main() {
  console.log('Starting to seed data into the database...');

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

  await seedEvents(eventsMockData, allUserIds, allEventCategoriesIds, createdOrganizations, createdVenues);
  console.log('Completed seeding data into the database.');
  await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
});
