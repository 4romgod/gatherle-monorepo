import DataLoader from 'dataloader';
import type {User, EventCategory} from '@ntlango/commons/types';
import type {ServerContext} from '@/graphql';

/**
 * Creates a mock ServerContext with loaders for testing.
 * Loaders return null by default; override with `mockData` parameter.
 */
export const createMockContext = (
  overrides?: Partial<ServerContext>,
  mockData?: {
    users?: Map<string, User>;
    categories?: Map<string, EventCategory>;
  },
): ServerContext => {
  const userLoader = new DataLoader<string, User | null>(async (keys) => {
    return keys.map((key) => mockData?.users?.get(key) ?? null);
  });

  const categoryLoader = new DataLoader<string, EventCategory | null>(async (keys) => {
    return keys.map((key) => mockData?.categories?.get(key) ?? null);
  });

  return {
    token: undefined,
    req: undefined,
    res: undefined,
    loaders: {
      user: userLoader,
      eventCategory: categoryLoader,
    },
    ...overrides,
  };
};
