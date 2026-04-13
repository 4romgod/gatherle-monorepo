import { differenceInYears, format, isValid, parseISO } from 'date-fns';

type BirthdateDisplay = {
  age: number | null;
  formattedBirthdate: string | null;
};

export function getBirthdateDisplay(birthdate?: string | null): BirthdateDisplay {
  if (!birthdate) {
    return { age: null, formattedBirthdate: null };
  }

  const parsedBirthdate = parseISO(birthdate);
  if (!isValid(parsedBirthdate)) {
    return { age: null, formattedBirthdate: null };
  }

  return {
    age: differenceInYears(new Date(), parsedBirthdate),
    formattedBirthdate: format(parsedBirthdate, 'dd MMMM yyyy'),
  };
}
