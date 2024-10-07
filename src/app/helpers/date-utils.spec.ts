import { formatDateTime } from './date-utils';

describe('date utils helpers', () => {
  it('should formate date, ignore time and default time to end of day', () => {
    const re = formatDateTime('7/16/2020');
    const re2 = formatDateTime('7/16/2020', '02:00 AM');
    expect(re.split('T')[1]).toBe(re2.split('T')[1]);
  });
});
