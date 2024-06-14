import {GraphQLScalarType} from 'graphql';

export const AnyType = new GraphQLScalarType({
    name: 'AnyType',
    description: 'Type can be anything',
    serialize(value: unknown): any {
        return value;
    },
    parseValue(value: unknown): any {
        return value;
    },
    parseLiteral(ast): any {
        return ast;
    },
});
