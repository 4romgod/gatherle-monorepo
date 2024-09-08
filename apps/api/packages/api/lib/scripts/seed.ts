import {getConfigValue, MongoDbClient} from '@/clients';
import {EventCategoryDAO, EventDAO, UserDAO} from '@/mongodb/dao';
import {usersMockData, eventsMockData, eventCategoryData} from '@/mongodb/mockData';
import {CreateEventCategoryInputType, CreateEventInputType, CreateUserInputType} from '@/graphql/types';
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

async function seedUsers(users: Array<CreateUserInputType>) {
  console.log('Starting to seed user data...');
  for (const user of users) {
    const userResponse = await UserDAO.create(user);
    console.log(`   Created User item with id: ${userResponse.userId}`);
  }
  console.log('Completed seeding user data.');
}

async function seedEventCategories(categories: Array<CreateEventCategoryInputType>) {
  console.log('Starting to seed event category data...');
  for (const category of categories) {
    const eventCategoryResponse = await EventCategoryDAO.create(category);
    console.log(`   Created Event Category item with id: ${eventCategoryResponse.eventCategoryId}`);
  }
  console.log('Completed seeding event category data.');
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

  await seedUsers(usersMockData);
  await seedEventCategories(eventCategoryData);

  const allUserIds = (await UserDAO.readUsers()).map((user) => user.userId);
  const allEventCategoriesIds = (await EventCategoryDAO.readEventCategories()).map((category) => category.eventCategoryId!);

  await seedEvents(eventsMockData, allUserIds, allEventCategoriesIds);
  console.log('Completed seeding data into the database.');
  await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
});
