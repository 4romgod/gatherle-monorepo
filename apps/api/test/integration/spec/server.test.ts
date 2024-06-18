import {Express} from 'express';
import {ServerContext, createGraphQlServer} from '@/server';
import {ApolloServer} from '@apollo/server';
import request from 'supertest';
import {API_DOMAIN, GRAPHQL_API_PATH} from '@/constants';
import {Server} from 'http';

// https://www.apollographql.com/docs/apollo-server/testing/testing/
describe('Server', () => {
    let expressApp: Express;
    let apolloServer: ApolloServer<ServerContext>;
    let httpServer: Server;
    const TEST_PORT = 1000;
    const url = `${API_DOMAIN}:${TEST_PORT}${GRAPHQL_API_PATH}`;

    beforeAll(() => {
        console.log('starting server.test.ts');

        const initialSetup = async () => {
            const createServerResults = await createGraphQlServer({port: TEST_PORT});
            expressApp = createServerResults.expressApp;
            apolloServer = createServerResults.apolloServer;
            httpServer = createServerResults.httpServer;
        };
        return initialSetup();
    });

    afterAll(() => {
        const terminateServer = async () => {
            apolloServer.stop();
            httpServer.close();
        };
        return terminateServer();
    });

    /**
     * user tries calling an invalid operation (expect GRAPHQL_VALIDATION_FAILED) (this doesn't fit here)
     * text: '{"errors":[{"message":"Syntax Error: Expected \\"$\\", found \\")\\".","locations":[{"line":1,"column":24}],"extensions":{"code":"GRAPHQL_PARSE_FAILED"}}]}\n',
     * text: '{"errors":[{"message":"GraphQL operations must contain a non-empty `query` or a `persistedQuery` extension.","extensions":{"code":"BAD_REQUEST"}}]}\n',
     */
    describe('Negative', () => {
        describe('Validation', () => {
            it('should throw GRAPHQL_VALIDATION_FAILED when user tries calling an invalid operation', async () => {
                const invalidQuery = {
                    query: `mutation SomeInvalidQuery($input: input) {
                        someInvalidQuery(input: $input) {
                            id
                        }
                    }`,
                    variables: {},
                };
                const response = await request(url).post('').send(invalidQuery);
                expect(response.status).toBe(400);
                expect(response.body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
            });
        });

        describe('Parsing', () => {
            it('should throw GRAPHQL_PARSE_FAILED when GraphQL operation string contains a syntax error (no query fields)', async () => {
                const malformedQuery = {
                    query: `mutation SomeInvalidQuery($input: input) {
                        someInvalidQuery(input: $input) {}
                    }`,
                    variables: {},
                };
                const response = await request(url).post('').send(malformedQuery);
                expect(response.status).toBe(400);
                expect(response.body.errors[0].extensions.code).toBe('GRAPHQL_PARSE_FAILED');
            });
        });

        // describe('Validation against schema', () => {
        //     it('should throw BAD_USER_INPUT when GraphQL operation includes an invalid value for a field argument', async () => {
        //         const queryWithInvalidValue = 'query { user(id: "invalid") { name } }'; // Invalid value for "id" field argument
        //         const response = await request(url).post('').send({ query: queryWithInvalidValue });
        //         expect(response.status).toBe(400);
        //         expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
        //     });
        // });

        // describe('Operation resolution', () => {
        //     it('should throw OPERATION_RESOLUTION_FAILURE when request contains multiple named operations but no operationName specified', async () => {
        //         const queryWithMultipleOperations = 'query Operation1 { user { name } } query Operation2 { user { id } }'; // Multiple named operations without specifying operationName
        //         const response = await request(url).post('').send({ query: queryWithMultipleOperations });
        //         expect(response.status).toBe(400);
        //         expect(response.body.errors[0].extensions.code).toBe('OPERATION_RESOLUTION_FAILURE');
        //     });
        // });

        // TODO work on persisted queries
        // describe('Persisted queries', () => {
        //     it('should throw PERSISTED_QUERY_NOT_FOUND when client sends the hash of a query string but the query was not found in the APQ cache', async () => {
        //         const persistedQueryHash = 'abcdef123456';
        //         const response = await request(url).post('').send({ extensions: { persistedQuery: { sha256Hash: persistedQueryHash } } });
        //         console.log('response', response);
        //         expect(response.status).toBe(400);
        //         expect(response.body.errors[0].extensions.code).toBe('PERSISTED_QUERY_NOT_FOUND');
        //     });

        //     it('should throw PERSISTED_QUERY_NOT_SUPPORTED when client sends the hash of a query string but the server has disabled APQ', async () => {
        //         const persistedQueryHash = 'abcdef123456';
        //         const response = await request(url).post('').send({ extensions: { persistedQuery: { sha256Hash: persistedQueryHash } } });
        //         expect(response.status).toBe(400);
        //         expect(response.body.errors[0].extensions.code).toBe('PERSISTED_QUERY_NOT_SUPPORTED');
        //     });
        // });
    });
});
