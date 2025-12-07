import { GoogleGenAI } from "@google/genai";
import { PensionDataPoint, CalculationResult, PensionSettings } from "../types";

const apiKey = process.env.API_KEY || '';
// Note: In a real production app, we should check if key exists.
// For this demo, we assume environment is set up correctly as per instructions.
const ai = new GoogleGenAI({ apiKey });

export const analyzePensionPlan = async (
  data: PensionDataPoint[],
  result: CalculationResult,
  settings: PensionSettings
): Promise<string> => {
  
  // Downsample data for prompt if it's too long (e.g., take every 5th year + first + last)
  const summaryData = data.filter((_, idx) => idx === 0 || idx === data.length - 1 || idx % 5 === 0)
    .map(d => `年份${d.year}: 缴费指数${d.ratio.toFixed(2)}, 预估社平${d.socialAverageWage}`).join('\n');

  const prompt = `
    你是一位专业的中国养老金规划顾问。请根据以下用户数据进行分析并给出建议。

    **用户基本情况**:
    - 起始缴费年龄: ${settings.startAge} 岁
    - 退休年龄: ${settings.retirementAge} 岁
    - 缴费/模拟总年限: ${data.length} 年
    - 初始个人账户余额(起始年之前): ${settings.accountBalance} 元

    **测算结果**:
    - 预估退休时月领总额: ${result.totalMonthly} 元
    - 其中基础养老金: ${result.monthlyBasicPension} 元
    - 个人账户养老金: ${result.monthlyPersonalPension} 元
    - 全程平均缴费指数: ${result.averageIndex.toFixed(2)}

    **缴费趋势抽样**:
    ${summaryData}

    请给出以下反馈（请用Markdown格式，保持条理清晰，语气专业且亲切）：
    1. **方案评估**: 这个退休金水平在当前物价下处于什么水平（假设基准城市为一线或二线城市）？
    2. **缴费策略分析**: 用户的缴费指数曲线是否合理？（例如是否前期低后期高，或者一直保持低位）。
    3. **优化建议**: 如果想要提高退休金，最经济有效的调整策略是什么？（例如：延长缴费年限 vs 提高缴费基数）。
    4. **风险提示**: 考虑到通胀和社会工资增长，这个数字的实际购买力可能存在的风险。
    
    请控制在400字以内。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "无法生成分析报告，请稍后再试。";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "AI 分析服务暂时不可用，请检查网络或 API Key 设置。";
  }
};