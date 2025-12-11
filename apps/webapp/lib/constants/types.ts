import { CreateEventInput, EventCategory, Location } from '@/data/graphql/types/graphql';
import { SxProps, Theme } from '@mui/material';

export type DisplayEventFiltersProps = {
  categoryList: EventCategory[];
};

export type EventMutationFormProps = {
  onSubmit?: (eventData: CreateEventInput) => void;
  categoryList: EventCategory[];
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
  categoryList: EventCategory[];
  onChange?: (eventCategoryList: string[]) => void;
};

export type EventDateInputProps = {
  onChange: (value: string) => void;
};

export type EventRadioButtonsProps = {
  selectedType: string;
  onChange: (value: string) => void;
};

export type LocationTypeRadioButtonsProps = {
  selectedType: string;
  onChange: (value: string) => void;
};
