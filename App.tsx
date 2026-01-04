
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChartSection from './components/ChartSection';
import EditorPanel from './components/EditorPanel';
import ResultCard from './components/ResultCard';
import { PensionDataPoint, PensionSettings, CalculationResult } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { generateInitialData, calculatePension } from './utils/calculation';

const App: React.FC = () => {
  // 1. State for Settings
  const [settings, setSettings] = useState<PensionSettings>(DEFAULT_SETTINGS);
  
  // 2. State for Time-series Data
  const [data, setData] = useState<PensionDataPoint[]>([]);

  // 3. State for Interaction
  const [activeYearIndex, setActiveYearIndex] = useState<number | null>(null);
  
  // 4. State for Results
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
  
  // 5. State for Rules Modal
  const [showRules, setShowRules] = useState(false);

  // Ref to prevent data regeneration loop when importing project
  const skipDataResetRef = useRef(false);

  // Initialize/Update Data while preserving user edits
  useEffect(() => {
    if (skipDataResetRef.current) {
        skipDataResetRef.current = false;
        return;
    }

    // 1. Generate standard baseline based on new settings
    const baselineData = generateInitialData(settings);
    
    // 2. Merge with existing data to preserve user's ratio edits
    setData(prevData => {
        if (prevData.length === 0) return baselineData;

        // Create a map of year -> ratio from current data
        const ratioMap = new Map<number, number>();
        prevData.forEach(item => ratioMap.set(item.year, item.ratio));

        // Create new data points preserving the ratios where they exist
        const mergedData = baselineData.map(point => {
            const preservedRatio = ratioMap.get(point.year);
            if (preservedRatio !== undefined) {
                return {
                    ...point,
                    ratio: preservedRatio,
                    userWage: Math.round(point.socialAverageWage * preservedRatio)
                };
            }
            return point;
        });

        return mergedData;
    });

    // Ensure active index stays valid
    setActiveYearIndex(prev => {
        const retirementYear = settings.startYear + (settings.retirementAge - settings.startAge);
        const maxIndex = retirementYear - settings.startYear - 1;
        if (prev === null) return Math.floor(maxIndex / 2);
        return Math.min(prev, maxIndex);
    });
  }, [
    settings.startYear, 
    settings.retirementAge, 
    settings.startAge, 
    settings.initialSocialWage, 
    settings.socialWageGrowthRate, 
    settings.customWages
  ]);

  // Recalculate whenever data or balance changes
  useEffect(() => {
    const calc = calculatePension(data, settings);
    setResult(calc);
  }, [data, settings.accountBalance, settings.retirementAge]);

  // Handler for Data Updates (Ratio, User Wage, or Social Wage)
  const handleDataUpdate = useCallback((index: number, field: 'ratio' | 'userWage' | 'socialAverageWage', value: number) => {
    setData(prevData => {
      const newData = [...prevData];
      if (!newData[index]) return prevData;
      
      const item = { ...newData[index] };

      if (field === 'ratio') {
          item.ratio = value;
          item.userWage = Math.round(item.socialAverageWage * value);
      } else if (field === 'userWage') {
          item.userWage = value;
          item.ratio = item.socialAverageWage > 0 ? value / item.socialAverageWage : 0;
      } else if (field === 'socialAverageWage') {
          item.socialAverageWage = value;
          item.ratio = value > 0 ? item.userWage / value : 0;
      }
      
      newData[index] = item;
      return newData;
    });
  }, []);

  // Handler for Setting Changes
  const handleSettingChange = (key: keyof PensionSettings, value: number | Record<number, number>) => {
      setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handler for Exporting Project
  const handleExportProject = () => {
    const projectData = {
        version: 1,
        timestamp: new Date().toISOString(),
        settings,
        data 
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

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (json.settings && Array.isArray(json.data)) {
                skipDataResetRef.current = true;
                setSettings(json.settings);
                setData(json.data);
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
    e.target.value = ''; 
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
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
        
        <div className="lg:col-span-8 space-y-6">
            <ChartSection 
                data={data} 
                activeIndex={activeYearIndex} 
                onYearSelect={setActiveYearIndex} 
                onDataUpdate={handleDataUpdate}
            />
            
            <EditorPanel 
                selectedYearIndex={activeYearIndex}
                data={data}
                settings={settings}
                onDataUpdate={handleDataUpdate}
                onSettingChange={handleSettingChange}
                onYearSelect={setActiveYearIndex}
                onExport={handleExportProject}
                onImport={handleImportProject}
            />
        </div>

        <div className="lg:col-span-4 space-y-6">
            <ResultCard result={result} />

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
                        在图表中<span className="font-bold text-emerald-600">点击选中</span>对应年份，或使用面板上的箭头快速切换。
                    </li>
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">2.</span>
                        使用下方滑块调整选中年份的缴费指数 (0.6 - 3.0)。
                    </li>
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">3.</span>
                        直接输入“当年社平工资”或“个人缴费基数”可进行精确调整。
                    </li>
                    <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">4.</span>
                        系统将根据你的调整实时更新右侧退休金预估数值。
                    </li>
                </ul>
            </div>
        </div>

      </main>

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
                    </div>

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
                    </div>

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
                    </div>

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
                    </div>

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
