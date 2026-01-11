/**
 * Performance monitoring utilities for measuring query and render times
 */

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * Simple performance timer for measuring async operations
 * @param operation - Name of the operation being measured
 * @param fn - Async function to measure
 * @returns Result of the function execution
 */
export async function measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  const label = `[Performance] ${operation}`;

  console.time(label);

  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.timeEnd(label);
    console.log(`${label} completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    console.timeEnd(label);
    console.error(`${label} failed`, error);
    throw error;
  }
}

/**
 * Measure multiple parallel operations and log individual + total times
 * @param operations - Array of named async operations
 * @returns Results array matching input order
 */
export async function measureParallel<T extends any[]>(
  operations: Array<{ name: string; fn: () => Promise<any> }>,
): Promise<T> {
  const startTime = performance.now();
  console.log(`[Performance] Starting ${operations.length} parallel operations...`);

  const results = await Promise.all(
    operations.map(async ({ name, fn }) => {
      const opStart = performance.now();
      try {
        const result = await fn();
        const opEnd = performance.now();
        console.log(`  ✓ ${name}: ${(opEnd - opStart).toFixed(2)}ms`);
        return result;
      } catch (error) {
        console.error(`  ✗ ${name} failed`, error);
        throw error;
      }
    }),
  );

  const endTime = performance.now();
  console.log(`[Performance] All operations completed in ${(endTime - startTime).toFixed(2)}ms total`);

  return results as T;
}
