import type {FilterInput} from '@ntlango/commons/types';
import {FilterOperatorInput} from '@ntlango/commons/types';
import type {PipelineStage} from 'mongoose';

// Filtering on related/resolved fields (organizers.user.*, participants.*, etc.) now supported via lookup aggregation
const buildOperatorSymbol = (operator?: FilterOperatorInput) => {
  const normalized = operator || FilterOperatorInput.eq;
  return `$${normalized}` as `$${FilterOperatorInput}`;
};

export const createEventPipelineStages = (filters: FilterInput[]): PipelineStage[] => {
  if (!filters.length) {
    return [];
  }

  const buildMatchClause = ({field, value, operator}: FilterInput) => {
    const operatorSymbol = buildOperatorSymbol(operator);

    if (Array.isArray(value)) {
      if (value.length === 0) {
        throw new Error(`Filter field "${field}" cannot have an empty array as value`);
      }
      const arrayOperator = operatorSymbol === '$ne' ? '$nin' : '$in';
      return {
        [field]: {[arrayOperator]: value},
      };
    }

    return {
      [field]: {[operatorSymbol]: value},
    };
  };

  const matchClauses = filters.map(buildMatchClause);
  const matchPayload = matchClauses.length === 1 ? matchClauses[0] : {$and: matchClauses};

  const matchStage: PipelineStage.Match = {
    $match: matchPayload,
  };

  return [matchStage];
};
