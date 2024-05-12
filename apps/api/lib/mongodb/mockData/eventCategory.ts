import {CreateEventCategoryInputType} from '../../graphql/types';

export const eventCategories: CreateEventCategoryInputType[] = [
    {
        slug: 'arts',
        name: 'Arts',
        iconName: 'PaintBrushIcon',
        description: 'Artistic and creative events',
        color: '#FFC0CB',
    },
    {
        slug: 'music',
        name: 'Music',
        iconName: 'MusicalNoteIcon',
        description: 'Music concerts, performances, and festivals',
        color: '#FFD700',
    },
    {
        slug: 'technology',
        name: 'Technology',
        iconName: 'CpuChipIcon',
        description: 'Events related to technology and innovation',
        color: '#00BFFF',
    },
    {
        slug: 'health',
        name: 'Health',
        iconName: 'HeartIcon',
        description: 'Health and wellness workshops and activities',
        color: '#FF6347',
    },
    {
        slug: 'fitness',
        name: 'Fitness',
        iconName: 'DumbbellIcon',
        description: 'Fitness classes, workouts, and challenges',
        color: '#FFA07A',
    },
    {
        slug: 'food',
        name: 'Food',
        iconName: 'CakeIcon',
        description: 'Food festivals, cooking classes, and culinary events',
        color: '#8A2BE2',
    },
    {
        slug: 'drinks',
        name: 'Drinks',
        iconName: 'WineGlassIcon',
        description: 'Events focused on beverages, wine tastings, and cocktails',
        color: '#00CED1',
    },
    {
        slug: 'travel',
        name: 'Travel',
        iconName: 'GlobeAmericasIcon',
        description: 'Travel-related events, adventure trips, and tours',
        color: '#32CD32',
    },
    {
        slug: 'concert',
        name: 'Concert',
        iconName: 'MusicIcon',
        description: 'Live music performances and concerts',
        color: '#FF69B4',
    },
    {
        slug: 'conference',
        name: 'Conference',
        iconName: 'PresentationChartBarIcon',
        description: 'Professional conferences, summits, and conventions',
        color: '#4682B4',
    },
    {
        slug: 'networking',
        name: 'Networking',
        iconName: 'UserGroupIcon',
        description: 'Networking events, meetups, and conferences',
        color: '#1E90FF',
    },
];

export default eventCategories;
