import {connect, disconnect} from 'mongoose';

let mongodbConnected = false;

class MongoDbClient {
    static async connectToDatabase(databaseUrl: string) {
        try {
            if (!mongodbConnected) {
                await connect(databaseUrl);
                mongodbConnected = true;
                console.log('MongoDB connected!');
            }
        } catch (error) {
            console.log('Failed to connect to MongoDB!');
            throw error;
        }
    }

    static async disconnectFromDatabase() {
        try {
            await disconnect();
            mongodbConnected = false;
            console.log('MongoDB disconnected!');
        } catch (error) {
            console.log('Failed to disconnect from MongoDB!');
            throw error;
        }
    }
}

export default MongoDbClient;
