import type { CreateEventCategoryInput } from '@gatherle/commons/server/types';

export const eventCategories: CreateEventCategoryInput[] = [
  {
    name: 'Live Music',
    iconName: 'MusicalNoteIcon',
    description: 'Concerts, DJ sets, live sessions, choir nights, and music festivals.',
    color: '#E11D48',
  },
  {
    name: 'Nightlife & Parties',
    iconName: 'SparklesIcon',
    description: 'Club nights, day parties, rooftop sessions, and late-night social experiences.',
    color: '#7C3AED',
  },
  {
    name: 'Food & Markets',
    iconName: 'CakeIcon',
    description: 'Food festivals, wine tastings, markets, brunches, and curated pop-ups.',
    color: '#F97316',
  },
  {
    name: 'Arts & Theatre',
    iconName: 'PaintBrushIcon',
    description: 'Exhibitions, theatre, spoken word, dance, and cultural showcases.',
    color: '#EC4899',
  },
  {
    name: 'Comedy',
    iconName: 'SparklesIcon',
    description: 'Stand-up, improv, variety nights, and laugh-out-loud live entertainment.',
    color: '#F59E0B',
  },
  {
    name: 'Networking & Socials',
    iconName: 'UserGroupIcon',
    description: 'Mixers, meetups, singles socials, community circles, and connection-led gatherings.',
    color: '#0EA5E9',
  },
  {
    name: 'Business & Entrepreneurship',
    iconName: 'BriefcaseIcon',
    description: 'Founder meetups, pitch nights, strategy sessions, and business growth events.',
    color: '#1D4ED8',
  },
  {
    name: 'Tech & Innovation',
    iconName: 'CpuChipIcon',
    description: 'Developer meetups, product demos, startup tech gatherings, and innovation showcases.',
    color: '#2563EB',
  },
  {
    name: 'Workshops & Classes',
    iconName: 'AcademicCapIcon',
    description: 'Hands-on sessions for creative, professional, and practical skill building.',
    color: '#7C3AED',
  },
  {
    name: 'Conferences',
    iconName: 'PresentationChartBarIcon',
    description: 'Summits, expos, forums, and industry-led professional gatherings.',
    color: '#0F766E',
  },
  {
    name: 'Sports',
    iconName: 'TrophyIcon',
    description: 'Live matches, tournaments, fan parks, and sports community events.',
    color: '#059669',
  },
  {
    name: 'Fitness & Wellness',
    iconName: 'HeartIcon',
    description: 'Runs, yoga, wellness mornings, bootcamps, and recovery-focused events.',
    color: '#DC2626',
  },
  {
    name: 'Family & Kids',
    iconName: 'UserGroupIcon',
    description: 'Kid-friendly outings, school-holiday activities, and family day experiences.',
    color: '#F97316',
  },
  {
    name: 'Community & Causes',
    iconName: 'HandRaisedIcon',
    description: 'Fundraisers, volunteering, charity drives, and civic community gatherings.',
    color: '#16A34A',
  },
  {
    name: 'Faith & Spirituality',
    iconName: 'HeartIcon',
    description: 'Church conferences, worship nights, spiritual retreats, and faith-led gatherings.',
    color: '#9333EA',
  },
  {
    name: 'Outdoors & Adventure',
    iconName: 'GlobeAmericasIcon',
    description: 'Hikes, nature escapes, trail gatherings, and outdoor social adventures.',
    color: '#15803D',
  },
];

export default eventCategories;
