const DEFAULT_REDACTED_VALUE = '[REDACTED]';
const CIRCULAR_REFERENCE_VALUE = '[Circular]';
const DEFAULT_MAX_LOG_STRING_LENGTH = 256;

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /api[-_]?key/i,
  /session/i,
  /cookie/i,
  /jwt/i,
  /email/i,
  /phone/i,
  /ssn/i,
];

interface RedactionOptions {
  maxStringLength?: number;
  redactedValue?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const isSensitiveKey = (key: string): boolean => SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...[truncated ${value.length - maxLength} chars]`;
};

const redact = (value: unknown, options: Required<RedactionOptions>, visited: WeakSet<object>): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value, options.maxStringLength);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, options, visited));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (visited.has(value)) {
    return CIRCULAR_REFERENCE_VALUE;
  }

  visited.add(value);

  const redactedObject = Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
    if (isSensitiveKey(key)) {
      acc[key] = options.redactedValue;
      return acc;
    }

    acc[key] = redact(nestedValue, options, visited);
    return acc;
  }, {});

  visited.delete(value);
  return redactedObject;
};

export const redactSensitiveData = (value: unknown, options: RedactionOptions = {}): unknown =>
  redact(
    value,
    {
      maxStringLength: options.maxStringLength ?? DEFAULT_MAX_LOG_STRING_LENGTH,
      redactedValue: options.redactedValue ?? DEFAULT_REDACTED_VALUE,
    },
    new WeakSet<object>(),
  );

export {
  CIRCULAR_REFERENCE_VALUE,
  DEFAULT_MAX_LOG_STRING_LENGTH,
  DEFAULT_REDACTED_VALUE as REDACTED_LOG_VALUE,
  isSensitiveKey as isSensitiveLogKey,
};
