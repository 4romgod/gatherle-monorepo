import {FilterInput, FilterOperatorInput} from '@/graphql/types';
import {PipelineStage} from 'mongoose';

// TODO 1. Functionality for RootQuerySelector like ($and, $or, $text)
export const createEventPipelineStages = (filters: FilterInput[]): PipelineStage[] => {
    const pipelineStages: PipelineStage[] = [];
    const matchOptions: PipelineStage.Match = {
        $match: {},
    };

    filters.forEach((filter) => {
        const {field, value, operator} = filter;
        const operatorSymbol: `$${FilterOperatorInput}` = `$${operator || FilterOperatorInput.eq}`;

        if (field.includes('.')) {
            const [rootField, nestedField] = field.split('.');
            const addField: PipelineStage.AddFields = {
                $addFields: {
                    [`value.${rootField}`]: {
                        $filter: {
                            input: `$${rootField}`,
                            as: `${rootField}Item`,
                            cond: {
                                $eq: [`$$${rootField}Item.${nestedField}`, value],
                            },
                        },
                    },
                },
            };
            pipelineStages.push(addField);
            matchOptions.$match[`value.${rootField}.0.${nestedField}`] = {[operatorSymbol]: value};
        } else {
            matchOptions.$match[field] = {[operatorSymbol]: value};
        }
    });

    pipelineStages.push(matchOptions);

    return pipelineStages;
};
