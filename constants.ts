
export const DEFAULT_SETTINGS = {
  startYear: 2024,
  startAge: 25,
  retirementAge: 60,
  initialSocialWage: 8000,
  socialWageGrowthRate: 4.0,
  accountBalance: 0,
  customWages: {},
};

// 个人账户养老金计发月数 (简化版: 50岁-195, 55岁-170, 60岁-139)
export const PENSION_MONTHS_DIVISOR: Record<number, number> = {
  50: 195,
  55: 170,
  60: 139,
  65: 101,
};

export const DEFAULT_DIVISOR = 139;

export const MIN_RATIO = 0.6; // 60%
export const MAX_RATIO = 3.0; // 300%
