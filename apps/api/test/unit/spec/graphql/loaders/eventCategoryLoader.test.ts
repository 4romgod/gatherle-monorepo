import { createEventCategoryLoader } from '@/graphql/loaders';
import { EventCategory as EventCategoryModel } from '@/mongodb/models';
import type { EventCategory } from '@gatherle/commons/types';

jest.mock('@/mongodb/models', () => ({
  EventCategory: {
    find: jest.fn(),
  },
}));

describe('EventCategoryLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should batch load event categories by ID', async () => {
    const mockCategories: EventCategory[] = [
      {
        _id: 'cat1',
        eventCategoryId: 'cat1',
        name: 'Sports',
        slug: 'sports',
        iconName: 'sport',
        description: 'Sports events',
        color: '#FF0000',
      } as EventCategory,
      {
        _id: 'cat2',
        eventCategoryId: 'cat2',
        name: 'Music',
        slug: 'music',
        iconName: 'music',
        description: 'Music events',
        color: '#00FF00',
      } as EventCategory,
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockCategories),
    };

    (EventCategoryModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createEventCategoryLoader();

    // Load multiple categories
    const results = await Promise.all([loader.load('cat1'), loader.load('cat2'), loader.load('cat3')]);

    // Should make single batch query
    expect(EventCategoryModel.find).toHaveBeenCalledTimes(1);
    expect(EventCategoryModel.find).toHaveBeenCalledWith({ _id: { $in: ['cat1', 'cat2', 'cat3'] } });

    // Should return results in correct order
    expect(results[0]).toEqual(mockCategories[0]);
    expect(results[1]).toEqual(mockCategories[1]);
    expect(results[2]).toBeNull(); // cat3 not found
  });

  it('should handle empty input', async () => {
    const loader = createEventCategoryLoader();
    const results = await loader.loadMany([]);
    expect(results).toEqual([]);
  });

  it('should cache results within the same loader instance', async () => {
    const mockCategory: EventCategory = {
      _id: 'cat1',
      eventCategoryId: 'cat1',
      name: 'Sports',
      slug: 'sports',
      iconName: 'sport',
      description: 'Sports events',
      color: '#FF0000',
    } as EventCategory;

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockCategory]),
    };

    (EventCategoryModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createEventCategoryLoader();

    // Load same category twice
    await loader.load('cat1');
    await loader.load('cat1');

    // Should only query database once (cached)
    expect(EventCategoryModel.find).toHaveBeenCalledTimes(1);
  });

  it('should maintain correct order when database returns results in different order', async () => {
    const mockCategories: EventCategory[] = [
      {
        _id: 'cat2',
        eventCategoryId: 'cat2',
        name: 'Music',
        slug: 'music',
        iconName: 'music',
        description: 'Music events',
        color: '#00FF00',
      } as EventCategory,
      {
        _id: 'cat1',
        eventCategoryId: 'cat1',
        name: 'Sports',
        slug: 'sports',
        iconName: 'sport',
        description: 'Sports events',
        color: '#FF0000',
      } as EventCategory,
      {
        _id: 'cat3',
        eventCategoryId: 'cat3',
        name: 'Art',
        slug: 'art',
        iconName: 'art',
        description: 'Art events',
        color: '#0000FF',
      } as EventCategory,
    ];

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockCategories),
    };

    (EventCategoryModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createEventCategoryLoader();

    // Request in specific order
    const results = await Promise.all([loader.load('cat1'), loader.load('cat2'), loader.load('cat3')]);

    // Results should match requested order, not database return order
    expect((results[0] as Partial<EventCategory> & { _id: string })?._id).toBe('cat1');
    expect((results[1] as Partial<EventCategory> & { _id: string })?._id).toBe('cat2');
    expect((results[2] as Partial<EventCategory> & { _id: string })?._id).toBe('cat3');
  });

  it('should handle database errors gracefully', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('Database error')),
    };

    (EventCategoryModel.find as jest.Mock).mockReturnValue(mockQuery);

    const loader = createEventCategoryLoader();

    await expect(loader.load('cat1')).rejects.toThrow('Database error');
  });
});
