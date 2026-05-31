import { buildEventSeriesWebUrl, buildEventSessionWebUrl } from '@/lib/events/deviceActions';

describe('deviceActions event URLs', () => {
  const originalWebappUrl = process.env.EXPO_PUBLIC_WEBAPP_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_WEBAPP_URL = 'https://beta.gatherle.com/';
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_WEBAPP_URL = originalWebappUrl;
  });

  it('builds the public event series URL from the configured webapp base', () => {
    expect(
      buildEventSeriesWebUrl({
        eventSeries: { slug: 'cape-town-wellness-immersion' },
      } as any),
    ).toBe('https://beta.gatherle.com/events/cape-town-wellness-immersion');
  });

  it('builds the public event session URL with the occurrence anchor when available', () => {
    expect(
      buildEventSessionWebUrl({
        eventSeries: { slug: 'cape-town-wellness-immersion' },
        originalStartAt: '2026-05-29T06:00:00.000Z',
        startAt: '2026-05-29T08:00:00.000Z',
      } as any),
    ).toBe('https://beta.gatherle.com/events/cape-town-wellness-immersion?occurs=2026-05-29T06%3A00%3A00.000Z');
  });
});
