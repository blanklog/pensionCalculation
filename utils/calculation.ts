
import { PensionDataPoint, PensionSettings, CalculationResult } from '../types';
import { PENSION_MONTHS_DIVISOR, DEFAULT_DIVISOR } from '../constants';

export const generateInitialData = (settings: PensionSettings): PensionDataPoint[] => {
  const data: PensionDataPoint[] = [];
  
  // Calculate the calendar year of retirement based on start age and start year
  // Formula: RetirementYear = StartYear + (RetirementAge - StartAge)
  const retirementYear = settings.startYear + (settings.retirementAge - settings.startAge);
  
  // Validate range
  if (settings.startAge >= settings.retirementAge) {
      return [];
  }

  let currentSocialWage = settings.initialSocialWage;

  for (let year = settings.startYear; year < retirementYear; year++) {
    // Determine wage for this year: Use custom data if available, otherwise use projected
    let wageForYear = currentSocialWage;
    
    if (settings.customWages && settings.customWages[year] !== undefined) {
        wageForYear = settings.customWages[year];
    }

    data.push({
      year,
      socialAverageWage: Math.round(wageForYear),
      userWage: Math.round(wageForYear * 1.0), // Default 100% of the determined social wage
      ratio: 1.0,
    });
    
    // Calculate base for next year (applies growth rate to THIS year's actual used wage)
    // If next year also has custom data, this value will be overwritten in the next iteration.
    // If next year is missing data, it will smoothly grow from this year's value.
    currentSocialWage = wageForYear * (1 + settings.socialWageGrowthRate / 100);
  }
  return data;
};

export const calculatePension = (data: PensionDataPoint[], settings: PensionSettings): CalculationResult => {
  if (data.length === 0) {
    return {
      monthlyBasicPension: 0,
      monthlyPersonalPension: 0,
      totalMonthly: 0,
      totalAccumulated: 0,
      averageIndex: 0,
      basicPensionReplacementRate: 0,
      periodContribution: 0,
      monthsDivisor: 139,
      contributionYears: 0,
    };
  }

  // Identify effective contribution years (where user wage > 0)
  // This supports the feature of setting wage to 0 to simulate a break in payment.
  const effectiveData = data.filter(d => d.userWage > 0);
  const yearsWorked = effectiveData.length;

  const lastYearData = data[data.length - 1];
  const finalSocialWage = lastYearData.socialAverageWage;
  
  // 1. Calculate Average Contribution Index based on EFFECTIVE years
  const totalRatio = effectiveData.reduce((sum, item) => sum + item.ratio, 0);
  const averageIndex = yearsWorked > 0 ? totalRatio / yearsWorked : 0;

  // 2. Basic Pension Calculation
  const monthlyBasicPension = ((finalSocialWage + finalSocialWage * averageIndex) / 2) * yearsWorked * 0.01;

  // 3. Personal Account Pension
  // Logic: 
  // totalAccumulated = Initial Balance (settings.accountBalance) + Sum of all contributions in the chart
  // Note: Even if userWage is 0, the math works out (0 * 0.08 = 0), so we can reduce over the full data or effective data.
  const periodContribution = data.reduce((sum, item) => {
    return sum + (item.userWage * 0.08 * 12);
  }, 0);

  const totalAccumulated = settings.accountBalance + periodContribution;
  
  const divisor = PENSION_MONTHS_DIVISOR[settings.retirementAge] || DEFAULT_DIVISOR;
  const monthlyPersonalPension = totalAccumulated / divisor;

  // 4. Calculate Replacement Rate for Basic Pension (vs Final Social Wage)
  const basicPensionReplacementRate = finalSocialWage > 0 ? monthlyBasicPension / finalSocialWage : 0;

  return {
    monthlyBasicPension: Math.round(monthlyBasicPension),
    monthlyPersonalPension: Math.round(monthlyPersonalPension),
    totalMonthly: Math.round(monthlyBasicPension + monthlyPersonalPension),
    totalAccumulated: Math.round(totalAccumulated),
    averageIndex: parseFloat(averageIndex.toFixed(4)),
    basicPensionReplacementRate,
    periodContribution: Math.round(periodContribution),
    monthsDivisor: divisor,
    contributionYears: yearsWorked,
  };
};
