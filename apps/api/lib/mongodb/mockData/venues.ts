import { VenueType } from '@ntlango/commons/types';

export type VenueSeedData = {
  orgIndex: number;
  type: VenueType;
  name: string;
  address?: {
    street?: string;
    city: string;
    region?: string;
    country: string;
    postalCode?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  capacity?: number;
  amenities?: string[];
  url?: string;
  featuredImageUrl?: string;
  images?: string[];
};

const venues: VenueSeedData[] = [
  {
    orgIndex: 0,
    type: VenueType.Physical,
    name: 'Signal Loft',
    address: {
      street: '120 Exchange Rd',
      city: 'Durban',
      region: 'KwaZulu-Natal',
      country: 'South Africa',
      postalCode: '4001',
    },
    geo: {
      latitude: -29.8587,
      longitude: 31.0218,
    },
    capacity: 400,
    amenities: ['sound system', 'backstage lounge', 'rooftop terrace'],
    featuredImageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1800&q=80',
    images: [
      'https://images.unsplash.com/photo-1515165562835-c4e2b0f3f4c3?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1454896344811-0388b7b62c29?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    orgIndex: 1,
    type: VenueType.Hybrid,
    name: 'Harbour House',
    address: {
      street: 'Pier 7 Promenade',
      city: 'Cape Town',
      region: 'Western Cape',
      country: 'South Africa',
      postalCode: '8001',
    },
    capacity: 250,
    amenities: ['livestream rig', 'modular stage', 'craft bar'],
    url: 'https://harbourcollective.live/house',
    featuredImageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1800&q=80',
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1497493292307-31c376b6e479?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    orgIndex: 2,
    type: VenueType.Virtual,
    name: 'Emergent Labs Digital Studio',
    address: {
      city: 'Remote',
      region: 'Remote',
      country: 'South Africa',
      postalCode: '0000',
    },
    capacity: 180,
    amenities: ['studio kit', 'live-stream control', 'green room'],
    url: 'https://emergentlabs.studio/digital',
    featuredImageUrl: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1800&q=80',
    images: [
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    orgIndex: 3,
    type: VenueType.Physical,
    name: 'Streetcar Platform',
    address: {
      street: '8 Tramway Ln',
      city: 'Johannesburg',
      region: 'Gauteng',
      country: 'South Africa',
      postalCode: '2000',
    },
    geo: {
      latitude: -26.2041,
      longitude: 28.0473,
    },
    capacity: 180,
    amenities: ['projection wall', 'tram-access', 'pop-up kiosks'],
    featuredImageUrl: 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=1800&q=80',
    images: [
      'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    ],
  },
  {
    orgIndex: 4,
    type: VenueType.Physical,
    name: 'Veld Field Pavilion',
    address: {
      street: '9 Meadow Ridge',
      city: 'Pretoria',
      region: 'Gauteng',
      country: 'South Africa',
      postalCode: '0002',
    },
    capacity: 120,
    amenities: ['outdoor deck', 'immersive sound', 'campfire seating'],
    featuredImageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1800&q=80',
    images: [
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    ],
  },
];

export default venues;
