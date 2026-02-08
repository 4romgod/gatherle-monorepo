const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * TODO: This change introduces regex-based searches (/value/i) across arbitrary fields.
 * In MongoDB, regex queries typically bypass indexes unless they’re prefix-anchored,
 * which can lead to collection scans as data grows. Consider constraining searchable fields to
 * indexed ones and/or using a text index ($text) for production-scale search.
 */
export const buildTextSearchRegex = (value: string, caseSensitive?: boolean) => {
  const flags = caseSensitive ? '' : 'i';
  return new RegExp(escapeRegex(value), flags);
};
