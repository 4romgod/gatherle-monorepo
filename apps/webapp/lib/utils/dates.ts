import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(customParseFormat);

export const getDateDistanceToNow = (dateString: string) => {
  const date = dayjs(dateString);
  const distance = dayjs().to(date);
  return distance;
};

export const getFormattedDate = (dateString: string) => {
  const date = dayjs(dateString);
  const formatted = date.format('dddd, MMMM D, YYYY · h:mma');
  return formatted;
};
