export type ImportedSourcePlatform =
  | 'Computicket'
  | 'Howler'
  | 'Joburg'
  | 'Quicket'
  | 'Ticketpro'
  | 'Webtickets'
  | 'WhatsOnInJoburg';

export type ImportedOrganizationSeedData = {
  key: string;
  name: string;
  description?: string;
  websiteUrl?: string;
  tags?: string[];
};

export type ImportedEventSeedData = {
  sourcePlatform: ImportedSourcePlatform;
  sourceUrl: string;
  externalId: string;
  orgKey: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt?: string;
  venueName: string;
  location: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  categoryNames: string[];
  tags?: Record<string, unknown>;
};
