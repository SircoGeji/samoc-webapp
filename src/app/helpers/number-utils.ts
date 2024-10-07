export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
};

export const EXTRA_CODES_FOR_BAMBOO = 1;

export const addExtraUniqueCodesForBamboo = (count: number): number => {
  // prepare extra coupons for Bamboo testing - only applies to bulk offer code type
  return count + EXTRA_CODES_FOR_BAMBOO;
};
