import { PUBLIC_OCCURRENCE_QUERY_PARAM, getOccurrencePublicAnchor } from '@gatherle/commons/utils/eventOccurrence';

type OccurrenceUrlLike = {
  originalStartAt?: Date | string | null;
  startAt?: Date | string | null;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

export function buildEventOccurrenceHref(basePath: string, occurrence?: OccurrenceUrlLike | null): string {
  const occurrenceAnchor = getOccurrencePublicAnchor(occurrence?.originalStartAt ?? occurrence?.startAt);
  return occurrenceAnchor
    ? `${basePath}?${PUBLIC_OCCURRENCE_QUERY_PARAM}=${encodeURIComponent(occurrenceAnchor)}`
    : basePath;
}

export function getRequestedOccurrenceAnchor(searchParams: SearchParamsLike): string | null {
  const explicitAnchor = getOccurrencePublicAnchor(searchParams.get(PUBLIC_OCCURRENCE_QUERY_PARAM));
  if (explicitAnchor) {
    return explicitAnchor;
  }

  const legacyOccurrenceId = searchParams.get('occurrence');
  if (!legacyOccurrenceId) {
    return null;
  }

  const separatorIndex = legacyOccurrenceId.indexOf('#');
  if (separatorIndex < 0) {
    return null;
  }

  return getOccurrencePublicAnchor(legacyOccurrenceId.slice(separatorIndex + 1));
}

export function getOccurrenceAnchor(occurrence?: OccurrenceUrlLike | null): string | null {
  return getOccurrencePublicAnchor(occurrence?.originalStartAt ?? occurrence?.startAt);
}
