import {ANSI_COLOR_CODES, STATUS_CODE_COLOR_MAP} from '@/constants';

export const getStatusCodeColor = (statusCode: number) => {
    const statusString = statusCode.toString();
    const map = STATUS_CODE_COLOR_MAP.find((entry) => entry.range.test(statusString));
    return map ? map.color : ANSI_COLOR_CODES.GRAY;
};
