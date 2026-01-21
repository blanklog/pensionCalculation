
import React, { useState } from 'react';
import { CalculationResult } from '../types';

interface ResultCardProps {
  result: CalculationResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const [showDonate, setShowDonate] = useState(false);

  // 这里的路径不带 'public/'，因为在构建/预览时，public 文件夹的内容会被直接映射到根目录
  const wechatImg = "/wechat-pay.png";
  const alipayImg = "/alipay.png";

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-1">退休金预估</h2>
            <p className="text-blue-200 text-sm">基于当前政策模型测算，非官方最终结果</p>
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

      {/* 打赏按钮 */}
      <button 
        onClick={() => setShowDonate(true)}
        className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 group-hover:scale-110 transition-transform"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l8.42 8.42 8.42-8.42a5.4 5.4 0 0 0 0-7.65Z"/></svg>
        打赏作者，赞助服务器运行
      </button>

      {/* 打赏弹窗 */}
      {showDonate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">赞助支持</h3>
                <button onClick={() => setShowDonate(false)} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8 text-center">
                {/* 微信支付 */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center border-2 border-emerald-50 p-2 shadow-inner">
                    <img 
                      src={wechatImg} 
                      alt="微信支付" 
                      className="w-full h-full object-contain mix-blend-multiply"
                      loading="eager"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-emerald-700">微信支付</span>
                  </div>
                </div>
                
                {/* 支付宝支付 */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 flex items-center justify-center border-2 border-blue-50 p-2 shadow-inner">
                    <img 
                      src={alipayImg} 
                      alt="支付宝支付" 
                      className="w-full h-full object-contain mix-blend-multiply"
                      loading="eager"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-blue-700">支付宝</span>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-3 px-4 border-t border-gray-50 pt-6">
                <p className="text-gray-500 text-sm leading-relaxed italic">"灯火长明，离不开您的一份心意"</p>
                <div className="py-2">
                  <p className="text-red-500 font-extrabold text-2xl tracking-widest drop-shadow-sm">感谢充电！</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100/50">
              <button 
                onClick={() => setShowDonate(false)}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors hover:underline underline-offset-4 decoration-dotted"
              >
                返回测算页面
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;
