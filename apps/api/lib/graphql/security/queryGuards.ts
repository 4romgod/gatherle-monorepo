import type {
  ArgumentNode,
  DocumentNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import { Kind } from 'graphql';
import { APPLICATION_STAGES } from '@gatherle/commons/server';
import { CustomError, ErrorTypes } from '@/utils';

type VariablesMap = Record<string, unknown>;

export type QueryGuardLimits = {
  maxDepth: number;
  maxComplexity: number;
  allowIntrospection: boolean;
};

export type SelectionMetrics = {
  complexity: number;
  maxDepth: number;
  usesIntrospection: boolean;
};

export const QUERY_GUARD_ERROR_CODES = {
  INTROSPECTION_DISABLED: 'QUERY_GUARD_INTROSPECTION_DISABLED',
  MAX_DEPTH_EXCEEDED: 'QUERY_GUARD_MAX_DEPTH_EXCEEDED',
  MAX_COMPLEXITY_EXCEEDED: 'QUERY_GUARD_MAX_COMPLEXITY_EXCEEDED',
} as const;

export type QueryGuardErrorCode = (typeof QUERY_GUARD_ERROR_CODES)[keyof typeof QUERY_GUARD_ERROR_CODES];

const DEFAULT_QUERY_DEPTH_LIMITS: Record<string, number> = {
  [APPLICATION_STAGES.DEV]: 14,
  [APPLICATION_STAGES.BETA]: 10,
  [APPLICATION_STAGES.GAMMA]: 10,
  [APPLICATION_STAGES.PROD]: 10,
};

const DEFAULT_QUERY_COMPLEXITY_LIMITS: Record<string, number> = {
  [APPLICATION_STAGES.DEV]: 1200,
  [APPLICATION_STAGES.BETA]: 800,
  [APPLICATION_STAGES.GAMMA]: 800,
  [APPLICATION_STAGES.PROD]: 800,
};

const MAX_ARGUMENT_LIST_MULTIPLIER = 50;
const DEFAULT_LIST_MULTIPLIER = 10;
const QUERY_LIMIT_HTTP_STATUS = 400;

const parsePositiveIntegerEnv = (envValue: string | undefined, fallback: number): number => {
  if (!envValue?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(envValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getBooleanEnv = (envValue: string | undefined, fallback: boolean): boolean => {
  if (!envValue?.trim()) {
    return fallback;
  }

  return envValue.trim().toLowerCase() === 'true';
};

const readVariable = (variableName: string, variables: VariablesMap): unknown => variables[variableName];

const getObjectProperty = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
};

const coercePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
};

const valueNodeToRuntime = (node: ArgumentNode['value'], variables: VariablesMap): unknown => {
  switch (node.kind) {
    case Kind.INT:
      return Number.parseInt(node.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(node.value);
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map((value) => valueNodeToRuntime(value, variables));
    case Kind.OBJECT:
      return Object.fromEntries(
        node.fields.map((field) => [field.name.value, valueNodeToRuntime(field.value, variables)]),
      );
    case Kind.VARIABLE:
      return readVariable(node.name.value, variables);
  }
};

const extractListMultiplierFromArgs = (args: readonly ArgumentNode[] | undefined, variables: VariablesMap): number => {
  if (!args?.length) {
    return 1;
  }

  const readNumericCandidate = (value: unknown): number | undefined =>
    coercePositiveInteger(value) ?? coercePositiveInteger(getObjectProperty(value, 'limit'));

  for (const arg of args) {
    const runtimeValue = valueNodeToRuntime(arg.value, variables);
    const directValue = readNumericCandidate(runtimeValue);
    if (directValue) {
      return Math.min(directValue, MAX_ARGUMENT_LIST_MULTIPLIER);
    }

    const nestedPaginationValue = readNumericCandidate(getObjectProperty(runtimeValue, 'pagination'));
    if (nestedPaginationValue) {
      return Math.min(nestedPaginationValue, MAX_ARGUMENT_LIST_MULTIPLIER);
    }
  }

  return 1;
};

const isIntrospectionField = (selection: SelectionNode): boolean =>
  selection.kind === Kind.FIELD && selection.name.value.startsWith('__');

const calculateSelectionMetrics = (
  selectionSet: SelectionSetNode | undefined,
  fragments: Map<string, FragmentDefinitionNode>,
  variables: VariablesMap,
  depth: number,
  seenFragments: Set<string>,
): SelectionMetrics => {
  if (!selectionSet) {
    return { complexity: 0, maxDepth: depth - 1, usesIntrospection: false };
  }

  let complexity = 0;
  let maxDepth = depth;
  let usesIntrospection = false;

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fieldComplexity = extractListMultiplierFromArgs(selection.arguments, variables) * depth;
      complexity += fieldComplexity;
      maxDepth = Math.max(maxDepth, depth);
      usesIntrospection ||= isIntrospectionField(selection);

      if (selection.selectionSet) {
        const childMetrics = calculateSelectionMetrics(
          selection.selectionSet,
          fragments,
          variables,
          depth + 1,
          seenFragments,
        );
        complexity += childMetrics.complexity;
        maxDepth = Math.max(maxDepth, childMetrics.maxDepth);
        usesIntrospection ||= childMetrics.usesIntrospection;
      }

      continue;
    }

    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const fragmentMetrics = calculateSelectionMetrics(
        selection.selectionSet,
        fragments,
        variables,
        depth,
        seenFragments,
      );
      complexity += fragmentMetrics.complexity;
      maxDepth = Math.max(maxDepth, fragmentMetrics.maxDepth);
      usesIntrospection ||= fragmentMetrics.usesIntrospection;
      continue;
    }

    if (seenFragments.has(selection.name.value)) {
      continue;
    }

    const fragment = fragments.get(selection.name.value);
    if (!fragment) {
      continue;
    }

    seenFragments.add(selection.name.value);
    const fragmentMetrics = calculateSelectionMetrics(
      fragment.selectionSet,
      fragments,
      variables,
      depth,
      seenFragments,
    );
    complexity += fragmentMetrics.complexity;
    maxDepth = Math.max(maxDepth, fragmentMetrics.maxDepth);
    usesIntrospection ||= fragmentMetrics.usesIntrospection;
    seenFragments.delete(selection.name.value);
  }

  return { complexity, maxDepth, usesIntrospection };
};

