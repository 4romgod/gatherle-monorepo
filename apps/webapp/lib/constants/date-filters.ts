// Date filter constants
// Synced from @gatherle/commons/lib/constants/general.ts

export enum DATE_FILTER_OPTIONS {
  TODAY = 'TODAY',
  TOMORROW = 'TOMORROW',
  THIS_WEEK = 'THIS_WEEK',
  THIS_WEEKEND = 'THIS_WEEKEND',
  THIS_MONTH = 'THIS_MONTH',
  CUSTOM = 'CUSTOM', // UI-only
}

export type DateFilterOption = Exclude<DATE_FILTER_OPTIONS, DATE_FILTER_OPTIONS.CUSTOM>;

export const DATE_FILTER_LABELS: Record<DateFilterOption | typeof DATE_FILTER_OPTIONS.CUSTOM, string> = {
  [DATE_FILTER_OPTIONS.TODAY]: 'Today',
  [DATE_FILTER_OPTIONS.TOMORROW]: 'Tomorrow',
  [DATE_FILTER_OPTIONS.THIS_WEEK]: 'This Week',
  [DATE_FILTER_OPTIONS.THIS_WEEKEND]: 'This Weekend',
  [DATE_FILTER_OPTIONS.THIS_MONTH]: 'This Month',
  [DATE_FILTER_OPTIONS.CUSTOM]: 'Custom',
};
