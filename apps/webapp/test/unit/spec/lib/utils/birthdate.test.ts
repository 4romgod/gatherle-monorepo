import { getBirthdateDisplay } from '@/lib/utils/birthdate';

describe('getBirthdateDisplay', () => {
  it('returns null values when birthdate is missing', () => {
    expect(getBirthdateDisplay()).toEqual({
      age: null,
      formattedBirthdate: null,
    });
  });

  it('returns null values when birthdate is invalid', () => {
    expect(getBirthdateDisplay('not-a-date')).toEqual({
      age: null,
      formattedBirthdate: null,
    });
  });

  it('formats a valid birthdate', () => {
    const result = getBirthdateDisplay('2000-01-15');

    expect(result.formattedBirthdate).toBe('15 January 2000');
    expect(result.age).toEqual(expect.any(Number));
  });
});
