import {VenueType} from '@ntlango/commons/types';

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
  },
  {
    orgIndex: 2,
    type: VenueType.Virtual,
    name: 'Emergent Labs Digital Studio',
    address: {
      city: 'Remote',
      country: 'South Africa',
    },
    capacity: 180,
    amenities: ['studio kit', 'live-stream control', 'green room'],
    url: 'https://emergentlabs.studio/digital',
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
  },
];

export default venues;
