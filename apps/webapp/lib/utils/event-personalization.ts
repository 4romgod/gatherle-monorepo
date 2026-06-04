import type { EventOccurrencePreview } from '@/data/graphql/query/Event/types';

type InterestLike =
  | {
      eventCategoryId?: string | null;
      name?: string | null;
      slug?: string | null;
    }
  | string
  | null
  | undefined;

type LocationLike = {
  city?: string | null;
  country?: string | null;
  state?: string | null;
};

type PersonalizationInput = {
  interests?: readonly InterestLike[] | null;
  location?: LocationLike | null;
};

const SCORE = {
  categoryExtra: 20,
  categoryMatch: 120,
  cityMatch: 90,
  countryMatch: 20,
  myRsvp: 28,
  popularityRsvpMultiplier: 1.1,
  popularitySaveMultiplier: 0.8,
  savedByMe: 18,
  stateMatch: 45,
  timeUrgency14d: 8,
  timeUrgency30d: 4,
  timeUrgency3d: 20,
  timeUrgency7d: 14,
} as const;

function normalizeValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function buildInterestKeySet(interests: readonly InterestLike[] | null | undefined): Set<string> {
  const keys = new Set<string>();

  for (const interest of interests ?? []) {
    if (typeof interest === 'string') {
      const normalized = normalizeValue(interest);
      if (normalized) {
        keys.add(normalized);
      }
      continue;
    }

    const normalizedId = normalizeValue(interest?.eventCategoryId);
    const normalizedSlug = normalizeValue(interest?.slug);
    const normalizedName = normalizeValue(interest?.name);

    if (normalizedId) {
      keys.add(normalizedId);
    }

    if (normalizedSlug) {
      keys.add(normalizedSlug);
    }

    if (normalizedName) {
      keys.add(normalizedName);
    }
  }

  return keys;
}

function scoreInterestMatch(event: EventOccurrencePreview, interestKeys: Set<string>): number {
  if (interestKeys.size === 0) {
    return 0;
  }

  const matchedCategories = new Set<string>();

  for (const category of event.eventSeries?.eventCategories ?? []) {
    const keys = [
      normalizeValue(category?.eventCategoryId),
      normalizeValue(category?.slug),
      normalizeValue(category?.name),
    ].filter((value): value is string => value != null);

    if (keys.some((key) => interestKeys.has(key))) {
      matchedCategories.add(
        category?.eventCategoryId ?? category?.slug ?? category?.name ?? `matched-${matchedCategories.size}`,
      );
    }
  }

  if (matchedCategories.size === 0) {
    return 0;
  }

  return SCORE.categoryMatch + Math.min((matchedCategories.size - 1) * SCORE.categoryExtra, SCORE.categoryExtra * 2);
}

function scoreLocationMatch(event: EventOccurrencePreview, location: LocationLike | null | undefined): number {
  const targetCity = normalizeValue(location?.city);
  const targetState = normalizeValue(location?.state);
  const targetCountry = normalizeValue(location?.country);

  if (!targetCity && !targetState && !targetCountry) {
    return 0;
  }

  const eventAddress = event.eventSeries?.location?.address;
  const eventCity = normalizeValue(eventAddress?.city);
  const eventState = normalizeValue(eventAddress?.state);
  const eventCountry = normalizeValue(eventAddress?.country);

  if (targetCity && eventCity && targetCity === eventCity) {
    return SCORE.cityMatch;
  }

  if (targetState && eventState && targetState === eventState) {
    return SCORE.stateMatch;
  }

  if (targetCountry && eventCountry && targetCountry === eventCountry) {
    return SCORE.countryMatch;
  }

  return 0;
}

function scoreTimeUrgency(startAt: string | null | undefined): number {
  if (!startAt) {
    return 0;
  }

  const startTime = new Date(startAt).getTime();
  if (!Number.isFinite(startTime)) {
    return 0;
  }

  const diffDays = (startTime - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) {
    return 0;
  }

  if (diffDays <= 3) {
    return SCORE.timeUrgency3d;
  }

  if (diffDays <= 7) {
    return SCORE.timeUrgency7d;
  }

  if (diffDays <= 14) {
    return SCORE.timeUrgency14d;
  }

  if (diffDays <= 30) {
    return SCORE.timeUrgency30d;
  }

  return 0;
}

function scoreSupportSignals(event: EventOccurrencePreview): number {
  const rsvpCount = Math.max(0, event.rsvpCount ?? 0);
  const saveCount = Math.max(0, event.eventSeries?.savedByCount ?? 0);

  let score = Math.round(
    Math.min(rsvpCount, 18) * SCORE.popularityRsvpMultiplier + Math.min(saveCount, 12) * SCORE.popularitySaveMultiplier,
  );

  if (event.eventSeries?.isSavedByMe) {
    score += SCORE.savedByMe;
  }

  if (event.myRsvp?.status && event.myRsvp.status !== 'Cancelled') {
    score += SCORE.myRsvp;
  }

  score += scoreTimeUrgency(event.startAt);
  return score;
}

function getStableStartTime(event: EventOccurrencePreview): number {
  const startTime = new Date(event.startAt ?? '').getTime();
  return Number.isFinite(startTime) ? startTime : Number.MAX_SAFE_INTEGER;
}

export function sortEventOccurrencesForViewer(
  events: EventOccurrencePreview[],
  personalization: PersonalizationInput,
): EventOccurrencePreview[] {
  if (events.length <= 1) {
    return events;
  }

  const interestKeys = buildInterestKeySet(personalization.interests);
  const hasLocationSignal = Boolean(
    normalizeValue(personalization.location?.city) ||
    normalizeValue(personalization.location?.state) ||
    normalizeValue(personalization.location?.country),
  );

  if (interestKeys.size === 0 && !hasLocationSignal) {
    return events;
  }

  const rankedEvents = events.map((event, index) => {
    const interestScore = scoreInterestMatch(event, interestKeys);
    const locationScore = scoreLocationMatch(event, personalization.location);
    const baseScore = interestScore + locationScore;
    const totalScore = baseScore > 0 ? baseScore + scoreSupportSignals(event) : 0;

    return {
      event,
      index,
      startTime: getStableStartTime(event),
      totalScore,
    };
  });

  if (!rankedEvents.some((item) => item.totalScore > 0)) {
    return events;
  }

  return [...rankedEvents]
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (left.startTime !== right.startTime) {
        return left.startTime - right.startTime;
      }

      return left.index - right.index;
    })
    .map((item) => item.event);
}
