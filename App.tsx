
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ChartSection from './components/ChartSection';
import EditorPanel from './components/EditorPanel';
import ResultCard from './components/ResultCard';
import { PensionDataPoint, PensionSettings, CalculationResult } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { generateInitialData, calculatePension } from './utils/calculation';
import { analyzePensionPlan } from './services/geminiService';

const App: React.FC = () => {
  // 1. State for Settings
  const [settings, setSettings] = useState<PensionSettings>(DEFAULT_SETTINGS);
  
  // 2. State for Time-series Data
  const [data, setData] = useState<PensionDataPoint[]>([]);

  // 3. State for Interaction
  const [activeYearIndex, setActiveYearIndex] = useState<number | null>(null);
  
  // 4. State for Results & AI
  const [result, setResult] = useState<CalculationResult>({
    monthlyBasicPension: 0,
    monthlyPersonalPension: 0,
    totalMonthly: 0,
    totalAccumulated: 0,
    averageIndex: 0,
    basicPensionReplacementRate: 0,
    periodContribution: 0,
    monthsDivisor: 139,
    contributionYears: 0
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  // 5. State for Rules Modal
  const [showRules, setShowRules] = useState(false);

  // Ref to prevent data regeneration loop when importing project
  const skipDataResetRef = useRef(false);

  // Initialize Data when settings involving duration change
  useEffect(() => {
    // If we just imported a project, we want to keep the imported data (which contains manual overrides),
    // rather than regenerating fresh data from settings.
    if (skipDataResetRef.current) {
        skipDataResetRef.current = false;
        return;
    }

    // Only regenerate if the array length needs to change significantly or it's first load
    const newData = generateInitialData(settings);
    setData(newData);
    // Reset selection if out of bounds or default to middle
    if (activeYearIndex === null || activeYearIndex >= newData.length) {
        setActiveYearIndex(Math.floor(newData.length / 2));
    }
    
    // Clear AI analysis when data resets
    setAiAnalysis(null);
  }, [settings.startYear, settings.retirementAge, settings.startAge, settings.initialSocialWage, settings.socialWageGrowthRate, settings.customWages]);

  // Recalculate whenever data or balance changes
  useEffect(() => {
    const calc = calculatePension(data, settings);
    setResult(calc);
  }, [data, settings.accountBalance, settings.retirementAge]);

  // Handler for Data Updates (Ratio, User Wage, or Social Wage)
  const handleDataUpdate = useCallback((index: number, field: 'ratio' | 'userWage' | 'socialAverageWage', value: number) => {
    setData(prevData => {
      const newData = [...prevData];
      // Create a shallow copy of the item to avoid mutating state directly
      const item = { ...newData[index] };

      if (field === 'ratio') {
          item.ratio = value;
          item.userWage = Math.round(item.socialAverageWage * value);
      } else if (field === 'userWage') {
          item.userWage = value;
          // Recalculate ratio based on new wage
          item.ratio = item.socialAverageWage > 0 ? value / item.socialAverageWage : 0;
      } else if (field === 'socialAverageWage') {
          item.socialAverageWage = value;
          // Recalculate ratio based on new social wage (assuming user wage stays constant)
          item.ratio = value > 0 ? item.userWage / value : 0;
      }
      
      // Update array with new item
      newData[index] = item;
      return newData;
    });
    // Invalidate AI analysis as data changed
    setAiAnalysis(null);
  }, []);

  // Handler for Setting Changes
  const handleSettingChange = (key: keyof PensionSettings, value: number | Record<number, number>) => {
      setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handler for AI Analysis
  const handleAnalyze = async () => {
      setAiLoading(true);
      const analysis = await analyzePensionPlan(data, result, settings);
      setAiAnalysis(analysis);
      setAiLoading(false);
  };

  // Handler for Exporting Project
  const handleExportProject = () => {
    const projectData = {
        version: 1,
        timestamp: new Date().toISOString(),
        settings,
        data // Exports current data including manual overrides
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pension-plan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handler for Importing Project
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            // Basic validation
            if (json.settings && Array.isArray(json.data)) {
                // Set flag to skip the automatic data regeneration in useEffect
                // This ensures we keep the specific data points (with manual overrides) from the file
                skipDataResetRef.current = true;
                
                setSettings(json.settings);
                setData(json.data);
                setAiAnalysis(null); // Clear old analysis
                setActiveYearIndex(Math.floor(json.data.length / 2));
            } else {
                alert("文件格式不正确：缺少 settings 或 data 字段");
            }
        } catch (error) {
            console.error("Import failed", error);
            alert("文件解析失败，请确保是有效的 JSON 文件");
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = ''; 
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    P
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">PensionFlow</h1>
            </div>
            <div className="text-sm text-gray-500 hidden md:block">
                可视化交互式退休金测算
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visuals & Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
            <ChartSection 
                data={data} 
                activeIndex={activeYearIndex} 
                onYearSelect={setActiveYearIndex} 
            />
            
            <EditorPanel 
                selectedYearIndex={activeYearIndex}
                data={data}
                settings={settings}
                onDataUpdate={handleDataUpdate}
                onSettingChange={handleSettingChange}
                onExport={handleExportProject}
                onImport={handleImportProject}
            />
        </div>

        {/* Right Column: Results & AI (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
            <ResultCard 
                result={result} 
                loading={aiLoading} 
                onAnalyze={handleAnalyze} 
                aiAnalysis={aiAnalysis} 
            />

            {/* Quick Tips Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-800">使用指南</h4>
                    <button 
                        onClick={() => setShowRules(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        计算规则?
                    </button>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">1.</span>
                        点击左侧图表中的<span className="font-bold text-emerald-600">绿色节点</span>选中具体年份。
                    </li>
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">2.</span>
                        拖动下方滑块调整该年的缴费指数 (0.6 - 3.0)。
                    </li>
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">3.</span>
                        直接输入“当年社平工资”或“个人缴费基数”可进行精确调整。
                    </li>
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">4.</span>
                        点击“生成规划建议”获取 AI 提供的优化报告。
                    </li>
                </ul>
            </div>
        </div>

      </main>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0">
                    <h3 className="font-bold text-gray-800 text-lg">测算公式说明</h3>
                    <button onClick={() => setShowRules(false)} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 space-y-8 text-sm text-gray-600">
                    
                    {/* Basic Pension */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-emerald-600 flex items-center gap-2">
                            1. 基础养老金
                        </h4>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center justify-center text-sm md:text-base overflow-x-auto">
                            <span className="whitespace-nowrap font-medium text-gray-500 mr-3">基础养老金</span>
                            <span className="mr-3">=</span>
                            <div className="flex flex-col items-center text-center">
                                <div className="border-b-2 border-gray-400 pb-1 px-2 mb-1">
                                    <span className="whitespace-nowrap">(社平工资 + 社平工资 × 平均指数)</span>
                                </div>
                                <div className="font-medium text-gray-700">2</div>
                            </div>
                            <span className="mx-3">×</span>
                            <span className="whitespace-nowrap">缴费年限</span>
                            <span className="mx-3">×</span>
                            <span className="text-emerald-600 font-bold">1%</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                            <li><span className="font-medium text-gray-700">社平工资</span>: 采用您预测的退休当年社会平均工资。</li>
                            <li><span className="font-medium text-gray-700">平均指数</span>: 历年(个人基数 ÷ 当年社平)的算术平均值。</li>
                        </ul>
                    </div>

                    {/* Personal Pension */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-blue-600 flex items-center gap-2">
                            2. 个人账户养老金
                        </h4>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center justify-center text-sm md:text-base">
                            <span className="whitespace-nowrap font-medium text-gray-500 mr-3">个人账户养老金</span>
                            <span className="mr-3">=</span>
                            <div className="flex flex-col items-center text-center">
                                <div className="border-b-2 border-gray-400 pb-1 px-2 mb-1">
                                    <span className="whitespace-nowrap">个人账户总额</span>
                                </div>
                                <div className="font-medium text-gray-700">计发月数</div>
                            </div>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                            <li><span className="font-medium text-gray-700">账户总额</span>: 初始余额 + 模拟期间累积存入(个人基数 × 8%)。</li>
                            <li><span className="font-medium text-gray-700">计发月数</span>: 国家标准 (如50岁195, 60岁139等)。</li>
                        </ul>
                    </div>

                    {/* 3. Personal Average Contribution Index */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2">
                            3. 个人平均缴费指数
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-center text-sm overflow-x-auto">
                            <span className="whitespace-nowrap font-medium text-gray-500 mr-3">平均缴费指数</span>
                            <span className="mr-3">=</span>
                            <div className="flex flex-col items-center text-center">
                                <div className="border-b-2 border-gray-400 pb-1 px-2 mb-1">
                                    <span className="whitespace-nowrap italic font-serif">(X₁/C₁ + X₂/C₂ + ... + Xₙ/Cₙ)</span>
                                </div>
                                <div className="font-medium text-gray-700">N<sub>实际</sub></div>
                            </div>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                            <li><span className="font-medium">Xₙ</span>: 第n年的年度缴费基数。 <span className="font-medium">Cₙ</span>: 对应年份的社平工资。</li>
                            <li><span className="font-medium">N<sub>实际</sub></span>: 实际缴费年限 (不含视同缴费)。断缴年份不纳入计算（既不计入分子，也不计入分母N实际）。</li>
                        </ul>
                    </div>

                    {/* 4. Annual Contribution Base */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2">
                            4. 本人某年度缴费基数
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-center text-sm overflow-x-auto">
                            <span className="whitespace-nowrap font-medium text-gray-500 mr-3">年度缴费基数</span>
                            <span className="mr-3">=</span>
                            <div className="flex flex-col items-center text-center">
                                <div className="border-b-2 border-gray-400 pb-1 px-2 mb-1">
                                    <span className="whitespace-nowrap italic">(1月基数 + 2月基数 + ... + 12月基数)</span>
                                </div>
                                <div className="font-medium text-gray-700">12</div>
                            </div>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                            <li><span className="font-bold">断缴月份“0”计算</span>: 如果某月中途断缴，则该月基数为0，分母12不变。</li>
                            <li><span className="font-medium">在职职工</span>: 按上年度月平均工资确定。</li>
                            <li><span className="font-medium">灵活就业</span>: 在当年公布的基数上下限间自主选择。</li>
                        </ul>
                    </div>

                    {/* 5. Accumulated Contribution Years */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2">
                            5. 累计缴费年限 (年)
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-center text-sm">
                            <span className="whitespace-nowrap font-medium text-gray-500 mr-3">累计年限</span>
                            <span className="mr-3">=</span>
                            <div className="flex flex-col items-center text-center">
                                <div className="border-b-2 border-gray-400 pb-1 px-2 mb-1">
                                    <span className="whitespace-nowrap">累计缴费总月数</span>
                                </div>
                                <div className="font-medium text-gray-700">12</div>
                            </div>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                            <li><span className="font-bold">断缴月份不计入</span>: 只计算实际成功缴费的月份。</li>
                            <li>该年限同时影响<span className="font-medium text-emerald-600">基础养老金</span>的计算和<span className="font-medium text-blue-600">个人账户</span>的累积。</li>
                        </ul>
                    </div>

                    <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs border border-amber-100 mt-6">
                        <strong>注：</strong> 本工具仅为简化估算模型，不包含“过渡性养老金”等复杂情况。实际金额受退休地政策、社平工资实际增长率、个人账户利息等多种因素影响，仅供规划参考。
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 text-right sticky bottom-0 border-t border-gray-200">
                    <button 
                        onClick={() => setShowRules(false)}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
