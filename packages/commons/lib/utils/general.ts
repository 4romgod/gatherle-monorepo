import mongoose from 'mongoose';
import { isValid, parseISO } from 'date-fns';

export const validateDate = (date: string) => {
  return isValid(parseISO(date));
};

export const isDateNotInFuture = (date: string) => {
  const parsed = parseISO(date);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.getTime() <= Date.now();
};

export const transformEnumToErrorMessage = (enumType: any) => {
  return Object.values(enumType).slice(0, -1).join(', ') + ', or ' + Object.values(enumType).slice(-1);
};

export const validateMongodbId = (id: string, message?: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return true;
  }
  return true;
};
