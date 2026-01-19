import type { typeToFlattenedError } from 'zod';

export type ZodFieldErrors<T, U = string> = typeToFlattenedError<T, U>['fieldErrors'];

export type FormActionStateProps<ResultType, InputType> = {
  data: ResultType | null;
  apiError: string | null;
  zodErrors: ZodFieldErrors<InputType> | null;
};
