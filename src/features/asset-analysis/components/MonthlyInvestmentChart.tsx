'use client';

import { MonthlyInvestmentResponse } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './MonthlyInvestmentChart.css';

interface MonthlyInvestmentChartProps {
  data: MonthlyInvestmentResponse;
}

interface MonthlyChartItem {
  label: string;
  buy: number;
  sell: number;
}

export default function MonthlyInvestmentChart({ data }: MonthlyInvestmentChartProps) {
  if (data.monthlyInvestments.length === 0) {
    return (
      <div className="monthly-investment-chart monthly-investment-chart-empty-wrapper">
        <div className="monthly-investment-chart-empty">
          <p>월별 투자 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  const chartData: MonthlyChartItem[] = data.monthlyInvestments.map((inv) => ({
    label: `${String(inv.year).slice(2)}.${String(inv.month).padStart(2, '0')}`,
    buy: Number(inv.totalBuyAmount),
    sell: Number(inv.totalSellAmount),
  }));

  const integerTickFormatter = (value: number) =>
    Number.isFinite(value) ? Math.round(value).toLocaleString() : '';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as MonthlyChartItem;
      const buy = payload.find((p: any) => p.dataKey === 'buy')?.value ?? 0;
      const sell = payload.find((p: any) => p.dataKey === 'sell')?.value ?? 0;

      return (
        <div className="monthly-investment-tooltip">
          <div className="monthly-investment-tooltip-title">
            {item.label} 월 투자 현황
          </div>
          <div className="monthly-investment-tooltip-row">
            <span className="monthly-investment-tooltip-label">매수액</span>
            <span className="monthly-investment-tooltip-value">
              {integerTickFormatter(buy)}원
            </span>
          </div>
          <div className="monthly-investment-tooltip-row">
            <span className="monthly-investment-tooltip-label">매도액</span>
            <span className="monthly-investment-tooltip-value">
              {integerTickFormatter(sell)}원
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="monthly-investment-chart">
      <div className="monthly-investment-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-color, rgba(0, 0, 0, 0.1))"
              opacity={0.3}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-secondary, rgba(121, 131, 140, 0.75))', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
              tickLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary, rgba(121, 131, 140, 0.75))', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
              tickLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
              tickFormatter={integerTickFormatter}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey="buy"
              name="매수액"
              stroke="var(--price-up, #dd3c44)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="sell"
              name="매도액"
              stroke="var(--price-down, #1375ec)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
