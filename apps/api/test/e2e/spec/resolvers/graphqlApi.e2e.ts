import { readFileSync } from 'fs';
import { resolve } from 'path';
import request from 'supertest';
import { SortOrderInput } from '@gatherle/commons/types';
import { testUserSystemUser } from '@/mongodb/data/system';
import { ERROR_MESSAGES } from '@/validation';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';

const mobileDiscoveryQuerySource = readFileSync(
  resolve(__dirname, '../../../../../../apps/mobile/data/graphql/query/Discovery/query.ts'),
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
const extractFieldSelection = (query: string, fieldName: string): string => {
  const fieldStart = query.indexOf(`${fieldName}(options: $options)`);

  if (fieldStart === -1) {
    throw new Error(`Unable to find ${fieldName} in mobile discovery query source.`);
  }

  const openingBrace = query.indexOf('{', fieldStart);

  if (openingBrace === -1) {
    throw new Error(`Unable to find opening brace for ${fieldName} in mobile discovery query source.`);
  }

  let depth = 1;
  let cursor = openingBrace + 1;

  while (cursor < query.length && depth > 0) {
    const char = query[cursor];

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }

    cursor += 1;
  }

  if (depth !== 0) {
    throw new Error(`Unable to extract ${fieldName} selection set from mobile discovery query source.`);
  }

  return query.slice(openingBrace + 1, cursor - 1);
};

const getEventsFeedOccurrenceSelection = extractFieldSelection(getEventsFeedQuery, 'readEventOccurrences');
const inflatedHomeDiscoveryQuery = getHomeDiscoveryQuery.replace(
  '    readEventCategories {',
  `    overflowA: readEventOccurrences(options: $trendingOptions) {${getEventsFeedOccurrenceSelection}
    }
    overflowB: readEventOccurrences(options: $trendingOptions) {${getEventsFeedOccurrenceSelection}
    }
    overflowC: readEventOccurrences(options: $trendingOptions) {${getEventsFeedOccurrenceSelection}
    }
    overflowD: readEventOccurrences(options: $trendingOptions) {${getEventsFeedOccurrenceSelection}
    }
    readEventCategories {`,
);
const tooDeepNonIntrospectionQuery = `
  query SyntheticQueryGuardDepthProbe {
    readEvents(options: { pagination: { limit: 1 } }) {
      representativeOccurrence {
        eventSeries {
          representativeOccurrence {
            eventSeries {
              representativeOccurrence {
                eventSeries {
                  representativeOccurrence {
                    eventSeries {
                      representativeOccurrence {
                        eventSeries {
                          representativeOccurrence {
                            eventSeries {
                              representativeOccurrence {
                                eventSeries {
                                  representativeOccurrence {
                                    occurrenceId
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
  }
`;

const buildMobileOccurrenceDateRange = (fromDate: Date = new Date()) => {
  const startDate = new Date(fromDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 12);
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
      query: 'query SyntheticInvalidGraphqlSyntax { __typename ',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].extensions.code).toBe('GRAPHQL_PARSE_FAILED');
    expect(response.body.errors[0].message).toBe(ERROR_MESSAGES.INVALID_QUERY);
  });

  it('returns a generic client-safe message for validation failures', async () => {
    const response = await request(url).post('').send({
      query: 'query SyntheticInvalidGraphqlValidation { doesNotExist }',
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
    const response = await request(url).post('').send({
      query: tooDeepNonIntrospectionQuery,
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
        query SyntheticQueryGuardComplexityProbe {
          readUserByUsername(username: "${testUserSystemUser.username}") {
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
              sort: [{ field: 'startAt', order: SortOrderInput.asc }],
              pagination: { limit: 10 },
            },
            trendingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'rsvpCount', order: SortOrderInput.desc }],
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
              sort: [{ field: 'startAt', order: SortOrderInput.asc }],
              pagination: { limit: 10 },
            },
            trendingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'rsvpCount', order: SortOrderInput.desc }],
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
              sort: [{ field: 'startAt', order: SortOrderInput.asc }],
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
          query: inflatedHomeDiscoveryQuery,
          variables: {
            upcomingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'startAt', order: SortOrderInput.asc }],
              pagination: { limit: 50 },
            },
            trendingOptions: {
              dateRange: buildMobileOccurrenceDateRange(),
              sort: [{ field: 'rsvpCount', order: SortOrderInput.desc }],
              pagination: { limit: 50 },
            },
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(response.body.errors[0].message).toContain('maximum allowed complexity');
    });
  });

  describe('readMomentById query', () => {
    it('returns null for a non-existent moment ID as an anonymous caller', async () => {
      const response = await request(url).post('').send({
        query: `query { readMomentById(momentId: "00000000-0000-0000-0000-000000000000") { momentId } }`,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.readMomentById).toBeNull();
    });

    it('returns null for a non-existent moment ID as an authenticated caller', async () => {
      const seededUsers = getSeededTestUsers();
      const userWithToken = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
      const response = await request(url).post('').set('Authorization', `Bearer ${userWithToken.token}`).send({
        query: `query { readMomentById(momentId: "00000000-0000-0000-0000-000000000000") { momentId } }`,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.readMomentById).toBeNull();
    });
  });
});
