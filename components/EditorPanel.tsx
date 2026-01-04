
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PensionDataPoint, PensionSettings } from '../types';
import { MIN_RATIO, MAX_RATIO } from '../constants';

interface EditorPanelProps {
  selectedYearIndex: number | null;
  data: PensionDataPoint[];
  settings: PensionSettings;
  onDataUpdate: (index: number, field: 'ratio' | 'userWage' | 'socialAverageWage', value: number) => void;
  onSettingChange: (key: keyof PensionSettings, value: any) => void;
  onYearSelect: (index: number) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface CityData {
  name: string;
  wages: Record<number, number>;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  selectedYearIndex,
  data,
  settings,
  onDataUpdate,
  onSettingChange,
  onYearSelect,
  onExport,
  onImport,
}) => {
  // Manual Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [parsedCities, setParsedCities] = useState<CityData[]>([]);
  const [selectedCityIndex, setSelectedCityIndex] = useState<number>(-1);
  const [importError, setImportError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Local state for global settings to prevent rapid re-calculations during typing
  const [localSettings, setLocalSettings] = useState<PensionSettings>(settings);

  // Sync local settings when props change (from external source or city selection)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Built-in Database State
  const [dbCities, setDbCities] = useState<CityData[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [isDbDropdownOpen, setIsDbDropdownOpen] = useState(false);
  const dbDropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dbDropdownRef.current && !dbDropdownRef.current.contains(event.target as Node)) {
        setIsDbDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Built-in Database on Mount
  useEffect(() => {
    const loadBuiltInDb = async () => {
      try {
        const response = await fetch('/social_wages.xlsx');
        if (!response.ok) {
            console.warn("Built-in database not found at /social_wages.xlsx");
            setIsDbLoading(false);
            return;
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        const cities = parseDataArray(jsonData);
        setDbCities(cities);
      } catch (error) {
        console.error("Failed to load built-in database:", error);
      } finally {
        setIsDbLoading(false);
      }
    };

    loadBuiltInDb();
  }, []);

  const parseDataArray = (rows: any[][]): CityData[] => {
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => String(h).trim());
        const yearIndices: Record<number, number> = {};
        
        headers.forEach((h, idx) => {
            const year = parseInt(h);
            if (!isNaN(year) && year > 1900 && year < 2100) {
                yearIndices[idx] = year;
            }
        });

        if (Object.keys(yearIndices).length === 0) return [];

        const cities: CityData[] = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const cityName = String(row[0] || '').trim(); 
            if (!cityName) continue;

            const wages: Record<number, number> = {};
            let validWageCount = 0;

            Object.entries(yearIndices).forEach(([colIdx, year]) => {
                const val = row[parseInt(colIdx)];
                if (val !== undefined && val !== null && val !== '') {
                    const numVal = parseFloat(String(val).replace(/,/g, ''));
                    if (!isNaN(numVal)) {
                        wages[year] = numVal;
                        validWageCount++;
                    }
                }
            });

            if (validWageCount > 0) {
                cities.push({ name: cityName, wages });
            }
        }
        return cities;
  };

  const handleManualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);
    setParsedCities([]);
    setSelectedCityIndex(-1);

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        const cities = parseDataArray(jsonData);
        if (cities.length === 0) {
             setImportError("未解析到有效数据，请检查格式 (第一行年份，第一列城市)");
        } else {
             setParsedCities(cities);
             setSelectedCityIndex(0);
        }

    } catch (error) {
        console.error("File read error:", error);
        setImportError("读取文件失败");
    } finally {
        e.target.value = '';
    }
  };

  const applyCityData = (city: CityData) => {
      onSettingChange('customWages', city.wages);
      if (city.wages[settings.startYear]) {
          onSettingChange('initialSocialWage', city.wages[settings.startYear]);
      }
      setIsDbDropdownOpen(false);
      setDbSearchTerm(city.name);
  };

  const handleManualImportApply = () => {
      if (selectedCityIndex >= 0 && parsedCities[selectedCityIndex]) {
          applyCityData(parsedCities[selectedCityIndex]);
          setIsImportOpen(false);
      }
  };

  const handleClearManualFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFileName('');
      setParsedCities([]);
      setSelectedCityIndex(-1);
      setImportError(null);
  };

  const filteredDbCities = dbCities.filter(c => c.name.toLowerCase().includes(dbSearchTerm.toLowerCase()));

  // Interaction handlers for global settings
  const handleLocalChange = (key: keyof PensionSettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: Number(value) }));
  };

  const commitSettingChange = (key: keyof PensionSettings) => {
    const value = localSettings[key];
    // Only commit if different from current props to avoid redundant renders
    if (value !== settings[key]) {
      onSettingChange(key, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const selectedData = selectedYearIndex !== null ? data[selectedYearIndex] : null;
  const minRetirementAge = localSettings.startAge + 15;
  const isRetirementAgeInvalid = localSettings.retirementAge < minRetirementAge;

  const handlePrevYear = () => {
    if (selectedYearIndex !== null && selectedYearIndex > 0) {
      onYearSelect(selectedYearIndex - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYearIndex !== null && selectedYearIndex < data.length - 1) {
      onYearSelect(selectedYearIndex + 1);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Selected Year Editor */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-colors duration-300 ${selectedYearIndex !== null ? 'border-l-4 border-l-emerald-500' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            年度调整 {selectedData ? `(${selectedData.year}年 / ${settings.startAge + (selectedData.year - settings.startYear)}岁)` : ''}
          </h3>
          
          <div className="flex items-center gap-2">
            {!selectedData && <span className="text-xs font-normal text-amber-500 bg-amber-50 px-2 py-1 rounded mr-2">请在图表上点击节点以调整</span>}
            
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100 shadow-sm">
              <button 
                onClick={handlePrevYear}
                disabled={selectedYearIndex === null || selectedYearIndex === 0}
                title="上一年"
                className="p-1.5 rounded-md hover:bg-white hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:text-gray-400 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div className="w-px h-4 bg-gray-200 self-center mx-0.5"></div>
              <button 
                onClick={handleNextYear}
                disabled={selectedYearIndex === null || selectedYearIndex === data.length - 1}
                title="下一年"
                className="p-1.5 rounded-md hover:bg-white hover:text-emerald-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:text-gray-400 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
        
        {selectedData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Left Column: Numeric Inputs */}
            <div className="flex flex-col gap-5">
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 mb-2 font-medium">当年社会平均工资 (元/月)</p>
                        <input 
                            type="number"
                            value={selectedData.socialAverageWage}
                            onChange={(e) => onDataUpdate(selectedYearIndex!, 'socialAverageWage', Number(e.target.value))}
                            className="text-xl font-bold text-blue-600 bg-transparent border-b border-blue-200 w-full outline-none focus:border-blue-500 py-1"
                        />
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                        <p className="text-xs text-emerald-600 mb-2 font-medium">您的个人缴费基数 (元/月)</p>
                        <input 
                            type="number"
                            value={selectedData.userWage}
                            onChange={(e) => onDataUpdate(selectedYearIndex!, 'userWage', Number(e.target.value))}
                            className="text-xl font-bold text-emerald-700 bg-transparent border-b border-emerald-300 w-full outline-none focus:border-emerald-600 py-1"
                        />
                    </div>
                </div>

                <div className="flex-grow flex flex-col justify-end">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 leading-relaxed italic">
                        个人月缴费基础=个人年缴费基数÷12
                    </div>
                </div>
            </div>

            {/* Right Column: Quick Buttons & Ratio Slider Card */}
            <div className="flex flex-col gap-3">
                {/* Quick Action Buttons - Outside the box */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onDataUpdate(selectedYearIndex!, 'ratio', 0.6)}
                        className="flex-1 py-1.5 px-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                    >
                        最低
                    </button>
                    <button 
                        onClick={() => onDataUpdate(selectedYearIndex!, 'ratio', 3.0)}
                        className="flex-1 py-1.5 px-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                    >
                        最高
                    </button>
                    <button 
                        onClick={() => onDataUpdate(selectedYearIndex!, 'userWage', 0)}
                        className="flex-1 py-1.5 px-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
                    >
                        断缴
                    </button>
                </div>

                <div className="flex-grow flex flex-col justify-center bg-gray-50/50 p-6 rounded-2xl border border-dashed border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            缴费指数比例
                        </label>
                        <span className="text-2xl font-black text-emerald-600">
                            {(selectedData.ratio * 100).toFixed(0)}%
                        </span>
                    </div>
                    
                    <div className="relative pt-2 pb-6">
                        <input 
                          type="range"
                          min={MIN_RATIO}
                          max={MAX_RATIO}
                          step={0.1}
                          value={selectedData.ratio}
                          onChange={(e) => onDataUpdate(selectedYearIndex!, 'ratio', Number(e.target.value))}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="absolute w-full flex justify-between text-[10px] text-gray-400 mt-4 px-1">
                            <span className="flex flex-col items-center">
                                <span className="w-px h-1 bg-gray-300 mb-1"></span>
                                60%
                            </span>
                            <span className="flex flex-col items-center">
                                <span className="w-px h-1 bg-gray-300 mb-1"></span>
                                100%
                            </span>
                            <span className="flex flex-col items-center">
                                <span className="w-px h-1 bg-gray-300 mb-1"></span>
                                200%
                            </span>
                            <span className="flex flex-col items-center">
                                <span className="w-px h-1 bg-gray-300 mb-1"></span>
                                300%
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-2">
                        <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-lg border border-gray-100 text-xs shadow-sm">
                            <span className="text-gray-500 font-medium">社平年基数</span>
                            <span className="font-bold text-blue-600">¥{(selectedData.socialAverageWage * 12).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-lg border border-gray-100 text-xs shadow-sm">
                            <span className="text-gray-500 font-medium">个人年基数</span>
                            <span className="font-bold text-emerald-600">¥{(selectedData.userWage * 12).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                点击上方折线图中的节点或使用右侧切换按钮开始编辑
            </div>
          </div>
        )}
      </div>

      {/* 2. Global Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
           全局参数设置
        </h3>

        <div className="mb-6 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
           <label className="text-xs font-bold text-emerald-700 block mb-2">
             📚 快速应用城市数据 (从内置数据库)
           </label>
           <div className="relative" ref={dbDropdownRef}>
              <div className="flex items-center">
                 <svg className="absolute left-3 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 <input 
                    type="text" 
                    placeholder={isDbLoading ? "正在加载数据库..." : "搜索并选择城市 (如: 北京, 上海)..."}
                    className="w-full pl-9 pr-8 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={dbSearchTerm}
                    onFocus={() => setIsDbDropdownOpen(true)}
                    onChange={(e) => {
                        setDbSearchTerm(e.target.value);
                        setIsDbDropdownOpen(true);
                    }}
                    disabled={isDbLoading}
                 />
                 {dbSearchTerm && (
                     <button 
                        onClick={() => {
                            setDbSearchTerm('');
                            setIsDbDropdownOpen(true);
                        }}
                        className="absolute right-2 text-gray-400 hover:text-gray-600"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                 )}
              </div>
              
              {isDbDropdownOpen && !isDbLoading && (
                  <div className="absolute z-20 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredDbCities.length > 0 ? (
                          filteredDbCities.map((city, idx) => (
                              <div 
                                key={idx} 
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group"
                                onClick={() => applyCityData(city)}
                              >
                                  <span className="font-medium">{city.name}</span>
                                  <span className="text-xs text-gray-400 group-hover:text-emerald-600">
                                      包含 {Object.keys(city.wages).length} 年数据
                                  </span>
                              </div>
                          ))
                      ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              {dbCities.length === 0 ? "未找到数据库文件 (public/social_wages.xlsx)" : "无匹配城市"}
                          </div>
                      )}
                  </div>
              )}
           </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           <div className="space-y-1">
             <label className="text-xs font-medium text-gray-500">起始缴费年龄</label>
             <input 
               type="number" 
               className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={localSettings.startAge}
               onChange={(e) => handleLocalChange('startAge', e.target.value)}
               onBlur={() => commitSettingChange('startAge')}
               onKeyDown={(e) => handleKeyDown(e)}
             />
           </div>
           <div className="space-y-1">
             <label className="text-xs font-medium text-gray-500" title={`至少需缴费15年 (最小 ${minRetirementAge}岁)`}>
                退休年龄 (Min: {minRetirementAge}岁)
             </label>
             <input 
               type="number" 
               className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isRetirementAgeInvalid ? 'border-red-300 bg-red-50' : ''}`}
               value={localSettings.retirementAge}
               min={minRetirementAge}
               onChange={(e) => handleLocalChange('retirementAge', e.target.value)}
               onBlur={() => commitSettingChange('retirementAge')}
               onKeyDown={(e) => handleKeyDown(e)}
             />
             {isRetirementAgeInvalid && (
                 <p className="text-[10px] text-red-500 font-medium">需至少缴费15年</p>
             )}
           </div>
           <div className="space-y-1">
             <label className="text-xs font-medium text-gray-500">起始年份</label>
             <input 
               type="number" 
               className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={localSettings.startYear}
               onChange={(e) => handleLocalChange('startYear', e.target.value)}
               onBlur={() => commitSettingChange('startYear')}
               onKeyDown={(e) => handleKeyDown(e)}
             />
           </div>

           <div className="space-y-1">
             <label className="text-xs font-medium text-gray-500" title="对应起始年份的社平工资">起始年社平 (元/月)</label>
             <input 
               type="number" 
               className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={localSettings.initialSocialWage}
               onChange={(e) => handleLocalChange('initialSocialWage', e.target.value)}
               onBlur={() => commitSettingChange('initialSocialWage')}
               onKeyDown={(e) => handleKeyDown(e)}
             />
           </div>
           <div className="space-y-1">
             <label className="text-xs font-medium text-gray-500">社平增长率 (%)</label>
             <input 
               type="number" 
               className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               step="0.1"
               value={localSettings.socialWageGrowthRate}
               onChange={(e) => handleLocalChange('socialWageGrowthRate', e.target.value)}
               onBlur={() => commitSettingChange('socialWageGrowthRate')}
               onKeyDown={(e) => handleKeyDown(e)}
             />
           </div>
           <div className="space-y-1">
             <label className="text-xs font-medium text-gray-500">起始账户余额 (元)</label>
             <input 
               type="number" 
               className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={localSettings.accountBalance}
               onChange={(e) => handleLocalChange('accountBalance', e.target.value)}
               onBlur={() => commitSettingChange('accountBalance')}
               onKeyDown={(e) => handleKeyDown(e)}
             />
           </div>
        </div>

        <div className="mt-4 border-t pt-4">
             <button 
                onClick={() => setIsImportOpen(!isImportOpen)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {isImportOpen ? '收起上传面板' : '手动上传社平文件'}
             </button>
             
             {isImportOpen && (
                 <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in">
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                        上传 Excel 或 CSV 文件 (格式：第一行为年份表头，第一列为城市名)
                    </p>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-100 transition-colors relative cursor-pointer group">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleManualFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-1">
                             <svg className="mx-auto h-8 w-8 text-gray-400 group-hover:text-blue-400 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                             </svg>
                             <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
                                 {fileName ? (
                                     <>
                                        <span className="text-emerald-600 font-bold">{fileName}</span>
                                        <button 
                                            onClick={handleClearManualFile}
                                            className="z-10 text-gray-400 hover:text-red-500 p-1 rounded-full"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                     </>
                                 ) : "点击上传或拖拽文件"}
                             </div>
                        </div>
                    </div>
                    
                    {importError && <p className="text-xs text-red-500 mt-2">{importError}</p>}
                    
                    {parsedCities.length > 0 && (
                        <div className="mt-4 flex items-center gap-3 animate-fade-in">
                                <div className="flex-1">
                                    <select 
                                        className="w-full border rounded px-2 py-1.5 text-xs outline-none bg-white"
                                        value={selectedCityIndex}
                                        onChange={(e) => setSelectedCityIndex(Number(e.target.value))}
                                    >
                                        {parsedCities.map((city, idx) => (
                                            <option key={idx} value={idx}>{city.name} ({Object.keys(city.wages).length}年数据)</option>
                                        ))}
                                    </select>
                                </div>
                                <button 
                                    onClick={handleManualImportApply}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs font-semibold"
                                >
                                    应用
                                </button>
                        </div>
                    )}
                 </div>
             )}
        </div>
      </div>

      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="text-sm text-blue-800 font-medium">配置存档：</div>
          <div className="flex gap-3">
              <label className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md text-sm cursor-pointer shadow-sm transition-colors flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  导入
                  <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>
              <button 
                  onClick={onExport}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm shadow-sm transition-colors flex items-center gap-1"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  导出
              </button>
          </div>
      </div>
    </div>
  );
};

export default EditorPanel;
