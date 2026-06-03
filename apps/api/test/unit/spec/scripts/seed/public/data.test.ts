import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadImportedPublicSeedData, resolvePublicSeedDataDir } from '@/scripts/seed/public/data';

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

describe('public seed data loader', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatherle-public-seed-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves the data dir from the CLI argument', () => {
    const result = resolvePublicSeedDataDir(['--data-dir=./seed-input'], {});
    expect(result).toBe(path.join(tempDir, 'seed-input'));
  });

  it('resolves the data dir from the environment variable', () => {
    const result = resolvePublicSeedDataDir([], { PUBLIC_SEED_DATA_DIR: './seed-input' });
    expect(result).toBe(path.join(tempDir, 'seed-input'));
  });

  it('throws when no data directory was provided', () => {
    expect(() => resolvePublicSeedDataDir([], {})).toThrow(
      'Public seed data directory is required. Provide --data-dir=/absolute/or/relative/path or set PUBLIC_SEED_DATA_DIR.',
    );
  });

  it('loads and validates imported public seed data from JSON files', () => {
    const dataDir = path.join(tempDir, 'seed-input');
    fs.mkdirSync(dataDir);

    writeJson(path.join(dataDir, 'organizations.json'), [
      {
        key: 'sample-org',
        name: 'Sample Org',
        description: 'Imported organization',
        websiteUrl: 'https://example.com',
        tags: ['imported'],
      },
    ]);
    writeJson(path.join(dataDir, 'organization-media.json'), {
      'sample-org': 'https://example.com/logo.png',
    });
    writeJson(path.join(dataDir, 'events.json'), [
      {
        sourcePlatform: 'Howler',
        sourceUrl: 'https://example.com/events/sample',
        externalId: 'event-1',
        orgKey: 'sample-org',
        title: 'Sample Event',
        summary: 'Imported event',
        startsAt: '2026-06-01T10:00:00+02:00',
        endsAt: '2026-06-01T12:00:00+02:00',
        venueName: 'Sample Venue',
        location: {
          street: '1 Sample Street',
          city: 'Pretoria',
          state: 'Gauteng',
          zipCode: '0001',
          country: 'South Africa',
        },
        categoryNames: ['Live Music'],
        tags: { vibe: ['test'] },
      },
    ]);
    writeJson(path.join(dataDir, 'event-media.json'), {
      'event-1': 'https://example.com/banner.png',
    });

    expect(loadImportedPublicSeedData(dataDir)).toEqual({
      organizations: [
        {
          key: 'sample-org',
          name: 'Sample Org',
          description: 'Imported organization',
          websiteUrl: 'https://example.com',
          tags: ['imported'],
        },
      ],
      organizationMediaByKey: {
        'sample-org': 'https://example.com/logo.png',
      },
      events: [
        {
          sourcePlatform: 'Howler',
          sourceUrl: 'https://example.com/events/sample',
          externalId: 'event-1',
          orgKey: 'sample-org',
          title: 'Sample Event',
          summary: 'Imported event',
          startsAt: '2026-06-01T10:00:00+02:00',
          endsAt: '2026-06-01T12:00:00+02:00',
          venueName: 'Sample Venue',
          location: {
            street: '1 Sample Street',
            city: 'Pretoria',
            state: 'Gauteng',
            zipCode: '0001',
            country: 'South Africa',
          },
          categoryNames: ['Live Music'],
          tags: { vibe: ['test'] },
        },
      ],
      eventMediaByExternalId: {
        'event-1': 'https://example.com/banner.png',
      },
    });
  });

  it('normalizes protocol-relative media URLs before validation', () => {
    const dataDir = path.join(tempDir, 'seed-input');
    fs.mkdirSync(dataDir);

    writeJson(path.join(dataDir, 'organizations.json'), [
      {
        key: 'sample-org',
        name: 'Sample Org',
      },
    ]);
    writeJson(path.join(dataDir, 'organization-media.json'), {
      'sample-org': '//cdn.example.com/logo.png',
    });
    writeJson(path.join(dataDir, 'events.json'), [
      {
        sourcePlatform: 'Howler',
        sourceUrl: 'https://example.com/events/sample',
        externalId: 'event-1',
        orgKey: 'sample-org',
        title: 'Sample Event',
        summary: 'Imported event',
        startsAt: '2026-06-01T10:00:00+02:00',
        venueName: 'Sample Venue',
        location: {
          street: '1 Sample Street',
          city: 'Pretoria',
          state: 'Gauteng',
          zipCode: '0001',
          country: 'South Africa',
        },
        categoryNames: ['Live Music'],
      },
    ]);
    writeJson(path.join(dataDir, 'event-media.json'), {
      'event-1': '//cdn.example.com/banner.png',
    });

    expect(loadImportedPublicSeedData(dataDir)).toEqual(
      expect.objectContaining({
        organizationMediaByKey: {
          'sample-org': 'https://cdn.example.com/logo.png',
        },
        eventMediaByExternalId: {
          'event-1': 'https://cdn.example.com/banner.png',
        },
      }),
    );
  });

  it('throws when the JSON payload does not match the expected schema', () => {
    const dataDir = path.join(tempDir, 'seed-input');
    fs.mkdirSync(dataDir);

    writeJson(path.join(dataDir, 'organizations.json'), [{ key: '', name: 'Bad Org' }]);
    writeJson(path.join(dataDir, 'organization-media.json'), {});
    writeJson(path.join(dataDir, 'events.json'), []);
    writeJson(path.join(dataDir, 'event-media.json'), {});

    expect(() => loadImportedPublicSeedData(dataDir)).toThrow();
  });
});
