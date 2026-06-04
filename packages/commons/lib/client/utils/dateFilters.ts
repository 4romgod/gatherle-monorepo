import { DATE_FILTER_LABELS } from '../../constants/general';

export function getDateFilterLabel(option: string): string {
  return DATE_FILTER_LABELS[option as keyof typeof DATE_FILTER_LABELS] ?? option;
}
