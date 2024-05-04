import 'reflect-metadata';
import {buildSchema} from 'type-graphql';
import {EventCategoryResolver, EventResolver, UserResolver} from '../resolvers';

const createSchema = async () => {
    const schema = await buildSchema({
        resolvers: [EventCategoryResolver, EventResolver, UserResolver],
    });

    return schema;
};

export default createSchema;
