import {MongoDbClient} from '../clients';
import {IEvent, IEventCategory, IUser} from '../interface';
import {EventCategoryDAO, EventDAO, UserDAO} from '../mongodb/dao';
import {usersMockData, eventsMockData, eventCategoryData} from '../mongodb/mockData';
import {MONGO_DB_URL} from '../constants';

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
    const getRandomIndexToX = (x: number) => Math.floor(Math.random() * x);
    for (const event of events) {
        await EventDAO.create({
            ...event,
            organizers: [userIds.at(getRandomIndexToX(userIds.length))!, userIds.at(getRandomIndexToX(userIds.length))!],
            rSVPs: [userIds.at(getRandomIndexToX(userIds.length))!, userIds.at(getRandomIndexToX(userIds.length))!],
            eventCategory: [
                eventCategoryIds.at(getRandomIndexToX(eventCategoryIds.length))!,
                eventCategoryIds.at(getRandomIndexToX(eventCategoryIds.length))!,
                eventCategoryIds.at(getRandomIndexToX(eventCategoryIds.length))!,
            ],
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
