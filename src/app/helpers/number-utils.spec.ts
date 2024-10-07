import * as numberUtils from './number-utils';

describe('number utils', () => {
  it('should get random int', () => {
    const re = numberUtils.getRandomInt(1, 2);
    expect(re).toBe(1);
  });

  it('should add 1 to extra code', () => {
    const re = numberUtils.addExtraUniqueCodesForBamboo(2);
    expect(re).toBe(3);
  });
});
