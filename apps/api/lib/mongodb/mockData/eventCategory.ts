import {IEventCategory} from '../../interface';

export const eventCategories: IEventCategory[] = [
    {
        name: 'Arts',
        iconName: 'PaintBrushIcon',
        description: 'Artistic and creative events',
        color: '#FFC0CB', // Light pink
    },
    {
        name: 'Music',
        iconName: 'MusicalNoteIcon',
        description: 'Music concerts, performances, and festivals',
        color: '#FFD700', // Gold
    },
    {
        name: 'Technology',
        iconName: 'CpuChipIcon',
        description: 'Events related to technology and innovation',
        color: '#00BFFF', // Deep sky blue
    },
    {
        name: 'Health',
        iconName: 'HeartIcon',
        description: 'Health and wellness workshops and activities',
        color: '#FF6347', // Tomato
    },
    {
        name: 'Fitness',
        iconName: 'DumbbellIcon',
        description: 'Fitness classes, workouts, and challenges',
        color: '#FFA07A', // Light salmon
    },
    {
        name: 'Food',
        iconName: 'CakeIcon',
        description: 'Food festivals, cooking classes, and culinary events',
        color: '#8A2BE2', // Blue violet
    },
    {
        name: 'Drinks',
        iconName: 'WineGlassIcon',
        description: 'Events focused on beverages, wine tastings, and cocktails',
        color: '#00CED1', // Dark turquoise
    },
    {
        name: 'Travel',
        iconName: 'GlobeAmericasIcon',
        description: 'Travel-related events, adventure trips, and tours',
        color: '#32CD32', // Lime green
    },
    {
        name: 'Concert',
        iconName: 'MusicIcon',
        description: 'Live music performances and concerts',
        color: '#FF69B4', // Hot pink
    },
    {
        name: 'Conference',
        iconName: 'PresentationChartBarIcon',
        description: 'Professional conferences, summits, and conventions',
        color: '#4682B4', // Steel blue
    },
    {
        name: 'Networking',
        iconName: 'UserGroupIcon',
        description: 'Networking events, meetups, and conferences',
        color: '#1E90FF', // Dodger blue
    },
];

export default eventCategories;
