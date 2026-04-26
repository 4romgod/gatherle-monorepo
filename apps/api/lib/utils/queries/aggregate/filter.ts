import { CustomError, ErrorTypes } from '@/utils/exceptions';
import type { FilterInput, LocationFilterInput, TextSearchInput } from '@gatherle/commons/types';
import { FilterOperatorInput, SelectorOperatorInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';
import { buildTextSearchRegex } from '../text-search';

const buildOperatorSymbol = (operator?: FilterOperatorInput) => {
  const normalized = operator || FilterOperatorInput.eq;
  return `$${normalized}` as `$${FilterOperatorInput}`;
};

export const createTextSearchMatchStage = (search: TextSearchInput): PipelineStage.Match | null => {
  const trimmedValue = search.value?.trim();
  if (!trimmedValue) {
    return null;
  }

  const terms = search.fields.map((entry) => entry.trim()).filter((entry) => entry.length > 0);

  if (terms.length === 0) {
    throw CustomError('Text search requires at least one field to search against.', ErrorTypes.BAD_REQUEST);
  }

  const regex = buildTextSearchRegex(trimmedValue, search.caseSensitive);

  if (terms.length === 1) {
    return {
      $match: {
        [terms[0]]: regex,
      },
    };
  }

  return {
    $match: {
      $or: terms.map((targetField) => ({ [targetField]: regex })),
    },
  };
};

/**
 * Creates location filter match conditions for events.
 * Supports text-based filtering (city, state/province, country) and geospatial proximity search.
 * Note: "state" field is used for both states (US) and provinces (Canada, etc.) - they are equivalent.
 *
 * Filter modes:
 * - Text only (city/state/country): Matches events by address text (case-insensitive)
 * - Geospatial only (lat/lng + radius): Matches events within radius (requires stored coordinates)
 * - Both: Uses AND logic - events must match BOTH proximity AND text criteria
 *
 * AND behavior note:
 * When combining text and geospatial filters, events must satisfy ALL conditions.
 * Example: city="London" + radius=50km will only return events within 50km that ALSO
 * have "London" in their city field. Events in suburbs (e.g., "Croydon") within 50km
 * will NOT match. This is by design for precision filtering.
 *
 * For broader "nearby OR matching city" results, use separate queries or consider
 * adding a `combineMode: 'AND' | 'OR'` option to LocationFilterInput in the future.
 */
export const createLocationMatchStage = (location: LocationFilterInput): PipelineStage[] => {
  const { city, state, country, latitude, longitude, radiusKm } = location;
  const stages: PipelineStage[] = [];
  type TextCondition = { $regex: string; $options: 'i' };
  const textConditions: Record<string, TextCondition> = {};

  // City/state/country text-based filtering (case-insensitive regex)
  if (city) {
    textConditions['location.address.city'] = { $regex: city, $options: 'i' };
  }
  if (state) {
    textConditions['location.address.state'] = { $regex: state, $options: 'i' };
  }
  if (country) {
    textConditions['location.address.country'] = { $regex: country, $options: 'i' };
  }

  // Add text conditions as a match stage if present
  if (Object.keys(textConditions).length > 0) {
    stages.push({ $match: textConditions });
  }

  // Geospatial filtering using equirectangular approximation
  // Works with coordinates stored as {latitude, longitude} object
  if (latitude !== undefined && longitude !== undefined) {
    const radiusKmValue = radiusKm || 50; // Default 50km radius

    // Filter out events without coordinates BEFORE distance calculation
    // This avoids computing distance for events we can't locate
    stages.push({
      $match: {
        'location.coordinates.latitude': { $exists: true, $ne: null },
        'location.coordinates.longitude': { $exists: true, $ne: null },
      },
    });

    // Convert degrees to radians for the formula
    const userLatRad = (latitude * Math.PI) / 180;
    const userLngRad = (longitude * Math.PI) / 180;

    // Use $addFields to calculate distance, then filter
    // Equirectangular approximation: d = R * sqrt(Δlat² + (cos(midLat) * Δlng)²)
    //
    // Accuracy notes:
    // - Within ~0.5% error for distances under 100km at mid-latitudes (30°-60°)
    // - Error increases to ~1-2% at 200km or near equator/poles
    // - Acceptable for event discovery (not navigation-grade precision)
    // - For extreme latitudes (>70°) or distances >200km, consider Haversine
    stages.push({
      $addFields: {
        _distanceKm: {
          $let: {
            vars: {
              lat1: userLatRad,
              lng1: userLngRad,
              lat2: { $multiply: ['$location.coordinates.latitude', Math.PI / 180] },
              lng2: { $multiply: ['$location.coordinates.longitude', Math.PI / 180] },
            },
            in: {
              $multiply: [
                6371, // Earth radius in km
                {
                  $sqrt: {
                    $add: [
                      { $pow: [{ $subtract: ['$$lat2', '$$lat1'] }, 2] },
                      {
                        $pow: [
                          {
                            $multiply: [
                              { $cos: { $divide: [{ $add: ['$$lat1', '$$lat2'] }, 2] } },
                              { $subtract: ['$$lng2', '$$lng1'] },
                            ],
                          },
                          2,
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    });

    // Filter by distance
    stages.push({
      $match: {
        _distanceKm: { $lte: radiusKmValue },
      },
    });

    // Remove the temporary distance field
    stages.push({
      $project: {
        _distanceKm: 0,
      },
    });
  }

  return stages;
};

export const createEventPipelineStages = (filters: FilterInput[]): PipelineStage[] => {
  if (!filters.length) {
    return [];
  }

  const buildMatchClause = ({ field, value, operator }: FilterInput) => {
    const operatorSymbol = buildOperatorSymbol(operator);

    if (Array.isArray(value)) {
      if (value.length === 0) {
        throw new Error(`Filter field "${field}" cannot have an empty array as value`);
      }
      const arrayOperator = operatorSymbol === '$ne' ? '$nin' : '$in';
      return {
        [field]: { [arrayOperator]: value },
      };
    }

    return {
      [field]: { [operatorSymbol]: value },
    };
  };

  // Group filters by selectorOperator ($and by default).
  // Any selectorOperator that is not explicitly 'or' or 'nor' falls into the
  // $and bucket so unknown values are never silently dropped.
  const orFilters = filters.filter((f) => f.selectorOperator === SelectorOperatorInput.or);
  const norFilters = filters.filter((f) => f.selectorOperator === SelectorOperatorInput.nor);
  const andFilters = filters.filter(
    (f) => f.selectorOperator !== SelectorOperatorInput.or && f.selectorOperator !== SelectorOperatorInput.nor,
  );

  // Warn at runtime about unexpected selectorOperator values that fall into the $and group
  // (e.g. a future enum value or a client sending a typo).
  andFilters.forEach((f) => {
    if (
      f.selectorOperator !== undefined &&
      f.selectorOperator !== SelectorOperatorInput.and &&
      f.selectorOperator !== SelectorOperatorInput.or &&
      f.selectorOperator !== SelectorOperatorInput.nor
    ) {
      console.warn(
        `[createEventPipelineStages] Unknown selectorOperator "${String(f.selectorOperator)}" on field "${f.field}" — treating as $and.`,
      );
    }
  });

  const matchSegments: Record<string, unknown>[] = [];

  if (andFilters.length === 1) {
    matchSegments.push(buildMatchClause(andFilters[0]));
  } else if (andFilters.length > 1) {
    matchSegments.push({ $and: andFilters.map(buildMatchClause) });
  }

  if (orFilters.length > 0) {
    matchSegments.push({ $or: orFilters.map(buildMatchClause) });
  }

  if (norFilters.length > 0) {
    matchSegments.push({ $nor: norFilters.map(buildMatchClause) });
  }

  const matchPayload = matchSegments.length === 1 ? matchSegments[0] : { $and: matchSegments };

  const matchStage: PipelineStage.Match = {
    $match: matchPayload,
  };

  return [matchStage];
};
