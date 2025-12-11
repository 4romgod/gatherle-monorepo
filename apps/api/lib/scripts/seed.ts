import {getConfigValue, MongoDbClient} from '@/clients';
import {EventCategoryDAO, EventCategoryGroupDAO, EventDAO, UserDAO} from '@/mongodb/dao';
import {usersMockData, eventsMockData, eventCategoryMockData, eventCategoryGroupMockData} from '@/mongodb/mockData';
import {
  CreateEventCategoryGroupInputType,
  CreateEventCategoryInputType,
  CreateEventInputType,
  CreateUserInputType,
  EventCategoryType,
} from '@ntlango/commons/types';
import {SECRET_KEYS} from '@/constants';

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

async function seedEventCategories(categories: Array<CreateEventCategoryInputType>) {
  console.log('Starting to seed event category data...');
  for (const category of categories) {
    const eventCategoryResponse = await EventCategoryDAO.create(category);
    console.log(`   Created Event Category item with id: ${eventCategoryResponse.eventCategoryId}`);
  }
  console.log('Completed seeding event category data.');
}

async function seedEventCategoryGroups(eventCategoryGroupsInputList: Array<CreateEventCategoryGroupInputType>, eventCategoryList: Array<EventCategoryType>) {
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

async function seedUsers(users: Array<CreateUserInputType>, eventCategoryIds: Array<string>) {
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

async function seedEvents(events: Array<CreateEventInputType>, userIds: Array<string>, eventCategoryIds: Array<string>) {
  console.log('Starting to seed event data...');
  for (const event of events) {
    const eventResponse = await EventDAO.create({
      ...event,
      organizerList: getRandomUniqueItems(userIds, 2),
      rSVPList: getRandomUniqueItems(userIds, 2),
      eventCategoryList: getRandomUniqueItems(eventCategoryIds, 5),
    });
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

  await seedEvents(eventsMockData, allUserIds, allEventCategoriesIds);
  console.log('Completed seeding data into the database.');
  await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
});
