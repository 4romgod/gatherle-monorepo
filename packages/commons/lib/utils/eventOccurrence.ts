export const PUBLIC_OCCURRENCE_QUERY_PARAM = 'occurs';

export const getOccurrencePublicAnchor = (value?: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};
