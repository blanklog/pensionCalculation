
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [parsedCities, setParsedCities] = useState<CityData[]>([]);
  const [selectedCityIndex, setSelectedCityIndex] = useState<number>(-1);
  const [importError, setImportError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [localSettings, setLocalSettings] = useState<PensionSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const [dbCities, setDbCities] = useState<CityData[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [isDbDropdownOpen, setIsDbDropdownOpen] = useState(false);
  const dbDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dbDropdownRef.current && !dbDropdownRef.current.contains(event.target as Node)) {
        setIsDbDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const applyCityData = (city: CityData) => {
      onSettingChange('customWages', city.wages);
      if (city.wages[settings.startYear]) {
          onSettingChange('initialSocialWage', city.wages[settings.startYear]);
      }
      setIsDbDropdownOpen(false);
      setDbSearchTerm(city.name);
  };

  // 计算过滤后的城市列表
  const filteredDbCities = useMemo(() => {
    if (!dbSearchTerm) return dbCities;
    
    // 如果搜索词精确匹配某个城市名（即用户已经选过），
    // 这种情况下为了方便用户再次点击时查看其它选项，我们返回全部城市列表，并将匹配项置顶
    const exactMatch = dbCities.find(c => c.name === dbSearchTerm);
    if (exactMatch) {
      const others = dbCities.filter(c => c.name !== exactMatch.name);
      return [exactMatch, ...others];
    }
    
    // 否则按包含关系进行模糊搜索
    return dbCities.filter(c => 
      c.name.toLowerCase().includes(dbSearchTerm.toLowerCase())
    );
  }, [dbCities, dbSearchTerm]);

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

  const handleLocalChange = (key: keyof PensionSettings, value: any) => {
    if (typeof value === 'boolean') {
      setLocalSettings(prev => ({ ...prev, [key]: value }));
      onSettingChange(key, value);
    } else {
      setLocalSettings(prev => ({ ...prev, [key]: Number(value) }));
    }
  };

  const commitSettingChange = (key: keyof PensionSettings) => {
    const value = localSettings[key];
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

  const handlePrevYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedYearIndex !== null && selectedYearIndex > 0) {
      onYearSelect(selectedYearIndex - 1);
    }
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedYearIndex !== null && selectedYearIndex < data.length - 1) {
      onYearSelect(selectedYearIndex + 1);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
      {/* Global Settings Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
            全局参数设置
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              自定义导入
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              导出项目
            </button>
            <label className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer">
              导入项目
              <input type="file" accept=".json" className="hidden" onChange={onImport} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. 社保统筹地区 */}
          <div className="space-y-2 relative" ref={dbDropdownRef}>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">社保统筹地区</label>
            <div className="relative group">
                <input
                    type="text"
                    value={dbSearchTerm}
                    onChange={(e) => {
                        setDbSearchTerm(e.target.value);
                        setIsDbDropdownOpen(true);
                    }}
                    onFocus={(e) => {
                        e.target.select();
                        setIsDbDropdownOpen(true);
                    }}
                    placeholder={isDbLoading ? "加载数据中..." : "输入地区搜索 (如: 上海)"}
                    className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                    disabled={isDbLoading}
                />
                {dbSearchTerm && (
                    <button 
                        onClick={() => { setDbSearchTerm(''); setIsDbDropdownOpen(true); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 p-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
                {isDbDropdownOpen && filteredDbCities.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-fade-in divide-y divide-gray-50">
                        {filteredDbCities.map((city, idx) => (
                            <div
                                key={idx}
                                onClick={() => applyCityData(city)}
                                className={`px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center ${dbSearchTerm === city.name ? 'bg-blue-50/50' : ''}`}
                            >
                                <span className={dbSearchTerm === city.name ? 'font-bold text-blue-700' : 'text-gray-700'}>
                                    {city.name}
                                </span>
                                {dbSearchTerm === city.name && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* 2. 起始社平工资 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">起始社平工资 (元)</label>
            <input
              type="number"
              value={localSettings.initialSocialWage}
              onChange={(e) => handleLocalChange('initialSocialWage', e.target.value)}
              onBlur={() => commitSettingChange('initialSocialWage')}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>

          {/* 3. 预估年增长率 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">预估年增长率 (%)</label>
            <input
              type="number"
              step="0.1"
              value={localSettings.socialWageGrowthRate}
              onChange={(e) => handleLocalChange('socialWageGrowthRate', e.target.value)}
              onBlur={() => commitSettingChange('socialWageGrowthRate')}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>

          {/* 4. 测算起始年份 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">测算起始年份</label>
            <input
              type="number"
              value={localSettings.startYear}
              onChange={(e) => handleLocalChange('startYear', e.target.value)}
              onBlur={() => commitSettingChange('startYear')}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
            />
          </div>

          {/* 5. 起始缴费年龄 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">起始缴费年龄</label>
            <input
              type="number"
              value={localSettings.startAge}
              onChange={(e) => handleLocalChange('startAge', e.target.value)}
              onBlur={() => commitSettingChange('startAge')}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>

          {/* 6. 预估退休年龄 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">预估退休年龄</label>
            <input
              type="number"
              value={localSettings.retirementAge}
              onChange={(e) => handleLocalChange('retirementAge', e.target.value)}
              onBlur={() => commitSettingChange('retirementAge')}
              onKeyDown={handleKeyDown}
              className={`w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm ${isRetirementAgeInvalid ? 'border-red-500 text-red-600' : 'border-gray-200'}`}
            />
            {isRetirementAgeInvalid && <p className="text-[10px] text-red-500 mt-1">至少需缴费15年 (当前退休年龄过小)</p>}
          </div>

          {/* 7. 个人账户余额 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">个人账户余额 (元)</label>
            <input
              type="number"
              value={localSettings.accountBalance}
              onChange={(e) => handleLocalChange('accountBalance', e.target.value)}
              onBlur={() => commitSettingChange('accountBalance')}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </section>

      {/* Year-Specific Editor Section */}
      <section className="pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            选中年份细节调整
          </h3>
          <div className="flex items-center gap-3">
             <button 
                type="button"
                onClick={handlePrevYear}
                disabled={selectedYearIndex === null || selectedYearIndex <= 0}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors touch-manipulation"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </button>
             <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full min-w-[80px] text-center">
                {selectedData?.year || '---'} 年
             </span>
             <button 
                type="button"
                onClick={handleNextYear}
                disabled={selectedYearIndex === null || selectedYearIndex >= data.length - 1}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors touch-manipulation"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
             </button>
          </div>
        </div>

        {selectedYearIndex !== null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {selectedData ? (
              <>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-600">缴费指数 (倍数)</label>
                        <span className={`text-lg font-black ${selectedData.ratio >= 2 ? 'text-blue-600' : selectedData.ratio >= 1 ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {selectedData.ratio.toFixed(2)}
                        </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_RATIO}
                      max={MAX_RATIO}
                      step="0.01"
                      value={selectedData.ratio}
                      onChange={(e) => onDataUpdate(selectedYearIndex!, 'ratio', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                        <span>MIN (0.6)</span>
                        <span>1.0</span>
                        <span>2.0</span>
                        <span>MAX (3.0)</span>
                    </div>
                    <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">
                        注：缴费指数 = 个人缴费基数 / 社会平均工资。通常最低为 0.6，最高为 3.0。
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">当年社会平均工资 (元/月)</label>
                    <input
                      type="number"
                      value={selectedData.socialAverageWage}
                      onChange={(e) => onDataUpdate(selectedYearIndex!, 'socialAverageWage', Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">个人实际缴费基数 (元/月)</label>
                    <input
                      type="number"
                      value={selectedData.userWage}
                      onChange={(e) => onDataUpdate(selectedYearIndex!, 'userWage', Number(e.target.value))}
                      className="w-full px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="md:col-span-2 py-8 flex items-center justify-center text-gray-400 gap-2">
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">正在同步年份数据...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50 text-gray-400 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-20"><path d="m15 18-6-6 6-6"/></svg>
            <p className="text-sm">请在上方图表中点击某个点，或使用箭头切换年份</p>
          </div>
        )}
      </section>

      {/* Manual Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">导入地区工资数据</h3>
                <button onClick={() => setIsImportOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    请上传 Excel 文件。格式要求：第一行为年份 (如 2020, 2021...)，第一列为城市/地区名称。
                  </p>
                  
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-8 transition-all text-center ${fileName ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-blue-300 bg-gray-50'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                             const dummyEvent = { target: { files: [file], value: '' } } as any;
                             handleManualFileUpload(dummyEvent);
                        }
                    }}
                  >
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleManualFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {!fileName ? (
                      <div className="space-y-2 pointer-events-none">
                        <div className="flex justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">点击或拖拽文件到此处</p>
                        <p className="text-xs text-gray-400">支持 .xlsx, .xls 格式</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-100 shadow-sm pointer-events-auto">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center text-emerald-600 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/></svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
                        </div>
                        <button onClick={handleClearManualFile} className="p-1 hover:bg-gray-100 rounded-md text-gray-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {importError && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {importError}
                    </div>
                )}

                {parsedCities.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">选择要导入的城市</label>
                        <select
                            value={selectedCityIndex}
                            onChange={(e) => setSelectedCityIndex(parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                        >
                            {parsedCities.map((city, idx) => (
                                <option key={idx} value={idx}>{city.name}</option>
                            ))}
                        </select>
                    </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button 
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleManualImportApply}
                disabled={parsedCities.length === 0}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 rounded-lg shadow-sm transition-all"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
