import {MongoDbClient} from '../clients';
import {IEvent, IEventCategory, IUser} from '../interface';
import {EventCategoryDAO, EventDAO, UserDAO} from '../mongodb/dao';
import {usersMockData, eventsMockData, eventCategoryData} from '../mongodb/mockData';
import {MONGO_DB_URL} from '../constants';

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

async function seedUsers(users: Array<IUser>) {
    for (const user of users) {
        await UserDAO.create({
            ...user,
            password: 'randomPassword',
            createdAt: undefined,
            updatedAt: undefined,
        });
    }
}

async function seedEventCategories(categories: Array<IEventCategory>) {
    for (const category of categories) {
        await EventCategoryDAO.create({
            ...category,
            createdAt: undefined,
            updatedAt: undefined,
        });
    }
}

async function seedEvents(events: Array<IEvent>, userIds: Array<string>, eventCategoryIds: Array<string>) {
    for (const event of events) {
        await EventDAO.create({
            ...event,
            organizers: getRandomUniqueItems(userIds, 2),
            rSVPs: getRandomUniqueItems(userIds, 2),
            eventCategory: getRandomUniqueItems(eventCategoryIds, 5),
            createdAt: undefined,
            updatedAt: undefined,
        });
    }
}

async function main() {
    await MongoDbClient.connectToDatabase(MONGO_DB_URL);
    await seedUsers(usersMockData);
    await seedEventCategories(eventCategoryData);

    const allUserIds = (await UserDAO.readUsers()).map((user) => user.id!);
    const allEventCategoriesIds = (await EventCategoryDAO.readEventCategories()).map((category) => category.id!);

    await seedEvents(eventsMockData, allUserIds, allEventCategoriesIds);
    await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
    console.error('An error occurred while attempting to seed the database:', err);
});
