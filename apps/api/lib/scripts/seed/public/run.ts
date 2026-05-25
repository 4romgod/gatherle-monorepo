import { EventOccurrenceParticipantDAO, EventSeriesDAO, OrganizationDAO, UserDAO } from '@/mongodb/dao';
import { importedEventsSystemUser } from '@/mongodb/data/system';
import {
  importedGautengEvents,
  importedGautengOrganizations,
  importedEventFeaturedImagesByExternalId,
  importedOrganizationLogosByKey,
  type ImportedEventSeedData,
  type ImportedOrganizationSeedData,
} from '@/mongodb/data/seed';
import { buildPrimarySchedule } from '@/mongodb/data/utils';
import EventSeriesService from '@/services/eventSeries';
import { logger } from '@/utils/logger';
import { kebabCase } from 'lodash';
import type {
  CreateEventInput,
  CreateOrganizationInput,
  EventSeries,
  EventsQueryOptionsInput,
  Organization,
  OrganizationLinkInput,
  UpdateEventInput,
  UpdateOrganizationInput,
  User,
} from '@gatherle/commons/types';
import {
  EventLifecycleStatus,
  EventOrganizerRole,
  EventPrivacySetting,
  EventStatus,
  EventVisibility,
  FollowPolicy,
  SocialVisibility,
  UserRole,
} from '@gatherle/commons/types';
import { readSeededCatalogOrThrow } from '../catalog/run';
import { ensureOwnerMembershipForOrganization } from '../shared/organizations';
import { markSeedUserVerified } from '../shared/users';

const HOWLER_CDN_HOST = 'https://d1as2iufift1z3.cloudfront.net';

async function ensureImportedSystemUser() {
  logger.info('Ensuring imported-events system user exists...');

  try {
    const existingUser = await UserDAO.readUserByEmail(importedEventsSystemUser.email);
    const updatedUser = await UserDAO.updateUser({
      userId: existingUser.userId,
      username: importedEventsSystemUser.username,
      given_name: importedEventsSystemUser.given_name,
      family_name: importedEventsSystemUser.family_name,
      birthdate: importedEventsSystemUser.birthdate,
      gender: importedEventsSystemUser.gender,
      phone_number: importedEventsSystemUser.phone_number,
      userRole: UserRole.Admin,
      isTestUser: true,
      bio: importedEventsSystemUser.bio,
      primaryTimezone: importedEventsSystemUser.primaryTimezone,
      defaultVisibility: importedEventsSystemUser.defaultVisibility,
      socialVisibility: importedEventsSystemUser.socialVisibility,
      followPolicy: importedEventsSystemUser.followPolicy,
      shareRSVPByDefault: importedEventsSystemUser.shareRSVPByDefault,
      shareCheckinsByDefault: importedEventsSystemUser.shareCheckinsByDefault,
    });

    if (!updatedUser.emailVerified) {
      await markSeedUserVerified(updatedUser.userId, importedEventsSystemUser.email);
    }

    return updatedUser;
  } catch {
    throw new Error(
      `Imported-events system user ${importedEventsSystemUser.email} was not found. Run "npm run seed:system-users -w @gatherle/api" first.`,
    );
  }
}

function deriveDomainsAllowed(websiteUrl?: string) {
  if (!websiteUrl) {
    return [];
  }

  try {
    return [new URL(websiteUrl).hostname.replace(/^www\./, '')];
  } catch {
    return [];
  }
}

function buildOrganizationLinks(organization: ImportedOrganizationSeedData): OrganizationLinkInput[] | undefined {
  if (!organization.websiteUrl) {
    return undefined;
  }

  return [{ label: 'Website', url: organization.websiteUrl }];
}

function buildImportedOrganizationSlug(organization: ImportedOrganizationSeedData) {
  return kebabCase(organization.name);
}

function normalizeImportedImageUrl(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(imageUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isHowlerHost =
      hostname === 'howler.co.za' || hostname.endsWith('.howler.co.za') || hostname === 'www.howler.co.za';

    if (isHowlerHost && parsed.pathname.startsWith('/rails/active_storage/blobs/redirect/')) {
      return `${HOWLER_CDN_HOST}${parsed.pathname.replace('/blobs/redirect/', '/blobs/proxy/')}`;
    }

    if (isHowlerHost && parsed.pathname.startsWith('/rails/active_storage/representations/redirect/')) {
      return `${HOWLER_CDN_HOST}${parsed.pathname.replace('/representations/redirect/', '/representations/proxy/')}`;
    }

    return imageUrl;
  } catch {
    return imageUrl;
  }
}

function buildImportedOrganizationLogoUrl(organization: ImportedOrganizationSeedData) {
  const explicitLogo = importedOrganizationLogosByKey[organization.key];
  if (explicitLogo) {
    return normalizeImportedImageUrl(explicitLogo);
  }

  const fallbackEvent = importedGautengEvents.find((eventSeed) => eventSeed.orgKey === organization.key);
  if (!fallbackEvent) {
    return undefined;
  }

  return normalizeImportedImageUrl(importedEventFeaturedImagesByExternalId[fallbackEvent.externalId]);
}

