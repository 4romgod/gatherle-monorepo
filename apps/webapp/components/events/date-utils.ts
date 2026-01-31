import { RRule } from 'rrule';
import { upperFirst } from 'lodash';

export const formatRecurrenceRule = (rule?: string | null): string => {
  if (!rule) {
    return 'Schedule coming soon';
  }

  try {
    return upperFirst(RRule.fromString(rule).toText());
  } catch (error) {
    console.error('Unable to parse recurrence rule', error);
    return 'Schedule coming soon';
  }
};
