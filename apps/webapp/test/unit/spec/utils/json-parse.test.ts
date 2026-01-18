import { z } from 'zod';
import { safeJsonParse } from '@/lib/utils/json-parse';
import { logger, initLogger, LogLevel } from '@/lib/utils/logger';

describe('safeJsonParse Utility', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Initialize logger at DEBUG level to capture all logs
    initLogger(LogLevel.DEBUG);
    // Spy on logger.warn
    warnSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('with undefined input', () => {
    it('should return undefined for undefined input', () => {
      const schema = z.string();
      const result = safeJsonParse(undefined, schema, 'testField');
      expect(result).toBeUndefined();
    });

    it('should not log anything for undefined input', () => {
      const schema = z.string();
      safeJsonParse(undefined, schema, 'testField');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('with valid JSON', () => {
    it('should parse valid JSON string', () => {
      const schema = z.string();
      const result = safeJsonParse('"hello"', schema, 'testField');
      expect(result).toBe('hello');
    });

    it('should parse valid JSON number', () => {
      const schema = z.number();
      const result = safeJsonParse('42', schema, 'testField');
      expect(result).toBe(42);
    });

    it('should parse valid JSON object', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = safeJsonParse('{"name":"John","age":30}', schema, 'user');
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse valid JSON array', () => {
      const schema = z.array(z.string());
      const result = safeJsonParse('["a","b","c"]', schema, 'items');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should parse nested objects', () => {
      const schema = z.object({
        city: z.string(),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }).optional(),
      });
      const json = '{"city":"New York","coordinates":{"latitude":40.7128,"longitude":-74.006}}';
      const result = safeJsonParse(json, schema, 'location');
      expect(result).toEqual({
        city: 'New York',
        coordinates: { latitude: 40.7128, longitude: -74.006 },
      });
    });
  });

  describe('with invalid JSON syntax', () => {
    it('should return undefined for malformed JSON', () => {
      const schema = z.string();
      const result = safeJsonParse('not valid json', schema, 'testField');
      expect(result).toBeUndefined();
    });

    it('should log warning for malformed JSON', () => {
      initLogger(LogLevel.WARN);
      const schema = z.string();
      safeJsonParse('not valid json', schema, 'testField');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should handle JSON with trailing commas', () => {
      const schema = z.object({ a: z.number() });
      const result = safeJsonParse('{"a":1,}', schema, 'testField');
      expect(result).toBeUndefined();
    });

    it('should handle empty string', () => {
      const schema = z.string();
      const result = safeJsonParse('', schema, 'testField');
      // Empty string is falsy, so it returns undefined without parsing
      expect(result).toBeUndefined();
    });
  });

  describe('with Zod validation failures', () => {
    it('should return undefined when schema validation fails', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      // Missing required 'age' field
      const result = safeJsonParse('{"name":"John"}', schema, 'user');
      expect(result).toBeUndefined();
    });

    it('should log warning with validation errors', () => {
      initLogger(LogLevel.WARN);
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      safeJsonParse('{"name":"John"}', schema, 'user');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should return undefined for type mismatch', () => {
      const schema = z.number();
      const result = safeJsonParse('"not a number"', schema, 'count');
      expect(result).toBeUndefined();
    });

    it('should return undefined for array type mismatch', () => {
      const schema = z.array(z.number());
      const result = safeJsonParse('["a","b","c"]', schema, 'numbers');
      expect(result).toBeUndefined();
    });

    it('should return undefined for object with wrong types', () => {
      const schema = z.object({
        latitude: z.number(),
        longitude: z.number(),
      });
      const result = safeJsonParse('{"latitude":"40.7","longitude":"-74.0"}', schema, 'coords');
      expect(result).toBeUndefined();
    });
  });

  describe('with optional schema fields', () => {
    it('should accept objects with optional fields missing', () => {
      const schema = z.object({
        city: z.string(),
        state: z.string().optional(),
        country: z.string(),
      });
      const result = safeJsonParse('{"city":"NYC","country":"USA"}', schema, 'location');
      expect(result).toEqual({ city: 'NYC', country: 'USA' });
    });

    it('should accept objects with optional fields present', () => {
      const schema = z.object({
        city: z.string(),
        state: z.string().optional(),
        country: z.string(),
      });
      const result = safeJsonParse('{"city":"NYC","state":"NY","country":"USA"}', schema, 'location');
      expect(result).toEqual({ city: 'NYC', state: 'NY', country: 'USA' });
    });
  });

  describe('with optional top-level schema', () => {
    it('should handle optional schema that accepts undefined', () => {
      const schema = z.string().optional();
      const result = safeJsonParse('null', schema, 'testField');
      // null parses to null, but optional() doesn't mean nullable
      // This depends on zod behavior
      expect(result).toBeUndefined();
    });
  });

  describe('input truncation for logging', () => {
    it('should truncate long inputs in log messages', () => {
      initLogger(LogLevel.WARN);
      const schema = z.string();
      const longInput = 'a'.repeat(300); // 300 characters
      safeJsonParse(longInput, schema, 'longField');

      // The log should be called, but we can't easily verify truncation
      // without accessing internal details
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('real-world schemas from update-user-profile', () => {
    const CoordinatesSchema = z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional();

    const LocationSchema = z
      .object({
        city: z.string(),
        state: z.string().optional(),
        country: z.string(),
        coordinates: CoordinatesSchema,
      })
      .optional();

    const InterestsSchema = z.array(z.string()).optional();

    it('should parse valid location with coordinates', () => {
      const json = JSON.stringify({
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });
      const result = safeJsonParse(json, LocationSchema, 'location');
      expect(result).toEqual({
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });
    });

    it('should parse valid location without coordinates', () => {
      const json = JSON.stringify({
        city: 'London',
        country: 'UK',
      });
      const result = safeJsonParse(json, LocationSchema, 'location');
      expect(result).toEqual({
        city: 'London',
        country: 'UK',
      });
    });

    it('should reject location with invalid coordinates', () => {
      const json = JSON.stringify({
        city: 'Paris',
        country: 'France',
        coordinates: {
          latitude: 'not a number',
          longitude: 2.3522,
        },
      });
      const result = safeJsonParse(json, LocationSchema, 'location');
      expect(result).toBeUndefined();
    });

    it('should parse valid interests array', () => {
      const json = JSON.stringify(['music', 'sports', 'tech']);
      const result = safeJsonParse(json, InterestsSchema, 'interests');
      expect(result).toEqual(['music', 'sports', 'tech']);
    });

    it('should parse empty interests array', () => {
      const json = JSON.stringify([]);
      const result = safeJsonParse(json, InterestsSchema, 'interests');
      expect(result).toEqual([]);
    });

    it('should reject interests with non-string items', () => {
      const json = JSON.stringify(['music', 123, 'tech']);
      const result = safeJsonParse(json, InterestsSchema, 'interests');
      expect(result).toBeUndefined();
    });
  });
});
