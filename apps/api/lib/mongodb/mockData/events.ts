import type {CreateEventInput} from '@ntlango/commons/types';
import {EventLifecycleStatus, EventPrivacySetting, EventStatus, EventVisibility} from '@ntlango/commons/types/event';

export type EventSeedData = CreateEventInput & {
  orgIndex?: number;
  venueIndex?: number;
};

const events: EventSeedData[] = [
  {
    title: 'Signal Studios Urban Maker Fair',
    summary: 'Experience design, art, and tech installations across two floors.',
    description: 'A weekend of interactive installations, generative art, and hardware showcase by emerging creatives.',
    location: {
      locationType: 'venue',
      address: {
        street: '120 Exchange Rd',
        city: 'Durban',
        state: 'KwaZulu-Natal',
        zipCode: '4001',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=12,13',
    organizers: [],
    eventCategories: [],
    capacity: 600,
    tags: {features: ['installations', 'workshops'], vibe: ['creative', 'immersive']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {floorPlan: 'Main + Studio 2'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 0,
    venueIndex: 0,
  },
  {
    title: 'Harbour Collective: Salt City Night Market',
    summary: 'Food, craft, and jazz curated by coastal makers.',
    description: 'Monthly showcase of small-batch food, craft cocktails, live jazz, and a rotating vinyl guest DJ.',
    location: {
      locationType: 'venue',
      address: {
        street: 'Pier 7 Promenade',
        city: 'Cape Town',
        state: 'Western Cape',
        zipCode: '8001',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=FR;INTERVAL=1',
    organizers: [],
    eventCategories: [],
    capacity: 900,
    tags: {themes: ['music', 'food', 'nightlife']},
    status: EventStatus.Ongoing,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {featuredChef: 'Mandla Okafor', afterparty: 'Harbour Rooftop'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 1,
    venueIndex: 1,
  },
  {
    title: 'Harbour Collective Rooftop Afterparty',
    summary: 'Invite-only rooftop set for Harbour Collective members.',
    description: 'A clandestine rooftop session with voltaic sets, immersive visuals, and late-night street food.',
    location: {
      locationType: 'venue',
      address: {
        street: '11 Woolworths Lane',
        city: 'Cape Town',
        state: 'Western Cape',
        zipCode: '8002',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=SA',
    organizers: [],
    eventCategories: [],
    capacity: 220,
    tags: {access: ['invite-only'], music: ['amapiano', 'house']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Draft,
    visibility: EventVisibility.Private,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {hostedBy: 'Harbour Collective Membership'},
    comments: {},
    privacySetting: EventPrivacySetting.Private,
    orgIndex: 1,
    venueIndex: 1,
  },
  {
    title: 'Emergent Labs: Innovation Summit',
    summary: 'Hybrid summit for AI, climate, and cultural founders.',
    description: 'Two-day salon of talks, hands-on labs, and guided networking for future-focused founders.',
    location: {
      locationType: 'virtual',
      details: 'Private stream link shared 48h before start',
    },
    recurrenceRule: 'FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=18,19',
    organizers: [],
    eventCategories: [],
    capacity: 180,
    tags: {tracks: ['AI', 'Climate'], format: ['hybrid']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Unlisted,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {featuredSpeakers: ['Nia Dlamini', 'Marcelo Adeyemi']},
    comments: {},
    privacySetting: EventPrivacySetting.Private,
    orgIndex: 2,
    venueIndex: 2,
  },
  {
    title: 'Emergent Labs Founders Studio Day',
    summary: 'Small-group working session with coaches and creative technologists.',
    description: 'Hands-on studio day with breakout coaching, rapid prototyping kits, and mentorship pods.',
    location: {
      locationType: 'venue',
      address: {
        street: '301 Gallery Way',
        city: 'Johannesburg',
        state: 'Gauteng',
        zipCode: '2092',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=3',
    organizers: [],
    eventCategories: [],
    capacity: 40,
    tags: {format: ['workshop', 'studio'], mood: ['intimate']},
    status: EventStatus.Ongoing,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Invitation,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {kit: 'Rapid Prototype Pack'},
    comments: {},
    privacySetting: EventPrivacySetting.Private,
    orgIndex: 2,
    venueIndex: 2,
  },
  {
    title: 'Cape Town Wellness Immersion',
    summary: 'Three-day wellness retreat beside the ocean.',
    description: 'Guided breathwork, sound healing, trail runs, and conscious dining curated by bilingual coaches.',
    location: {
      locationType: 'venue',
      address: {
        street: 'Signal Loft Retreat Center',
        city: 'Cape Town',
        state: 'Western Cape',
        zipCode: '8005',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=FR,SA,SU',
    organizers: [],
    eventCategories: [],
    capacity: 120,
    tags: {focus: ['wellness', 'retreat'], include: ['sound', 'yoga']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1441716844725-09cedc13a4e7?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {wellnessLeads: ['Amina Ngcobo', 'Ethan Mokoena']},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 0,
    venueIndex: 0,
  },
  {
    title: 'Streetcar Platform: Transit Stories',
    summary: 'Live art, music, and projections curated on the streetcar platforms of Johannesburg.',
    description:
      'Artists, musicians, and storytellers converge inside a repurposed tram depot to paint motion trails across projected canvases, followed by intimate listening sessions.',
    location: {
      locationType: 'venue',
      address: {
        street: '8 Tramway Ln',
        city: 'Johannesburg',
        state: 'Gauteng',
        zipCode: '2000',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=SA',
    organizers: [],
    eventCategories: [],
    capacity: 220,
    tags: {themes: ['art', 'music'], vibe: ['transit', 'nocturnal'], locale: ['Johannesburg']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {curators: ['Nandi Motuba', 'Tumi Thusi'], tram: 'Platform 3'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 3,
    venueIndex: 3,
  },
  {
    title: 'Veld Wellness Immersion',
    summary: 'Three-day reset surrounded by rolling grasses and intentional saunas.',
    description:
      'A small-group retreat that blends sound baths, silent hikes, breathwork, and communal dinners to cultivate calm ahead of the planner-heavy seasons.',
    location: {
      locationType: 'venue',
      address: {
        street: '9 Meadow Ridge',
        city: 'Pretoria',
        state: 'Gauteng',
        zipCode: '0002',
        country: 'South Africa',
      },
    },
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=FR,SA,SU',
    organizers: [],
    eventCategories: [],
    capacity: 120,
    tags: {focus: ['wellness', 'retreat'], rituals: ['sound', 'campfire'], mood: ['restorative']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Invitation,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1441716844725-09cedc13a4e7?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {lodging: 'Safari tents', meals: 'Farm-to-table harvest'},
    comments: {},
    privacySetting: EventPrivacySetting.Private,
    orgIndex: 4,
    venueIndex: 4,
  },
  // Non-recurring events with dynamic dates for testing date filters
  {
    title: 'Digital Art Exhibition Opening',
    summary: 'Opening night for contemporary digital art showcase.',
    description: 'Experience the intersection of technology and creativity with local digital artists. Opening reception with refreshments and artist meet-and-greet.',
    location: {
      locationType: 'venue',
      address: {
        street: '45 Art District',
        city: 'Cape Town',
        state: 'Western Cape',
        zipCode: '8001',
        country: 'South Africa',
      },
    },
    recurrenceRule: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      return `DTSTART:${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T180000Z\nRRULE:FREQ=DAILY;COUNT=1`;
    })(),
    organizers: [],
    eventCategories: [],
    capacity: 150,
    tags: {themes: ['art', 'technology'], vibe: ['cultural', 'modern']},
    status: EventStatus.Ongoing,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {dress: 'Smart casual', parking: 'Street parking available'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 0,
    venueIndex: 1,
  },
  {
    title: 'Startup Pitch Night',
    summary: 'Watch tomorrow\'s innovators present their groundbreaking ideas.',
    description: 'Five local startups will pitch their ideas to investors and the community. Networking session to follow with light refreshments.',
    location: {
      locationType: 'venue',
      address: {
        street: '88 Innovation Hub',
        city: 'Johannesburg',
        state: 'Gauteng',
        zipCode: '2196',
        country: 'South Africa',
      },
    },
    recurrenceRule: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = tomorrow.getMonth() + 1;
      const day = tomorrow.getDate();
      return `DTSTART:${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T190000Z\nRRULE:FREQ=DAILY;COUNT=1`;
    })(),
    organizers: [],
    eventCategories: [],
    capacity: 200,
    tags: {themes: ['business', 'technology'], format: ['networking', 'pitches']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {judges: ['Thabo Mbeki', 'Sarah Chen', 'Amina Patel']},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 2,
    venueIndex: 2,
  },
  {
    title: 'Wednesday Coffee & Code',
    summary: 'Casual coding meetup for developers of all levels.',
    description: 'Bring your laptop and join fellow developers for a relaxed coding session. Perfect for working on side projects or learning something new.',
    location: {
      locationType: 'venue',
      address: {
        street: '23 Brew Street',
        city: 'Durban',
        state: 'KwaZulu-Natal',
        zipCode: '4001',
        country: 'South Africa',
      },
    },
    recurrenceRule: (() => {
      const today = new Date();
      const currentDay = today.getDay();
      const daysUntilWednesday = currentDay === 3 ? 7 : (3 - currentDay + 7) % 7;
      const nextWednesday = new Date(today);
      nextWednesday.setDate(today.getDate() + (daysUntilWednesday || 7));
      const year = nextWednesday.getFullYear();
      const month = nextWednesday.getMonth() + 1;
      const day = nextWednesday.getDate();
      return `DTSTART:${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T160000Z\nRRULE:FREQ=DAILY;COUNT=1`;
    })(),
    organizers: [],
    eventCategories: [],
    capacity: 50,
    tags: {themes: ['technology', 'community'], format: ['casual', 'meetup']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {wifi: 'High-speed available', drinks: 'Coffee and tea provided'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 0,
    venueIndex: 0,
  },
  {
    title: 'Weekend Food Festival',
    summary: 'Two-day celebration of local cuisine and culture.',
    description: 'Over 40 food vendors, live music, cooking demonstrations, and kids activities. A culinary journey through South African flavors.',
    location: {
      locationType: 'venue',
      address: {
        street: 'Victoria Wharf',
        city: 'Cape Town',
        state: 'Western Cape',
        zipCode: '8001',
        country: 'South Africa',
      },
    },
    recurrenceRule: (() => {
      const today = new Date();
      const currentDay = today.getDay();
      const daysUntilSaturday = currentDay === 6 ? 7 : (6 - currentDay + 7) % 7;
      const nextSaturday = new Date(today);
      nextSaturday.setDate(today.getDate() + (daysUntilSaturday || 7));
      const year = nextSaturday.getFullYear();
      const month = nextSaturday.getMonth() + 1;
      const day = nextSaturday.getDate();
      return `DTSTART:${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T100000Z\nRRULE:FREQ=DAILY;COUNT=2`;
    })(),
    organizers: [],
    eventCategories: [],
    capacity: 5000,
    tags: {themes: ['food', 'music', 'family'], vibe: ['festive', 'outdoor']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {parking: 'Ample parking', accessibility: 'Wheelchair accessible'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 1,
    venueIndex: 1,
  },
  {
    title: 'Monthly Book Club: African Literature',
    summary: 'Discussing contemporary African authors and their impact.',
    description: 'Join us for an engaging discussion on this month\'s selected book. New members welcome, refreshments provided.',
    location: {
      locationType: 'venue',
      address: {
        street: '67 Library Lane',
        city: 'Pretoria',
        state: 'Gauteng',
        zipCode: '0002',
        country: 'South Africa',
      },
    },
    recurrenceRule: (() => {
      const today = new Date();
      const targetDate = new Date(today.getFullYear(), today.getMonth(), 15, 18, 0, 0, 0);
      // If the 15th has passed, go to next month
      if (today.getDate() > 15) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();
      return `DTSTART:${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}T180000Z\nRRULE:FREQ=DAILY;COUNT=1`;
    })(),
    organizers: [],
    eventCategories: [],
    capacity: 30,
    tags: {themes: ['literature', 'culture'], format: ['discussion', 'social']},
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    media: {
      featuredImageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80',
      otherMediaData: {},
    },
    heroImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80',
    additionalDetails: {currentBook: 'The Hairdresser of Harare', dresscode: 'Casual'},
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    orgIndex: 0,
    venueIndex: 4,
  },
];

export default events;
