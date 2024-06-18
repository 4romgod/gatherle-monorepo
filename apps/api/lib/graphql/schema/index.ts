import 'reflect-metadata';
import {buildSchema} from 'type-graphql';
import {EventCategoryResolver, EventResolver, UserResolver} from '@/graphql/resolvers';
import {authChecker} from '@/utils/auth';
import {ResolveTime} from '@/utils';

const createSchema = async () => {
    const schema = await buildSchema({
        resolvers: [EventCategoryResolver, EventResolver, UserResolver],
        validate: true,
        emitSchemaFile: true,
        globalMiddlewares: [ResolveTime],
        authChecker,
    });

    return schema;
};

export default createSchema;
