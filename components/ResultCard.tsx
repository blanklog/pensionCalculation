
import React from 'react';
import { CalculationResult } from '../types';

interface ResultCardProps {
  result: CalculationResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
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

      <div className="bg-blue-800/40 p-4 rounded-lg border border-white/5 text-xs text-blue-100 leading-relaxed">
          <p className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            温馨提示：本测算结果基于当前政策模型估算，由于未来社平工资涨幅及个人账户计息具有不确定性，测算数据仅供参考。
          </p>
      </div>
    </div>
  );
};

export default ResultCard;
