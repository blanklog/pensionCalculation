
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { PensionDataPoint } from '../types';

interface ChartSectionProps {
  data: PensionDataPoint[];
  activeIndex: number | null;
  onYearSelect: (index: number) => void;
  onDataUpdate: (index: number, field: 'ratio' | 'userWage' | 'socialAverageWage', value: number) => void;
}

const ChartSection: React.FC<ChartSectionProps> = ({ data, activeIndex, onYearSelect }) => {
  // 处理图表点击选中年份
  const handleClick = (e: any) => {
    if (e && e.activeTooltipIndex !== undefined) {
      onYearSelect(e.activeTooltipIndex);
    }
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md text-sm pointer-events-none select-none">
          <p className="font-bold text-gray-700 mb-1">{label}年</p>
          <p className="text-blue-600">
            社平工资: ¥{payload[0].value.toLocaleString()}
          </p>
          <p className="text-emerald-600 font-bold">
            您的基数: ¥{payload[1].value.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            缴费指数: {(payload[1].payload.ratio * 100).toFixed(0)}%
          </p>
          <p className="text-gray-400 text-[10px] mt-2 italic">点击节点进行编辑</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all">
      <div className="flex justify-between items-center mb-4 pl-2 border-l-4 border-emerald-500">
        <h3 className="text-lg font-semibold text-gray-700">
          缴费趋势图
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="year" 
            tick={{fontSize: 12, fill: '#888'}} 
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis 
            tick={{fontSize: 12, fill: '#888'}} 
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `¥${value/1000}k`}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: '#10b981', strokeWidth: 2 }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          <Line
            type="monotone"
            dataKey="socialAverageWage"
            name="社会平均工资"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            strokeDasharray="5 5"
          />
          
          <Line
            type="monotone"
            dataKey="userWage"
            name="您的缴费基数"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ 
              r: 5, 
              fill: '#10b981', 
              strokeWidth: 0
            }}
            activeDot={{ 
              r: 8, 
              stroke: '#ecfdf5', 
              strokeWidth: 4
            }}
          />
          
          {activeIndex !== null && data[activeIndex] && (
               <ReferenceArea 
                x1={data[activeIndex].year} 
                x2={data[activeIndex].year} 
                strokeOpacity={0.1} 
                fill="#10b981" 
                fillOpacity={0.05} 
               />
          )}

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartSection;
