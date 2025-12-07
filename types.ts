
export interface PensionDataPoint {
  year: number;
  socialAverageWage: number; // 社会平均工资
  userWage: number; // 用户实际工资/缴费基数
  ratio: number; // 缴费指数 (User / Social)
}

export interface PensionSettings {
  startYear: number;
  retirementAge: number;
  startAge: number; // 起始缴费年龄 (was currentAge)
  initialSocialWage: number;
  socialWageGrowthRate: number; // Percentage (e.g., 5 for 5%)
  accountBalance: number; // Existing personal account balance at startYear
  customWages?: Record<number, number>; // Imported custom wages (Year -> Wage)
}

export interface CalculationResult {
  monthlyBasicPension: number; // 基础养老金
  monthlyPersonalPension: number; // 个人账户养老金
  totalMonthly: number; // 总月领
  totalAccumulated: number; // 个人账户累计储存额 (estimated)
  averageIndex: number; // 平均缴费指数
  basicPensionReplacementRate: number; // 基础养老金占退休时社平工资比例
  periodContribution: number; // 模拟期间的累计缴费 (was futureContribution)
  monthsDivisor: number; // 计发月数
  contributionYears: number; // 实际缴费年限 (excluding 0 wage years)
}
