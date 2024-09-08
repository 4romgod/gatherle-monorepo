import {getStatusCodeColor} from '@/utils';

describe('getStatusCodeColor', () => {
  it('should return green for 2xx status codes', () => {
    expect(getStatusCodeColor(200)).toBe('\x1b[32m');
    expect(getStatusCodeColor(204)).toBe('\x1b[32m');
    expect(getStatusCodeColor(299)).toBe('\x1b[32m');
  });

  it('should return yellow for 4xx status codes', () => {
    expect(getStatusCodeColor(400)).toBe('\x1b[33m');
    expect(getStatusCodeColor(404)).toBe('\x1b[33m');
    expect(getStatusCodeColor(499)).toBe('\x1b[33m');
  });

  it('should return red for 5xx status codes', () => {
    expect(getStatusCodeColor(500)).toBe('\x1b[31m');
    expect(getStatusCodeColor(502)).toBe('\x1b[31m');
    expect(getStatusCodeColor(599)).toBe('\x1b[31m');
  });

  it('should return gray for unknown status codes', () => {
    expect(getStatusCodeColor(100)).toBe('\x1b[90m');
    expect(getStatusCodeColor(600)).toBe('\x1b[90m');
    expect(getStatusCodeColor(123)).toBe('\x1b[90m');
  });
});
