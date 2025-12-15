import type { ValueNode} from 'graphql';
import {graphql, GraphQLSchema, GraphQLObjectType, GraphQLString, Kind} from 'graphql';
import {AnyType} from '@ntlango/commons/types';

describe('Custom Graphql Scalar Types', () => {
  describe('Any Type', () => {
    describe('serialize', () => {
      it('should serialize string values correctly', () => {
        const value = 'test string';
        expect(AnyType.serialize(value)).toBe(value);
      });

      it('should serialize number values correctly', () => {
        const value = 123;
        expect(AnyType.serialize(value)).toBe(value);
      });

      it('should serialize boolean values correctly', () => {
        const value = true;
        expect(AnyType.serialize(value)).toBe(value);
      });

      it('should throw error for unsupported types during serialization', () => {
        const value = {key: 'value'};
        expect(() => AnyType.serialize(value)).toThrow('AnyType can only serialize string, number, or boolean values');
      });
    });

    describe('parseValue', () => {
      it('should parse string values correctly', () => {
        const value = 'test string';
        expect(AnyType.parseValue(value)).toBe(value);
      });

      it('should parse number values correctly', () => {
        const value = 123;
        expect(AnyType.parseValue(value)).toBe(value);
      });

      it('should parse boolean values correctly', () => {
        const value = true;
        expect(AnyType.parseValue(value)).toBe(value);
      });

      it('should throw error for unsupported types during parsing value', () => {
        const value = {key: 'value'};
        expect(() => AnyType.parseValue(value)).toThrow('AnyType can only parse string, number, or boolean values');
      });
    });

    describe('parseLiteral', () => {
      it('should parse string literals correctly', () => {
        const ast: ValueNode = {kind: Kind.STRING, value: 'test'};
        expect(AnyType.parseLiteral(ast)).toBe('test');
      });

      it('should parse integer literals correctly', () => {
        const ast: ValueNode = {kind: Kind.INT, value: '123'};
        expect(AnyType.parseLiteral(ast)).toBe(123);
      });

      it('should parse float literals correctly', () => {
        const ast: ValueNode = {kind: Kind.FLOAT, value: '123.45'};
        expect(AnyType.parseLiteral(ast)).toBe(123.45);
      });

      it('should parse boolean literals correctly', () => {
        const ast: ValueNode = {kind: Kind.BOOLEAN, value: true};
        expect(AnyType.parseLiteral(ast)).toBe(true);
      });

      it('should throw error for unsupported types during parsing literal', () => {
        const ast: ValueNode = {
          kind: Kind.OBJECT,
          fields: [
            {
              kind: Kind.OBJECT_FIELD,
              name: {
                kind: Kind.NAME,
                value: 'testField',
              },
              value: {
                kind: Kind.STRING,
                value: 'testValue',
              },
            },
          ],
        };
        expect(() => AnyType.parseLiteral(ast)).toThrow('AnyType can only parse string, number, or boolean values');
      });
    });

    it('should handle GraphQL queries with AnyType scalar', async () => {
      const TestType = new GraphQLObjectType({
        name: 'TestType',
        fields: {
          anyField: {type: AnyType},
          stringField: {type: GraphQLString},
        },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            test: {
              type: TestType,
              resolve: () => ({
                anyField: 'test string',
                stringField: 'testString',
              }),
            },
          },
        }),
      });

      interface TestType {
        anyField: string | number | boolean;
        stringField: string;
      }

      interface QueryResult {
        data: {
          test: TestType;
        };
      }

      const query = `query {
                test {
                    anyField
                    stringField
                }
            }`;

      const result = await graphql({schema, source: query});
      const typedResult = result as unknown as QueryResult;
      expect(typedResult.data.test.anyField).toBe('test string');
      expect(typedResult.data.test.stringField).toBe('testString');
    });
  });
});
