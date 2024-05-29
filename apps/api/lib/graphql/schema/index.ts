import 'reflect-metadata';
import {buildSchema} from 'type-graphql';
import {EventCategoryResolver, EventResolver, UserResolver} from '@/graphql/resolvers';
import {authChecker} from '@/utils/auth';

const createSchema = async () => {
    const schema = await buildSchema({
        resolvers: [EventCategoryResolver, EventResolver, UserResolver],
        validate: true,
        authChecker,
    });

    return schema;
};

export default createSchema;
