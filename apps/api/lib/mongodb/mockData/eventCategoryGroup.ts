import {CreateEventCategoryGroupInputType} from '@ntlango/commons/types';

const eventCategoryGroups: CreateEventCategoryGroupInputType[] = [
  {
    name: 'Entertainment',
    eventCategoryList: ['Concerts', 'Nightlife', 'Film & Media', 'Gaming', 'Fashion & Beauty', 'Arts & Culture'],
  },
  {
    name: 'Professional & Learning',
    eventCategoryList: ['Conferences', 'Workshops', 'Networking', 'Technology', 'Startup & Business', 'Education'],
  },
  {
    name: 'Health & Wellness',
    eventCategoryList: ['Fitness', 'Health & Wellness', 'Family & Kids', 'Religious & Spiritual'],
  },
  {
    name: 'Food & Lifestyle',
    eventCategoryList: ['Food & Drink', 'Fashion & Beauty', 'Travel & Adventure', 'Arts & Culture'],
  },
  {
    name: 'Sports & Outdoors',
    eventCategoryList: ['Sports', 'Fitness', 'Travel & Adventure'],
  },
  {
    name: 'Community & Causes',
    eventCategoryList: ['Charity & Causes', 'Religious & Spiritual', 'Family & Kids', 'Education'],
  },
];

export default eventCategoryGroups;
