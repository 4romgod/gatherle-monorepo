import type {CreateOrganizationInput} from '@ntlango/commons/types';
import {EventVisibility, OrganizationTicketAccess} from '@ntlango/commons/types';

export type OrganizationSeedData = Omit<CreateOrganizationInput, 'ownerId'>;

const organizations: OrganizationSeedData[] = [
  {
    name: 'Signal Studios',
    description: 'Curated arts & tech experiences that spotlight South African creativity.',
    logo: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
    defaultVisibility: EventVisibility.Public,
    billingEmail: 'hello@signalstudios.co.za',
    allowedTicketAccess: OrganizationTicketAccess.Public,
    tags: ['art', 'tech', 'curated', 'festival'],
    eventDefaults: {
      visibility: EventVisibility.Public,
      remindersEnabled: true,
      waitlistEnabled: false,
      allowGuestPlusOnes: false,
      ticketAccess: OrganizationTicketAccess.Public,
    },
    links: [
      {label: 'Website', url: 'https://signalstudios.co.za'},
      {label: 'Instagram', url: 'https://instagram.com/signalstudios'},
    ],
    domainsAllowed: ['signalstudios.co.za'],
  },
  {
    name: 'Harbour Collective',
    description: 'Independent music promoters connecting coastal communities through sound.',
    logo: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=400&q=80',
    defaultVisibility: EventVisibility.Private,
    billingEmail: 'partners@harbourcollective.live',
    allowedTicketAccess: OrganizationTicketAccess.Members,
    tags: ['music', 'coastal', 'late-night'],
    eventDefaults: {
      visibility: EventVisibility.Private,
      remindersEnabled: true,
      waitlistEnabled: true,
      allowGuestPlusOnes: true,
      ticketAccess: OrganizationTicketAccess.Members,
    },
    links: [
      {label: 'Soundcloud', url: 'https://soundcloud.com/harbourcollective'},
      {label: 'Instagram', url: 'https://instagram.com/harbourcollective'},
      {label: 'Booking', url: 'https://harbourcollective.live/book'},
    ],
    domainsAllowed: ['harbourcollective.live'],
  },
  {
    name: 'Emergent Labs',
    description: 'Future-focused salons, labs, and residencies for founders and creators.',
    logo: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
    defaultVisibility: EventVisibility.Unlisted,
    billingEmail: 'studio@emergentlabs.studio',
    allowedTicketAccess: OrganizationTicketAccess.InviteOnly,
    tags: ['innovation', 'startup', 'workshop'],
    eventDefaults: {
      visibility: EventVisibility.Unlisted,
      remindersEnabled: true,
      waitlistEnabled: false,
      allowGuestPlusOnes: false,
      ticketAccess: OrganizationTicketAccess.InviteOnly,
    },
    links: [
      {label: 'Website', url: 'https://emergentlabs.studio'},
      {label: 'Medium', url: 'https://medium.com/emergent-labs'},
      {label: 'LinkedIn', url: 'https://linkedin.com/company/emergent-labs'},
    ],
    domainsAllowed: ['emergentlabs.studio'],
  },
  {
    name: 'Streetcar Society',
    description: 'Transit-inspired art and music collectives turning stations into living galleries.',
    logo: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80',
    defaultVisibility: EventVisibility.Public,
    billingEmail: 'hello@streetcarsociety.io',
    allowedTicketAccess: OrganizationTicketAccess.Members,
    tags: ['immersive', 'transit', 'community'],
    eventDefaults: {
      visibility: EventVisibility.Public,
      remindersEnabled: true,
      waitlistEnabled: true,
      allowGuestPlusOnes: false,
      ticketAccess: OrganizationTicketAccess.Members,
    },
    links: [
      {label: 'Discord', url: 'https://discord.gg/streetcarsociety'},
      {label: 'Instagram', url: 'https://instagram.com/streetcar.society'},
    ],
    domainsAllowed: ['streetcarsociety.io'],
  },
  {
    name: 'Veld Wellness Collective',
    description: 'Slow-living retreats and wellness residencies anchored in the African veld.',
    logo: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
    defaultVisibility: EventVisibility.Unlisted,
    billingEmail: 'retreats@veldwellness.africa',
    allowedTicketAccess: OrganizationTicketAccess.InviteOnly,
    tags: ['wellness', 'retreat', 'nature'],
    eventDefaults: {
      visibility: EventVisibility.Private,
      remindersEnabled: true,
      waitlistEnabled: true,
      allowGuestPlusOnes: true,
      ticketAccess: OrganizationTicketAccess.InviteOnly,
    },
    links: [
      {label: 'Website', url: 'https://veldwellness.africa'},
      {label: 'Journal', url: 'https://veldwellness.africa/journal'},
    ],
    domainsAllowed: ['veldwellness.africa'],
  },
];

export default organizations;
