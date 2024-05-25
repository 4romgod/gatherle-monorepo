import {MongoDbClient} from '../clients';
import {EventCategoryDAO, EventDAO, UserDAO} from '../mongodb/dao';
import {usersMockData, eventsMockData, eventCategoryData} from '../mongodb/mockData';
import {MONGO_DB_URL} from '../constants';
import {CreateEventCategoryInputType, CreateEventInputType, CreateUserInputType} from '../graphql/types';

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
        console.log(`   Created User item with id: ${userResponse.id}`);
    }
    console.log('Completed seeding user data.');
}

async function seedEventCategories(categories: Array<CreateEventCategoryInputType>) {
    console.log('Starting to seed event category data...');
    for (const category of categories) {
        const eventCategoryResponse = await EventCategoryDAO.create(category);
        console.log(`   Created Event Category item with id: ${eventCategoryResponse.id}`);
    }
    console.log('Completed seeding event category data.');
}

async function seedEvents(events: Array<CreateEventInputType>, userIds: Array<string>, eventCategoryIds: Array<string>) {
    console.log('Starting to seed event data...');
    for (const event of events) {
        const eventResponse = await EventDAO.create({
            ...event,
            organizers: getRandomUniqueItems(userIds, 2),
            rSVPs: getRandomUniqueItems(userIds, 2),
            eventCategory: getRandomUniqueItems(eventCategoryIds, 5),
        });
        console.log(`   Created Event item with id: ${eventResponse.id}`);
    }
    console.log('Completed seeding event data.');
}

async function main() {
    console.log('Starting to seed data into the database...');
    await MongoDbClient.connectToDatabase(MONGO_DB_URL);
    await seedUsers(usersMockData);
    await seedEventCategories(eventCategoryData);

    const allUserIds = (await UserDAO.readUsers()).map((user) => user.id!);
    const allEventCategoriesIds = (await EventCategoryDAO.readEventCategories()).map((category) => category.id!);

    await seedEvents(eventsMockData, allUserIds, allEventCategoriesIds);
    console.log('Completed seeding data into the database.');
    await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
    console.error('An error occurred while attempting to seed the database:', err);
});