async function ensureImportedOrganizations(systemUser: User) {
  logger.info('Ensuring imported organizations exist...');

  const organizationsByKey = new Map<string, Organization>();

  for (const organizationSeed of importedGautengOrganizations) {
    const organizationSlug = buildImportedOrganizationSlug(organizationSeed);
    const createPayload: CreateOrganizationInput = {
      name: organizationSeed.name,
      description:
        organizationSeed.description ?? 'Imported public host profile created from curated Gauteng event listings.',
      logo: buildImportedOrganizationLogoUrl(organizationSeed),
      ownerId: systemUser.userId,
      defaultVisibility: EventVisibility.Public,
      billingEmail: importedEventsSystemUser.email,
      links: buildOrganizationLinks(organizationSeed),
      domainsAllowed: deriveDomainsAllowed(organizationSeed.websiteUrl),
      tags: Array.from(new Set(['imported', 'gauteng', ...(organizationSeed.tags ?? [])])),
    };

    try {
      const existing = await OrganizationDAO.readOrganizationBySlug(organizationSlug);
      const updated = await OrganizationDAO.updateOrganization({
        orgId: existing.orgId,
        name: createPayload.name,
        description: createPayload.description,
        logo: createPayload.logo,
        defaultVisibility: createPayload.defaultVisibility,
        billingEmail: createPayload.billingEmail,
        links: createPayload.links,
        domainsAllowed: createPayload.domainsAllowed,
        tags: createPayload.tags,
        followPolicy: FollowPolicy.Public,
        followersListVisibility: SocialVisibility.Public,
      } as UpdateOrganizationInput);

      organizationsByKey.set(organizationSeed.key, updated);
      await ensureOwnerMembershipForOrganization(updated);
      continue;
    } catch {
      const created = await OrganizationDAO.create({
        ...createPayload,
        followPolicy: FollowPolicy.Public,
        followersListVisibility: SocialVisibility.Public,
      } as CreateOrganizationInput);

      organizationsByKey.set(organizationSeed.key, created);
      await ensureOwnerMembershipForOrganization(created);
      logger.info(`   Created imported organization "${organizationSeed.name}".`);
    }
  }

  return organizationsByKey;
}

function buildImportedEventDescription(eventSeed: ImportedEventSeedData) {
  return [
    eventSeed.summary,
    `This event listing was imported by Gatherle from a public ${eventSeed.sourcePlatform} page.`,
    'Use the official event link for tickets, lineup changes, and the latest host-managed information.',
  ].join('\n\n');
}

function buildImportedEventTags(eventSeed: ImportedEventSeedData) {
  return {
    imported: true,
    region: ['gauteng'],
    sourcePlatform: eventSeed.sourcePlatform,
    locationCity: [eventSeed.location.city.toLowerCase()],
    venueName: eventSeed.venueName,
    ...(eventSeed.tags ?? {}),
  };
}

function readImportedEventClaimStatus(existingEvent?: EventSeries) {
  const claimStatus = existingEvent?.additionalDetails?.importMetadata?.claimStatus;
  return typeof claimStatus === 'string' ? claimStatus : 'unclaimed';
}

function normalizeImportedEventOrganizers(existingEvent?: EventSeries) {
  if (!existingEvent?.organizers?.length) {
    return [] as CreateEventInput['organizers'];
  }

  return existingEvent.organizers
    .map((organizer) => {
      const organizerUserId =
        typeof organizer.user === 'string'
          ? organizer.user
          : 'userId' in organizer.user && typeof organizer.user.userId === 'string'
            ? organizer.user.userId
            : null;

      if (!organizerUserId) {
        return null;
      }

      return {
        user: organizerUserId,
        role: organizer.role,
      };
    })
    .filter(
      (organizer): organizer is NonNullable<(typeof existingEvent.organizers)[number]> & { user: string } =>
        organizer !== null,
    );
}

function buildImportedEventAdditionalDetails(eventSeed: ImportedEventSeedData, existingEvent?: EventSeries) {
  const importedAt = existingEvent?.additionalDetails?.importMetadata?.importedAt;

  return {
    importMetadata: {
      sourcePlatform: eventSeed.sourcePlatform,
      sourceUrl: eventSeed.sourceUrl,
      externalId: eventSeed.externalId,
      region: 'Gauteng',
      claimStatus: readImportedEventClaimStatus(existingEvent),
      importedAt: typeof importedAt === 'string' ? importedAt : new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
    },
  };
}

