import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type {
  ImportedEventSeedData,
  ImportedOrganizationSeedData,
  ImportedSourcePlatform,
} from '@/mongodb/data/seed/types';

const IMPORTED_SOURCE_PLATFORMS = [
  'Computicket',
  'Howler',
  'Joburg',
  'Quicket',
  'Ticketpro',
  'Webtickets',
  'WhatsOnInJoburg',
] as const satisfies readonly ImportedSourcePlatform[];

const ImportedLocationSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().min(1),
});

const ImportedOrganizationSeedDataSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

const ImportedEventSeedDataSchema = z.object({
  sourcePlatform: z.enum(IMPORTED_SOURCE_PLATFORMS),
  sourceUrl: z.string().url(),
  externalId: z.string().min(1),
  orgKey: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),
  venueName: z.string().min(1),
  location: ImportedLocationSchema,
  categoryNames: z.array(z.string().min(1)).min(1),
  tags: z.record(z.string(), z.unknown()).optional(),
});

const ImportedMediaMapSchema = z.record(z.string().min(1), z.string().url());

const ImportedPublicSeedDataSchema = z.object({
  organizations: z.array(ImportedOrganizationSeedDataSchema),
  organizationMediaByKey: ImportedMediaMapSchema,
  events: z.array(ImportedEventSeedDataSchema),
  eventMediaByExternalId: ImportedMediaMapSchema,
});

type ImportedPublicSeedData = {
  organizations: ImportedOrganizationSeedData[];
  organizationMediaByKey: Record<string, string>;
  events: ImportedEventSeedData[];
  eventMediaByExternalId: Record<string, string>;
};

const PUBLIC_SEED_DATA_FILENAMES = {
  organizations: 'organizations.json',
  organizationMediaByKey: 'organization-media.json',
  events: 'events.json',
  eventMediaByExternalId: 'event-media.json',
} as const;

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeImportedMediaUrl(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
}

function normalizeImportedMediaMap(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, mediaUrl]) => [key, normalizeImportedMediaUrl(mediaUrl)]));
}

export function resolvePublicSeedDataDir(args: string[] = process.argv.slice(2), env = process.env): string {
  const argValue = args.find((arg) => arg.startsWith('--data-dir='))?.slice('--data-dir='.length);
  const candidate = argValue ?? env.PUBLIC_SEED_DATA_DIR;

  if (!candidate?.trim()) {
    throw new Error(
      'Public seed data directory is required. Provide --data-dir=/absolute/or/relative/path or set PUBLIC_SEED_DATA_DIR.',
    );
  }

  return path.resolve(process.cwd(), candidate);
}

export function loadImportedPublicSeedData(dataDir: string): ImportedPublicSeedData {
  const resolvedDataDir = path.resolve(dataDir);

  if (!fs.existsSync(resolvedDataDir) || !fs.statSync(resolvedDataDir).isDirectory()) {
    throw new Error(`Public seed data directory does not exist or is not a directory: ${resolvedDataDir}`);
  }

  const organizations = readJsonFile(path.join(resolvedDataDir, PUBLIC_SEED_DATA_FILENAMES.organizations));
  const organizationMediaByKey = readJsonFile(
    path.join(resolvedDataDir, PUBLIC_SEED_DATA_FILENAMES.organizationMediaByKey),
  );
  const events = readJsonFile(path.join(resolvedDataDir, PUBLIC_SEED_DATA_FILENAMES.events));
  const eventMediaByExternalId = readJsonFile(
    path.join(resolvedDataDir, PUBLIC_SEED_DATA_FILENAMES.eventMediaByExternalId),
  );

  return ImportedPublicSeedDataSchema.parse({
    organizations,
    organizationMediaByKey: normalizeImportedMediaMap(organizationMediaByKey),
    events,
    eventMediaByExternalId: normalizeImportedMediaMap(eventMediaByExternalId),
  });
}

export type { ImportedPublicSeedData };
