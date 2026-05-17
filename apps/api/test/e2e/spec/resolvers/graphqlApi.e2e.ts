import { readFileSync } from 'fs';
import { resolve } from 'path';
import request from 'supertest';
import { testUserSeedUser } from '@/mongodb/mockData';
import { ERROR_MESSAGES } from '@/validation';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';

const mobileDiscoveryQuerySource = readFileSync(
  resolve(__dirname, '../../../../../../mobile/data/graphql/query/Discovery/query.ts'),
  'utf8',
);

const extractTaggedQuery = (source: string, operationName: string): string => {
  const blocks = [...source.matchAll(/graphql\(`([\s\S]*?)`\)/g)];
  const block = blocks.find((entry) => entry[1]?.includes(`query ${operationName}`))?.[1];

  if (!block) {
    throw new Error(`Unable to find operation ${operationName} in mobile discovery query source.`);
  }

  return block;
};

const getHomeDiscoveryQuery = extractTaggedQuery(mobileDiscoveryQuerySource, 'GetHomeDiscovery');
const getEventsFeedQuery = extractTaggedQuery(mobileDiscoveryQuerySource, 'GetEventsFeed');

const buildMobileOccurrenceDateRange = (fromDate: Date = new Date()) => {
  const startDate = new Date(fromDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 6);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

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
    const aliasedFields = Array.from({ length: 401 }, (_, index) => `field${index}: username`).join('\n');
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

  describe('shipped mobile discovery operations', () => {
    it('allows the shipped GetHomeDiscovery query for anonymous callers with the real mobile variables', async () => {
      const response = await request(url)
        .post('')
        .send({
          query: getHomeDiscoveryQuery,
          variables: {
            upcomingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'startAt', order: 'Asc' }],
              pagination: { limit: 10 },
            },
            trendingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'rsvpCount', order: 'Desc' }],
              pagination: { limit: 18 },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.upcoming)).toBe(true);
      expect(Array.isArray(response.body.data.trending)).toBe(true);
      expect(Array.isArray(response.body.data.readEventCategories)).toBe(true);
      expect(Array.isArray(response.body.data.readOrganizations)).toBe(true);
    });

    it('allows the shipped GetHomeDiscovery query for authenticated callers', async () => {
      const seededUsers = getSeededTestUsers();
      const actor = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + actor.token)
        .send({
          query: getHomeDiscoveryQuery,
          variables: {
            upcomingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'startAt', order: 'Asc' }],
              pagination: { limit: 10 },
            },
            trendingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'rsvpCount', order: 'Desc' }],
              pagination: { limit: 18 },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.upcoming)).toBe(true);
      expect(Array.isArray(response.body.data.trending)).toBe(true);
    });

    it('allows the shipped GetEventsFeed query with the real mobile variables', async () => {
      const response = await request(url)
        .post('')
        .send({
          query: getEventsFeedQuery,
          variables: {
            options: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'startAt', order: 'Asc' }],
              pagination: { limit: 40 },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(Array.isArray(response.body.data.readEventOccurrences)).toBe(true);
    });

    it('rejects an inflated GetHomeDiscovery query before resolver execution', async () => {
      const response = await request(url)
        .post('')
        .send({
          query: getHomeDiscoveryQuery,
          variables: {
            upcomingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'startAt', order: 'Asc' }],
              pagination: { limit: 50 },
            },
            trendingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'rsvpCount', order: 'Desc' }],
              pagination: { limit: 50 },
            },
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(response.body.errors[0].message).toContain('maximum allowed complexity');
    });
  });
});
