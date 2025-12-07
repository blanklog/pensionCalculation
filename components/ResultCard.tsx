
import React from 'react';
import { CalculationResult } from '../types';

interface ResultCardProps {
  result: CalculationResult;
  loading: boolean;
  onAnalyze: () => void;
  aiAnalysis: string | null;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, loading, onAnalyze, aiAnalysis }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-xl shadow-xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold mb-1">退休金预估</h2>
           <p className="text-blue-200 text-sm">基于当前模型测算，非官方最终结果</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
            <p className="text-sm text-blue-200 uppercase tracking-wider">月领总额 (元)</p>
            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-emerald-300 mt-1">
                {result.totalMonthly.toLocaleString()}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-xs text-blue-200 mb-1">基础养老金</p>
              <p className="text-xl font-bold">{result.monthlyBasicPension.toLocaleString()}</p>
              <div className="text-[10px] text-blue-300 mt-1 flex flex-col gap-0.5">
                  <span className="flex justify-between">
                      <span>总缴费年限:</span>
                      <span className="text-white font-medium">{result.contributionYears} 年</span>
                  </span>
                  <span className="flex justify-between">
                      <span>占社平:</span>
                      <span className="text-white font-medium">{(result.basicPensionReplacementRate * 100).toFixed(1)}%</span>
                  </span>
                  <span className="flex justify-between">
                      <span>平均指数:</span>
                      <span className="text-white font-medium">{result.averageIndex.toFixed(4)}</span>
                  </span>
              </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-xs text-blue-200 mb-1">个人账户养老金</p>
              <p className="text-xl font-bold">{result.monthlyPersonalPension.toLocaleString()}</p>
              <div className="text-[10px] text-blue-300 mt-1 flex flex-col gap-0.5">
                  <span className="flex justify-between">
                     <span>账户总额:</span> 
                     <span className="text-white font-medium">{result.totalAccumulated.toLocaleString()}</span>
                  </span>
                  <span className="flex justify-between">
                     <span>计发月数:</span> 
                     <span className="text-emerald-300 font-medium">{result.monthsDivisor} 个月</span>
                  </span>
              </div>
          </div>
      </div>

      <hr className="border-white/10 mb-6" />

      {/* AI Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                AI 智能分析
            </h3>
            {!aiAnalysis && (
                <button 
                onClick={onAnalyze}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                {loading ? (
                    <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    分析中...
                    </>
                ) : (
                    <>
                    生成规划建议
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </>
                )}
                </button>
            )}
        </div>
        
        {aiAnalysis && (
            <div className="bg-black/20 rounded-lg p-5 text-sm leading-relaxed text-blue-50 border border-white/5 animate-fade-in">
                <div className="prose prose-invert prose-sm max-w-none">
                     {/* Safe render of text, in real app use markdown parser if needed */}
                     <pre className="whitespace-pre-wrap font-sans text-sm">{aiAnalysis}</pre>
                </div>
                <div className="mt-4 text-right">
                     <button onClick={onAnalyze} className="text-xs text-emerald-300 hover:text-emerald-200 underline">
                         重新分析
                     </button>
                </div>
            </div>
        )}
      </div>

    </div>
  );
};

export default ResultCard;
