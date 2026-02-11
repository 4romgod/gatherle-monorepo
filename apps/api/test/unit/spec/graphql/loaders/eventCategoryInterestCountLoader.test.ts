import { createEventCategoryInterestCountLoader } from '@/graphql/loaders';
import { UserDAO } from '@/mongodb/dao';

jest.mock('@/mongodb/dao', () => ({
  UserDAO: {
    countByInterestCategoryIds: jest.fn(),
  },
}));

describe('EventCategoryInterestCountLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should batch load interest counts by category ID', async () => {
    (UserDAO.countByInterestCategoryIds as jest.Mock).mockResolvedValue(
      new Map([
        ['cat1', 12],
        ['cat2', 3],
      ]),
    );

    const loader = createEventCategoryInterestCountLoader();

    const results = await Promise.all([loader.load('cat1'), loader.load('cat2'), loader.load('cat3')]);

    expect(UserDAO.countByInterestCategoryIds).toHaveBeenCalledTimes(1);
    expect(UserDAO.countByInterestCategoryIds).toHaveBeenCalledWith(['cat1', 'cat2', 'cat3']);
    expect(results).toEqual([12, 3, 0]);
  });

  it('should cache results within the same loader instance', async () => {
    (UserDAO.countByInterestCategoryIds as jest.Mock).mockResolvedValue(new Map([['cat1', 7]]));

    const loader = createEventCategoryInterestCountLoader();

    await loader.load('cat1');
    await loader.load('cat1');

    expect(UserDAO.countByInterestCategoryIds).toHaveBeenCalledTimes(1);
  });

  it('should handle DAO errors', async () => {
    (UserDAO.countByInterestCategoryIds as jest.Mock).mockRejectedValue(new Error('DAO error'));

    const loader = createEventCategoryInterestCountLoader();

    await expect(loader.load('cat1')).rejects.toThrow('DAO error');
  });
});