function buildImportedEventInput(
  eventSeed: ImportedEventSeedData,
  systemUser: User,
  organization: Organization,
  eventCategoryIdsByName: Map<string, string>,
  existingEvent?: EventSeries,
): CreateEventInput {
  const eventCategoryIds = [...new Set(eventSeed.categoryNames)].map((categoryName) => {
    const categoryId = eventCategoryIdsByName.get(categoryName);
    if (!categoryId) {
      throw new Error(`Missing event category "${categoryName}" while importing "${eventSeed.title}".`);
    }
    return categoryId;
  });
  const claimStatus = readImportedEventClaimStatus(existingEvent);
  const preservedOrganizers = normalizeImportedEventOrganizers(existingEvent);
  const organizers: CreateEventInput['organizers'] =
    claimStatus !== 'unclaimed' && preservedOrganizers.length > 0
      ? preservedOrganizers
      : [{ user: systemUser.userId, role: EventOrganizerRole.Host }];
  const seededFeaturedImageUrl = normalizeImportedImageUrl(
    importedEventFeaturedImagesByExternalId[eventSeed.externalId],
  );
  const media =
    claimStatus !== 'unclaimed' && existingEvent?.media
      ? existingEvent.media
      : seededFeaturedImageUrl
        ? { featuredImageUrl: seededFeaturedImageUrl }
        : existingEvent?.media;

  return {
    title: eventSeed.title,
    summary: eventSeed.summary,
    description: buildImportedEventDescription(eventSeed),
    primarySchedule: buildPrimarySchedule(
      new Date(eventSeed.startsAt),
      eventSeed.endsAt ? new Date(eventSeed.endsAt) : undefined,
      'FREQ=DAILY;COUNT=1',
    ),
    location: {
      locationType: 'venue',
      address: eventSeed.location,
      details: eventSeed.venueName,
    },
    locationSnapshot: eventSeed.venueName,
    status: EventStatus.Upcoming,
    lifecycleStatus: EventLifecycleStatus.Published,
    visibility: EventVisibility.Public,
    waitlistEnabled: false,
    allowGuestPlusOnes: false,
    remindersEnabled: true,
    showAttendees: true,
    eventCategories: eventCategoryIds,
    organizers,
    tags: buildImportedEventTags(eventSeed),
    media,
    additionalDetails: buildImportedEventAdditionalDetails(eventSeed, existingEvent),
    comments: {},
    privacySetting: EventPrivacySetting.Public,
    eventLink: eventSeed.sourceUrl,
    orgId: organization.orgId,
  };
}

async function readImportedEventByMetadata(eventSeed: ImportedEventSeedData) {
  const options: EventsQueryOptionsInput = {
    filters: [
      {
        field: 'additionalDetails.importMetadata.externalId',
        value: eventSeed.externalId,
      },
      {
        field: 'additionalDetails.importMetadata.sourcePlatform',
        value: eventSeed.sourcePlatform,
      },
    ],
  };

  const matches = await EventSeriesDAO.readEvents(options);
  return matches[0] ?? null;
}

async function seedImportedEvents(
  systemUser: User,
  organizationsByKey: Map<string, Organization>,
  eventCategoryIdsByName: Map<string, string>,
) {
  logger.info('Ensuring imported Gauteng events exist...');

  const seededEvents: EventSeries[] = [];

  for (const eventSeed of importedGautengEvents) {
    const organization = organizationsByKey.get(eventSeed.orgKey);

    if (!organization) {
      logger.warn(`   Skipping "${eventSeed.title}" because organization "${eventSeed.orgKey}" was not found.`);
      continue;
    }

    const existingEvent = await readImportedEventByMetadata(eventSeed);
    const createInput = buildImportedEventInput(
      eventSeed,
      systemUser,
      organization,
      eventCategoryIdsByName,
      existingEvent ?? undefined,
    );

    if (existingEvent) {
      const updatedEvent = await EventSeriesService.update({
        eventId: existingEvent.eventId,
        ...createInput,
      } as UpdateEventInput);
      seededEvents.push(updatedEvent);
      logger.info(`   Updated imported event "${eventSeed.title}".`);
      continue;
    }

    const createdEvent = await EventSeriesService.create(createInput);
    seededEvents.push(createdEvent);
    logger.info(`   Created imported event "${eventSeed.title}".`);
  }

  return seededEvents;
}

export async function runPublicEventSeed() {
  logger.info('Starting imported-event seed...');

  const eventCategories = await readSeededCatalogOrThrow();

  const systemUser = await ensureImportedSystemUser();
  await EventOccurrenceParticipantDAO.deleteByUserId(systemUser.userId);
  const organizationsByKey = await ensureImportedOrganizations(systemUser);
  const eventCategoryIdsByName = new Map(
    eventCategories.map((category) => [category.name, category.eventCategoryId as string]),
  );

  await seedImportedEvents(systemUser, organizationsByKey, eventCategoryIdsByName);
  logger.info('Completed imported-event seed.');
}
