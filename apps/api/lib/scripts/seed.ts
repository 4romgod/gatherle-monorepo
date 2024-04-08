import {MongoDbClient} from '../clients';
import {IEvent, IUser} from '../interface';
import {EventDAO, UserDAO} from '../mongodb/dao';
import {usersMockData, eventsMockData} from '../mongodb/mockData';
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

async function seedEvents(events: Array<IEvent>) {
    for (const event of events) {
        await EventDAO.create({
            ...event,
            createdAt: undefined,
            updatedAt: undefined,
        });
    }
}

async function main() {
    await MongoDbClient.connectToDatabase(MONGO_DB_URL);
    await seedUsers(usersMockData);
    await seedEvents(eventsMockData);
    await MongoDbClient.disconnectFromDatabase();
}

main().catch((err) => {
    console.error('An error occurred while attempting to seed the database:', err);
});
