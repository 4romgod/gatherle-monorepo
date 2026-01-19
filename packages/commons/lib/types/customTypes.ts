import type { ValueNode } from 'graphql';
import { GraphQLScalarType, Kind } from 'graphql';

import { COMMON_DESCRIPTIONS } from '../constants';

const ensurePrimitiveArray = (value: unknown): Array<string | number | boolean> => {
  if (!Array.isArray(value)) {
    throw new Error('Value is not an array');
  }
  if (value.every((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
    return value;
  }
  throw new Error('AnyType array can only contain string, number, or boolean values');
};

export const AnyType = new GraphQLScalarType({
  name: 'AnyType',
  description: COMMON_DESCRIPTIONS.TYPE_ANY,
  serialize(value: unknown): string | number | boolean | Array<string | number | boolean> {
    if (Array.isArray(value)) {
      return ensurePrimitiveArray(value);
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    throw new Error('AnyType can only serialize string, number, boolean, or array of primitive values');
  },
  parseValue(value: unknown): string | number | boolean | Array<string | number | boolean> {
    if (Array.isArray(value)) {
      return ensurePrimitiveArray(value);
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    throw new Error('AnyType can only parse string, number, boolean, or array of primitive values');
  },
  parseLiteral(ast: ValueNode): string | number | boolean | Array<string | number | boolean> {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value === true;
      case Kind.LIST:
        return ast.values.map((value) => {
          switch (value.kind) {
            case Kind.STRING:
              return value.value;
            case Kind.INT:
              return parseInt(value.value, 10);
            case Kind.FLOAT:
              return parseFloat(value.value);
            case Kind.BOOLEAN:
              return value.value === true;
            case Kind.LIST:
              throw new Error('AnyType does not support nested arrays');
            default:
              throw new Error('AnyType list can only contain string, number, or boolean values');
          }
        });
      default:
        throw new Error('AnyType can only parse string, number, boolean, or array values');
    }
  },
});
