import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

/**
 * Safely parse JSON with Zod validation.
 * Logs errors for debugging while returning undefined for graceful degradation.
 *
 * @param jsonStr - The JSON string to parse (or undefined)
 * @param schema - The Zod schema to validate against
 * @param fieldName - The name of the field (for logging purposes)
 * @returns The validated and parsed data, or undefined if parsing/validation fails
 */
export function safeJsonParse<T>(
  jsonStr: string | undefined,
  schema: z.ZodType<T>,
  fieldName: string,
): T | undefined {
  if (!jsonStr) return undefined;
  try {
    const parsed = JSON.parse(jsonStr);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      logger.warn(`Invalid ${fieldName} data submitted`, {
        field: fieldName,
        errors: result.error.flatten(),
        input: jsonStr.substring(0, 200), // Truncate to avoid logging huge payloads
      });
      return undefined;
    }
    return result.data;
  } catch (error) {
    logger.warn(`Failed to parse ${fieldName} JSON`, {
      field: fieldName,
      error: error instanceof Error ? error.message : 'Unknown error',
      input: jsonStr.substring(0, 200),
    });
    return undefined;
  }
}
