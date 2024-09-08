import {GraphQLScalarType, Kind, ValueNode} from 'graphql';
import {COMMON_DESCRIPTIONS} from '@/constants';

export const AnyType = new GraphQLScalarType({
  name: 'AnyType',
  description: COMMON_DESCRIPTIONS.TYPE_ANY,
  serialize(value: unknown): string | number | boolean {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    throw new Error('AnyType can only serialize string, number, or boolean values');
  },
  parseValue(value: unknown): string | number | boolean {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    throw new Error('AnyType can only parse string, number, or boolean values');
  },
  parseLiteral(ast: ValueNode): string | number | boolean {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value === true;
      default:
        throw new Error('AnyType can only parse string, number, or boolean values');
    }
  },
});
