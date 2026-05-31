export type AdminSectionProps = {
  token?: string | null;
};

export type AdminUsersSectionProps = AdminSectionProps & {
  currentUserId?: string | null;
};

export type AdminEventSeriesPreview = {
  eventId: string;
  title: string;
  summary?: string | null;
  primarySchedule?: {
    recurrenceRule?: string | null;
    timezone?: string | null;
  } | null;
  representativeOccurrence?: {
    startAt?: string | Date | null;
    endAt?: string | Date | null;
    timezone?: string | null;
    rsvpCount?: number | null;
  } | null;
};

export type AdminOrganizationPreview = {
  orgId: string;
  ownerId: string;
  slug: string;
  name: string;
  description?: string | null;
  billingEmail?: string | null;
  tags?: string[] | null;
  domainsAllowed?: string[] | null;
};