export const collectQuerySelectionMetrics = (
  document: DocumentNode,
  operation: OperationDefinitionNode,
  variables: VariablesMap,
): SelectionMetrics => {
  const fragments = new Map(
    document.definitions
      .filter((definition): definition is FragmentDefinitionNode => definition.kind === Kind.FRAGMENT_DEFINITION)
      .map((definition) => [definition.name.value, definition]),
  );

  return calculateSelectionMetrics(operation.selectionSet, fragments, variables, 1, new Set());
};

export const assertQuerySelectionMetricsWithinLimits = (metrics: SelectionMetrics, limits: QueryGuardLimits): void => {
  if (!limits.allowIntrospection && metrics.usesIntrospection) {
    throw CustomError('Schema introspection is disabled for this stage.', ErrorTypes.BAD_REQUEST, {
      http: { status: QUERY_LIMIT_HTTP_STATUS },
      queryGuardCode: QUERY_GUARD_ERROR_CODES.INTROSPECTION_DISABLED,
    });
  }

  if (metrics.maxDepth > limits.maxDepth) {
    throw CustomError(
      `Query depth ${metrics.maxDepth} exceeds the maximum allowed depth of ${limits.maxDepth}.`,
      ErrorTypes.BAD_REQUEST,
      {
        http: { status: QUERY_LIMIT_HTTP_STATUS },
        queryGuardCode: QUERY_GUARD_ERROR_CODES.MAX_DEPTH_EXCEEDED,
      },
    );
  }

  if (metrics.complexity > limits.maxComplexity) {
    throw CustomError(
      `Query complexity ${metrics.complexity} exceeds the maximum allowed complexity of ${limits.maxComplexity}.`,
      ErrorTypes.BAD_REQUEST,
      {
        http: { status: QUERY_LIMIT_HTTP_STATUS },
        queryGuardCode: QUERY_GUARD_ERROR_CODES.MAX_COMPLEXITY_EXCEEDED,
      },
    );
  }
};

export const resolveQueryGuardLimits = (stage: string): QueryGuardLimits => ({
  maxDepth: parsePositiveIntegerEnv(
    process.env.GRAPHQL_QUERY_MAX_DEPTH,
    DEFAULT_QUERY_DEPTH_LIMITS[stage] ?? DEFAULT_QUERY_DEPTH_LIMITS[APPLICATION_STAGES.BETA],
  ),
  maxComplexity: parsePositiveIntegerEnv(
    process.env.GRAPHQL_QUERY_MAX_COMPLEXITY,
    DEFAULT_QUERY_COMPLEXITY_LIMITS[stage] ?? DEFAULT_QUERY_COMPLEXITY_LIMITS[APPLICATION_STAGES.BETA],
  ),
  allowIntrospection: getBooleanEnv(process.env.GRAPHQL_ALLOW_INTROSPECTION, stage !== APPLICATION_STAGES.PROD),
});

export const enforceQueryGuards = (
  document: DocumentNode,
  operation: OperationDefinitionNode,
  variables: VariablesMap,
  limits: QueryGuardLimits,
): SelectionMetrics => {
  const metrics = collectQuerySelectionMetrics(document, operation, variables);
  assertQuerySelectionMetricsWithinLimits(metrics, limits);
  return metrics;
};
