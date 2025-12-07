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
}

const ChartSection: React.FC<ChartSectionProps> = ({ data, activeIndex, onYearSelect }) => {
  
  // Custom tooltip to show currency
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md text-sm">
          <p className="font-bold text-gray-700 mb-1">{label}年</p>
          <p className="text-blue-600">
            社平工资: ¥{payload[0].value.toLocaleString()}
          </p>
          <p className="text-emerald-600">
            您的基数: ¥{payload[1].value.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            缴费指数: {(payload[1].payload.ratio * 100).toFixed(0)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const handleClick = (data: any, index: number) => {
      onYearSelect(index);
  }

  return (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-4 pl-2 border-l-4 border-emerald-500">
        缴费趋势图 <span className="text-xs font-normal text-gray-400 ml-2">(点击节点可调整该年基数)</span>
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onClick={(e) => {
             if (e && e.activeTooltipIndex !== undefined) {
                 onYearSelect(e.activeTooltipIndex);
             }
          }}
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
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 2 }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          <Line
            type="monotone"
            dataKey="socialAverageWage"
            name="社会平均工资"
            stroke="#3b82f6" // Blue
            strokeWidth={2}
            dot={false}
            activeDot={false}
            strokeDasharray="5 5"
          />
          
          <Line
            type="monotone"
            dataKey="userWage"
            name="您的缴费基数"
            stroke="#10b981" // Emerald
            strokeWidth={3}
            dot={{ r: 4, fill: '#10b981', strokeWidth: 0, cursor: 'pointer' }}
            activeDot={{ r: 8, stroke: '#ecfdf5', strokeWidth: 4 }}
            animationDuration={500}
          />
          
          {activeIndex !== null && data[activeIndex] && (
               <ReferenceArea x1={data[activeIndex].year} x2={data[activeIndex].year} strokeOpacity={0.3} />
          )}

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartSection;