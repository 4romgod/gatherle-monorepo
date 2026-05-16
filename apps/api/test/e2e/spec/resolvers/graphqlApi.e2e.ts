import request from 'supertest';
import { testUserSeedUser } from '@/mongodb/mockData';
import { ERROR_MESSAGES } from '@/validation';

describe('GraphQL API hardening', () => {
  const url = process.env.GRAPHQL_URL!;

  it('returns a generic client-safe message for parse failures', async () => {
    const response = await request(url).post('').send({
      query: 'query Broken { __typename ',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions.code).toBe('GRAPHQL_PARSE_FAILED');
    expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_QUERY);
  });

  it('returns a generic client-safe message for validation failures', async () => {
    const response = await request(url).post('').send({
      query: 'query InvalidField { doesNotExist }',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_QUERY);
  });

  it('returns a generic client-safe message for operation resolution failures', async () => {
    const response = await request(url).post('').send({
      query: 'query One { __typename } query Two { __typename }',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions.code).toBe('OPERATION_RESOLUTION_FAILURE');
    expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_QUERY);
  });

  it('rejects excessively deep queries before resolver execution', async () => {
    const response = await request(url)
      .post('')
      .send({
        query: `
        query TooDeep {
          __schema {
            queryType {
              fields {
                type {
                  ofType {
                    ofType {
                      ofType {
                        ofType {
                          ofType {
                            ofType {
                              ofType {
                                ofType {
                                  ofType {
                                    ofType {
                                      ofType {
                                        name
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(response.body.errors[0].message).toContain('maximum allowed depth');
  });

  it('rejects excessively complex queries before resolver execution', async () => {
    const aliasedFields = Array.from({ length: 301 }, (_, index) => `field${index}: username`).join('\n');
    const response = await request(url)
      .post('')
      .send({
        query: `
        query TooComplex {
          readUserByUsername(username: "${testUserSeedUser.username}") {
            ${aliasedFields}
          }
        }
      `,
      });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(response.body.errors[0].message).toContain('maximum allowed complexity');
  });
});
