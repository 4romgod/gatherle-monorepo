import { CreateEventInputType, EventCategoryType, Location } from '@/data/graphql/types/graphql';
import { SxProps, Theme } from '@mui/material';

export type DisplayEventFiltersProps = {
  categoryList: EventCategoryType[];
};

export type EventMutationFormProps = {
  onSubmit?: (eventData: CreateEventInputType) => void;
  categoryList: EventCategoryType[];
};

export type LocationInputProps = {
  onChange: (newLocation: Location) => void;
};

export type RecurrenceInputProps = {
  onChange: (rrule: string) => void;
};

export type StatusFilterProps = {
  sxProps?: SxProps<Theme>;
};

export type CategoryFilterProps = {
  sxProps?: SxProps<Theme>;
  categoryList: EventCategoryType[];
  onChange?: (eventCategoryList: string[]) => void;
};

export type EventDateInputProps = {
  onChange: (value: string) => void;
};

export type EventTypeRadioButtonsProps = {
  selectedType: string;
  onChange: (value: string) => void;
};

export type LocationTypeRadioButtonsProps = {
  selectedType: string;
  onChange: (value: string) => void;
};
