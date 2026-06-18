import { useState } from 'react';
import { TradingLog, CapitalSettings } from '../types';
import { formatCurrency } from '../utils/telegram';
import { AreaChart, BarChart3, TrendingUp, Info } from 'lucide-react';

interface AnalyticsChartsProps {
  logs: TradingLog[];
  settings: CapitalSettings;
}

export default function AnalyticsCharts({ logs, settings }: AnalyticsChartsProps) {
  const [activeChart, setActiveChart] = useState<'equity' | 'hourly'>('equity');
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
        <TrendingUp className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-800 text-sm">Chưa có chỉ số phân tích</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Các biểu đồ trực quan về quỹ tăng trưởng và hiệu suất từng mốc giờ sẽ xuất hiện tự động ngay khi bạn tích lũy các bản ghi giao dịch mốc giờ khác nhau.
        </p>
      </div>
    );
  }

  // --- CHART 1: EQUITY GROWTH CURVE CALCULATION ---
  // Create safe sorted timeline
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  
  // Starting point of the equity curve
  const timelineData = [{
    index: 0,
    hourMark: 'Gốc',
    netProfit: 0,
    balance: settings.initialCapital,
    type: 'BENCHMARK',
  }];

  let runningBalance = settings.initialCapital;
  sortedLogs.forEach((log, idx) => {
    const profitImpact = log.type === 'WIN' ? log.amount : -log.amount;
    runningBalance += profitImpact;
    timelineData.push({
      index: idx + 1,
      hourMark: log.hourMark,
      netProfit: runningBalance - settings.initialCapital,
      balance: runningBalance,
      type: log.type,
    });
  });

  // SVG parameters for Line Chart
  const width = 600;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determine standard bounds
  const balances = timelineData.map(d => d.balance);
  const minBalance = Math.min(...balances, settings.stopLoss, settings.initialCapital) * 0.95;
  const maxBalance = Math.max(...balances, settings.targetProfit, settings.initialCapital) * 1.05;
  const balanceRange = maxBalance - minBalance || 100;

  // Convert coordinate functions
  const getX = (index: number) => {
    const count = timelineData.length - 1;
    return paddingLeft + (index / (count || 1)) * chartWidth;
  };

  const getY = (bal: number) => {
    return paddingTop + chartHeight - ((bal - minBalance) / balanceRange) * chartHeight;
  };

  // Build the SVG Line Path string
  let linePath = '';
  let areaPath = '';
  
  if (timelineData.length > 0) {
    timelineData.forEach((point, i) => {
      const x = getX(point.index);
      const y = getY(point.balance);
      if (i === 0) {
        linePath = `M ${x} ${y}`;
        areaPath = `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
        areaPath += ` L ${x} ${y}`;
      }
    });
    // close the area polygon
    const lastX = getX(timelineData.length - 1);
    areaPath += ` L ${lastX} ${paddingTop + chartHeight} Z`;
  }

  // Y Axis ticks list
  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }).map((_, i) => {
    return minBalance + (i / (tickCount - 1)) * balanceRange;
  });

  // --- CHART 2: HOURLY PERFORMANCE BAR CHART CALCULATION ---
  const hourlySummary: { [hour: string]: { winTotal: number; lossTotal: number; count: number } } = {};
  
  logs.forEach(log => {
    if (!hourlySummary[log.hourMark]) {
      hourlySummary[log.hourMark] = { winTotal: 0, lossTotal: 0, count: 0 };
    }
    if (log.type === 'WIN') {
      hourlySummary[log.hourMark].winTotal += log.amount;
    } else {
      hourlySummary[log.hourMark].lossTotal += log.amount;
    }
    hourlySummary[log.hourMark].count++;
  });

  const hourlyData = Object.keys(hourlySummary).map(hour => ({
    hour,
    winTotal: hourlySummary[hour].winTotal,
    lossTotal: hourlySummary[hour].lossTotal,
    net: hourlySummary[hour].winTotal - hourlySummary[hour].lossTotal,
    count: hourlySummary[hour].count,
  })).sort((a, b) => a.hour.localeCompare(b.hour));

  // Hourly Chart bounds
  const maxBarValue = Math.max(
    ...hourlyData.map(d => Math.max(d.winTotal, d.lossTotal)),
    500
  ) * 1.1;

  const barHeightFactor = chartHeight / maxBarValue;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8" id="analytics-charts-card">
      {/* Tab Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-sans font-black text-slate-900 text-lg">Thống kê & Phân tích Quy luật</h2>
          <p className="text-xs text-slate-500 mt-0.5">Biểu đồ phát triển vốn và phân bổ hiệu quả mốc giờ</p>
        </div>
        
        <div className="bg-slate-100 p-1 rounded-xl flex self-start sm:self-auto">
          <button
            onClick={() => setActiveChart('equity')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              activeChart === 'equity'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AreaChart className="w-3.5 h-3.5" />
            Biểu đồ Tài sản
          </button>
          <button
            onClick={() => setActiveChart('hourly')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              activeChart === 'hourly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Hiệu suất Mốc Giờ
          </button>
        </div>
      </div>

      {activeChart === 'equity' ? (
        <div className="animate-fadeIn">
          {/* Equity Line chart */}
          <div className="relative">
            {/* Legend info panel */}
            <div className="flex flex-wrap items-center gap-4 text-xs mb-3 font-semibold justify-end">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-dashed border-t border-indigo-500"></span>
                <span className="text-indigo-600">Vốn gốc ({formatCurrency(settings.initialCapital, settings.currency)})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-dashed border-t border-emerald-500"></span>
                <span className="text-emerald-600">Chốt lời ({formatCurrency(settings.targetProfit, settings.currency)})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-dashed border-t border-rose-500"></span>
                <span className="text-rose-600">Cắt lỗ ({formatCurrency(settings.stopLoss, settings.currency)})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-indigo-100 rounded-full border-2 border-indigo-600"></span>
                <span className="text-slate-700">Đường số dư</span>
              </span>
            </div>

            {/* Core SVG */}
            <div className="w-full overflow-x-auto select-none no-scrollbar">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
                {/* Custom Gradient definition */}
                <defs>
                  <linearGradient id="equity-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4338ca" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4338ca" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {yTicks.map((yVal, i) => {
                  const y = getY(yVal);
                  return (
                    <g key={i}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={width - paddingRight}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="font-mono text-[9px] text-slate-400 font-medium"
                      >
                        {formatCurrency(yVal, settings.currency).replace('₫', '').trim()}
                      </text>
                    </g>
                  );
                })}

                {/* Static Benchmark lines */}
                {/* Initial Capital Line */}
                <line
                  x1={paddingLeft}
                  y1={getY(settings.initialCapital)}
                  x2={width - paddingRight}
                  y2={getY(settings.initialCapital)}
                  stroke="#6366f1"
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                  opacity="0.8"
                />

                {/* Target Capital Line */}
                <line
                  x1={paddingLeft}
                  y1={getY(settings.targetProfit)}
                  x2={width - paddingRight}
                  y2={getY(settings.targetProfit)}
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                  opacity="0.8"
                />

                {/* Stop Loss Line */}
                <line
                  x1={paddingLeft}
                  y1={getY(settings.stopLoss)}
                  x2={width - paddingRight}
                  y2={getY(settings.stopLoss)}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                  opacity="0.8"
                />

                {/* Gradient filled area */}
                {areaPath && (
                  <path d={areaPath} fill="url(#equity-gradient)" />
                )}

                {/* Bold Stroke line of Equity */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Circles & Interaction Pins at data points */}
                {timelineData.map((pt, i) => {
                  const x = getX(pt.index);
                  const y = getY(pt.balance);
                  const isHovered = hoveredPoint && hoveredPoint.index === pt.index;

                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 3.5}
                        className={`transition-all duration-200 cursor-pointer ${
                          pt.type === 'WIN'
                            ? 'fill-emerald-500 stroke-white stroke-2'
                            : pt.type === 'LOSS'
                            ? 'fill-rose-500 stroke-white stroke-2'
                            : 'fill-indigo-600 stroke-white stroke-2'
                        }`}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* X axis labels (hourly marks) */}
                      {i % Math.max(1, Math.floor(timelineData.length / 8)) === 0 && (
                        <text
                          x={x}
                          y={height - paddingBottom + 18}
                          textAnchor="middle"
                          className="font-mono text-[9px] text-slate-500 font-semibold"
                        >
                          {pt.hourMark}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Bottom X axis line */}
                <line
                  x1={paddingLeft}
                  y1={height - paddingBottom}
                  x2={width - paddingRight}
                  y2={height - paddingBottom}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Interactive Float Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute bg-slate-900 border border-slate-800 text-white p-3.5 rounded-xl text-xs font-semibold shadow-xl space-y-1 animate-fadeIn pointer-events-none"
                style={{
                  left: `${Math.min(
                    getX(hoveredPoint.index) - 10,
                    width - 150
                  )}px`,
                  top: `${Math.max(getY(hoveredPoint.balance) - 85, 0)}px`,
                }}
              >
                <div className="text-[10px] text-indigo-300">
                  Mốc: {hoveredPoint.hourMark}
                </div>
                <div className="font-mono text-sm font-bold">
                  {formatCurrency(hoveredPoint.balance, settings.currency)}
                </div>
                <div className="text-[10px] text-slate-400">
                  LN Lũy kế:{' '}
                  <span
                    className={
                      hoveredPoint.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {hoveredPoint.netProfit >= 0 ? '+' : ''}
                    {formatCurrency(hoveredPoint.netProfit, settings.currency)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 mt-4 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Cách đọc biểu đồ:</strong> Đường dốc đi lên thể hiện tỷ lệ thắng tốt, vốn gia tăng. Các điểm tròn màu đỏ biểu thị mốc ca thua lỗ, màu xanh biểu thị mốc ca thắng lợi. Hai đường gạch đứt màu xanh mạ và đỏ giúp bạn so sánh trực quan hiệu năng số dư với mức chốt lời mục tiêu và giới hạn cắt lỗ đã lên kế hoạch.
            </span>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {/* Hourly Column chart */}
          <div className="space-y-4">
            {hourlyData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có dữ liệu kết quả mốc giờ
              </div>
            ) : (
              <div className="w-full overflow-x-auto select-none no-scrollbar">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
                  {/* Grid lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const gridY = paddingTop + (i / 3) * chartHeight;
                    const gridVal = maxBarValue - (i / 3) * maxBarValue;
                    return (
                      <g key={i}>
                        <line
                          x1={paddingLeft}
                          y1={gridY}
                          x2={width - paddingRight}
                          y2={gridY}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingLeft - 8}
                          y={gridY + 4}
                          textAnchor="end"
                          className="font-mono text-[9px] text-slate-400 font-medium"
                        >
                          {formatCurrency(gridVal, settings.currency).replace('₫', '').trim()}
                        </text>
                      </g>
                    );
                  })}

                  {/* Columns */}
                  {hourlyData.map((data, idx) => {
                    const colCount = hourlyData.length;
                    const spaceBetween = chartWidth / colCount;
                    const groupCenterX = paddingLeft + idx * spaceBetween + spaceBetween / 2;

                    // Double bar width
                    const barWidth = 14;
                    const winBarX = groupCenterX - barWidth - 1;
                    const lossBarX = groupCenterX + 1;

                    const winBarH = data.winTotal * barHeightFactor;
                    const lossBarH = data.lossTotal * barHeightFactor;

                    const chartBottomY = paddingTop + chartHeight;

                    return (
                      <g key={data.hour} className="group cursor-pointer">
                        {/* Win column (Green) */}
                        {data.winTotal > 0 && (
                          <rect
                            x={winBarX}
                            y={chartBottomY - winBarH}
                            width={barWidth}
                            height={winBarH}
                            fill="#10b981"
                            rx="3"
                            className="hover:fill-emerald-600 transition-colors"
                          >
                            <title>Số tiền Thắng: {formatCurrency(data.winTotal, settings.currency)}</title>
                          </rect>
                        )}

                        {/* Loss column (Red) */}
                        {data.lossTotal > 0 && (
                          <rect
                            x={lossBarX}
                            y={chartBottomY - lossBarH}
                            width={barWidth}
                            height={lossBarH}
                            fill="#f43f5e"
                            rx="3"
                            className="hover:fill-rose-600 transition-colors"
                          >
                            <title>Số tiền Thua: {formatCurrency(data.lossTotal, settings.currency)}</title>
                          </rect>
                        )}

                        {/* X-axis text values */}
                        <text
                          x={groupCenterX}
                          y={height - paddingBottom + 18}
                          textAnchor="middle"
                          className="font-mono text-[10px] text-slate-700 font-bold"
                        >
                          {data.hour}
                        </text>

                        {/* Log counter bubble */}
                        <text
                          x={groupCenterX}
                          y={height - paddingBottom + 30}
                          textAnchor="middle"
                          className="font-mono text-[8px] text-slate-400 font-semibold"
                        >
                          ({data.count} ca)
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Bottom Line */}
                  <line
                    x1={paddingLeft}
                    y1={height - paddingBottom}
                    x2={width - paddingRight}
                    y2={height - paddingBottom}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            )}

            {hourlyData.length > 0 && (
              <div className="mt-6 border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-700 font-sans">
                  Bảng chi tiết lợi nhuận ròng hàng giờ
                </div>
                <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto no-scrollbar">
                  {hourlyData.map((data) => (
                    <div key={data.hour} className="flex justify-between items-center px-6 py-3.5 text-xs hover:bg-slate-50/50 transition-all font-mono">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-black text-xs w-14 text-center">
                          {data.hour}
                        </span>
                        <span className="text-slate-400 font-sans text-[11px] font-bold">({data.count} ca)</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right text-[11px] font-semibold text-slate-400 font-mono hidden sm:block">
                          <span className="text-emerald-500">
                            +{formatCurrency(data.winTotal, settings.currency)}
                          </span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="text-rose-400">
                            -{formatCurrency(data.lossTotal, settings.currency)}
                          </span>
                        </div>
                        <div className="text-right font-black w-28">
                          <span className={data.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                            {data.net >= 0 ? '+' : ''}
                            {formatCurrency(data.net, settings.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 mt-4 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Hiểu mốc giờ vàng:</strong> Biểu đồ cột kép trên so sánh tổng số tiền thắng (Cột Xanh) và thua lỗ (Cột Đỏ) mốc giờ. Giúp bạn nhận diện một cách khoa học khung giờ nào trong ngày bạn hoạt động hiệu suất tối ưu và khung giờ nào dễ phát sinh tâm lý tiêu cực dẫn đến thua lỗ để né tránh giao dịch.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
