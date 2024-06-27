import 'reflect-metadata';
import {buildSchemaSync} from 'type-graphql';
import {EventCategoryResolver, EventResolver, UserResolver} from '@/graphql/resolvers';
import {authChecker} from '@/utils/auth';
import {ResolveTime} from '@/utils';

const createSchema = () => {
    const schema = buildSchemaSync({
        resolvers: [EventCategoryResolver, EventResolver, UserResolver],
        validate: true,
        emitSchemaFile: false,
        globalMiddlewares: [ResolveTime],
        authChecker,
    });

    return schema;
};

export default createSchema;
