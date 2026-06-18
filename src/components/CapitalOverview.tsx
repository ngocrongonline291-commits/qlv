import { useState, ChangeEvent } from 'react';
import { CapitalSettings, TradingLog } from '../types';
import { formatCurrency } from '../utils/telegram';
import { Wallet, Target, AlertOctagon, TrendingUp, Edit2, Check, X, ShieldAlert, ArrowDownUp, RefreshCw } from 'lucide-react';

interface CapitalOverviewProps {
  settings: CapitalSettings;
  onUpdateSettings: (newSettings: CapitalSettings) => void;
  logs: TradingLog[];
  onClearLogs: () => void;
  onImportLogs: (importedLogs: TradingLog[], importedSettings?: CapitalSettings) => void;
}

export default function CapitalOverview({
  settings,
  onUpdateSettings,
  logs,
  onClearLogs,
  onImportLogs,
}: CapitalOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CapitalSettings>({ ...settings });

  // Statistics calculation
  let totalWin = 0;
  let totalLoss = 0;
  let winCount = 0;
  let lossCount = 0;

  let todayWin = 0;
  let todayLoss = 0;
  let todayWinCount = 0;
  let todayLossCount = 0;

  const todayDateStr = new Date().toDateString();

  logs.forEach((item) => {
    if (item.type === 'WIN') {
      totalWin += item.amount;
      winCount++;
    } else {
      totalLoss += item.amount;
      lossCount++;
    }

    const itemDateStr = new Date(item.timestamp).toDateString();
    if (itemDateStr === todayDateStr) {
      if (item.type === 'WIN') {
        todayWin += item.amount;
        todayWinCount++;
      } else {
        todayLoss += item.amount;
        todayLossCount++;
      }
    }
  });

  const netProfit = totalWin - totalLoss;
  const todayNetProfit = todayWin - todayLoss;
  const todayTrades = todayWinCount + todayLossCount;
  const todayProfitPercentage = ((todayNetProfit / settings.initialCapital) * 100).toFixed(1);

  const currentBalance = settings.initialCapital + netProfit;
  const totalTrades = winCount + lossCount;
  const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0;
  const profitPercentage = ((netProfit / settings.initialCapital) * 100).toFixed(1);

  // Target progress percentage (starts from initialCapital to targetProfit)
  const totalTargetRange = settings.targetProfit - settings.initialCapital;
  let targetProgressPercent = 0;
  if (totalTargetRange > 0 && netProfit > 0) {
    targetProgressPercent = Math.min(Math.round((netProfit / totalTargetRange) * 100), 100);
  }

  // Stop loss danger indicator
  const totalStopRange = settings.initialCapital - settings.stopLoss;
  let stopLossIntensity = 0; // 0 to 100 representing how close we are to stop loss
  if (totalStopRange > 0 && netProfit < 0) {
    stopLossIntensity = Math.min(Math.round((Math.abs(netProfit) / totalStopRange) * 100), 100);
  }

  const handleSave = () => {
    onUpdateSettings({
      initialCapital: Number(editForm.initialCapital) || 0,
      targetProfit: Number(editForm.targetProfit) || 0,
      stopLoss: Number(editForm.stopLoss) || 0,
      currency: editForm.currency || 'VND',
    });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditForm({ ...settings });
    setIsEditing(false);
  };

  // Export state to JSON file
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ settings, logs, exportDate: Date.now() }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `capital-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.logs)) {
            // Confirm with user
            const confirmed = window.confirm(
              `Bạn có thực sự muốn khôi phục dữ liệu từ tệp này không?\n\n- Số ca giao dịch nhập vào: ${parsed.logs.length}\n`
            );
            if (confirmed) {
              onImportLogs(parsed.logs, parsed.settings);
            }
          } else {
            alert('Định dạng tệp cấu hình không hợp lệ.');
          }
        } catch (error) {
          alert('Không thể đọc tệp. Hãy chắc chắn tệp tải lên là tệp JSON xuất ra từ ứng dụng.');
        }
      };
    }
  };

  // Confirmation alert on wipe out
  const handleWipeData = () => {
    const confirmed = window.confirm(
      'CẢNH BÁO KHẨN CẤP\n\nHành động này sẽ XÓA TOÀN BỘ lịch sử các ca giao dịch mốc giờ của bạn và reset tài khoản về mốc gốc.\n\nHành động này không thể hoàn tác. Bạn có chắc chắn muốn làm mới không?'
    );
    if (confirmed) {
      onClearLogs();
    }
  };

  return (
    <div className="space-y-6" id="capital-overview-wrapper">
      {/* Top Banner Warns */}
      {currentBalance <= settings.stopLoss && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3.5 text-rose-800 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h4 className="font-semibold text-sm">Chạm ngưỡng Cắt lỗ dừng giao dịch!</h4>
            <p className="text-xs text-rose-600 mt-0.5">
              Tài khoản hiện tại ({formatCurrency(currentBalance, settings.currency)}) đã xuống thấp hơn hoặc bằng giới hạn cắt lỗ đã đặt ({formatCurrency(settings.stopLoss, settings.currency)}). Hãy cân nhắc dừng lại, kiểm tra nguồn lực và hồi phục tâm lý trước khi đi lệnh tiếp theo.
            </p>
          </div>
        </div>
      )}

      {currentBalance >= settings.targetProfit && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3.5 text-emerald-800">
          <div className="text-2xl animate-bounce">🏆</div>
          <div>
            <h4 className="font-semibold text-sm">Xin chúc mừng! Đã đạt mục tiêu chốt lời!</h4>
            <p className="text-xs text-emerald-600 mt-0.5">
              Tài khoản hiện tại ({formatCurrency(currentBalance, settings.currency)}) đã chạm mốc hoặc vượt trên mục tiêu kế hoạch ban đầu ({formatCurrency(settings.targetProfit, settings.currency)}). Kỷ luật chốt mục tiêu thành công là tố chất cốt lõi của nhà đầu tư xuất chúng!
            </p>
          </div>
        </div>
      )}

      {currentBalance < settings.initialCapital && currentBalance > settings.stopLoss && stopLossIntensity >= 75 && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3.5 text-amber-800">
          <AlertOctagon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Cảnh báo: Sắp chạm giới hạn cắt lỗ!</h4>
            <p className="text-xs text-amber-600 mt-0.5">
              Số dư hiện tại cách ngưỡng cắt lỗ chỉ còn{' '}
              <strong>{formatCurrency(currentBalance - settings.stopLoss, settings.currency)}</strong>. Hãy thắt chặt kỷ luật và tối ưu hóa khối lượng lệnh giao dịch.
            </p>
          </div>
        </div>
      )}

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Balance Card - White block with clean bold typography */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-sans">TỔNG VỐN (EQUITY)</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none font-mono">
              {formatCurrency(currentBalance, settings.currency)}
            </span>
            <div className={`text-xs font-bold mt-2 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {netProfit >= 0 ? '+' : ''}{profitPercentage}% lũy kế tổng
            </div>
          </div>
        </div>

        {/* Today's Net Profit Card - Dynamically green or red depending on Today's results */}
        <div className={`p-6 rounded-[2rem] shadow-sm flex flex-col justify-between relative overflow-hidden group border border-transparent transition-all duration-300 ${
          todayNetProfit > 0 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-150/40' 
            : todayNetProfit < 0 
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-150/40' 
            : 'bg-white text-slate-900 border-slate-100 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold uppercase tracking-wider font-sans ${todayNetProfit === 0 ? 'text-slate-400' : 'text-white/80'}`}>
              LỢI NHUẬN HÔM NAY
            </span>
            <div className={`p-2 rounded-xl ${todayNetProfit === 0 ? 'bg-slate-100 text-slate-600' : 'bg-white/20 text-white'}`}>
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black leading-none font-mono">
              {todayNetProfit >= 0 ? '+' : ''}{formatCurrency(todayNetProfit, settings.currency)}
            </span>
            <div className={`text-xs font-bold mt-2 ${todayNetProfit === 0 ? 'text-slate-400' : 'text-white/90'}`}>
              Tỷ lệ: {todayNetProfit >= 0 ? '+' : ''}{todayProfitPercentage}% • {todayWinCount} Thắng - {todayLossCount} Thua
            </div>
          </div>
        </div>

        {/* Net Profit Card - Highlighted Indigo element */}
        <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-lg shadow-indigo-200 text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="opacity-80 text-xs font-bold uppercase tracking-wider font-sans">LỢI NHUẬN RÒNG (P/L)</span>
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black leading-none font-mono">
              {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit, settings.currency)}
            </span>
            <div className="opacity-95 text-xs font-bold mt-2">
              Lũy kế {winCount} ca thắng • {totalTrades} phiên tổng
            </div>
          </div>
        </div>

        {/* Win Rate & Target Card */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-sans">TỶ LỆ THẮNG MỐC</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="animate-fadeIn">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none font-mono">{winRate}%</span>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden font-sans">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${winRate}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{winCount} Thắng</span>
              <span>{lossCount} Thua</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings / Capital Configurator Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8" id="capital-editor-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-50 pb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" /> Cài Đặt Hạn Mức Vốn & Chỉ Tiêu
            </h3>
            <p className="text-xs text-slate-500 mt-1">Cấu hình Vốn gốc ban đầu, chỉ tiêu chốt lời mục tiêu và ngưỡng cắt lỗ an toàn</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-indigo-100/50 uppercase tracking-wider"
            >
              <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa thông số
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5 animate-pulse">Vốn Gốc Ban Đầu</label>
                <input
                  type="number"
                  value={editForm.initialCapital}
                  onChange={(e) => setEditForm({ ...editForm, initialCapital: Number(e.target.value) })}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold text-slate-800"
                  placeholder="Ví dụ: 600000"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5">Mục Tiêu Thắng (Chốt Lời)</label>
                <input
                  type="number"
                  value={editForm.targetProfit}
                  onChange={(e) => setEditForm({ ...editForm, targetProfit: Number(e.target.value) })}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold text-slate-800"
                  placeholder="Ví dụ: 700000"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5">Ngưỡng An Toàn (Cắt Lỗ)</label>
                <input
                  type="number"
                  value={editForm.stopLoss}
                  onChange={(e) => setEditForm({ ...editForm, stopLoss: Number(e.target.value) })}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold text-slate-800"
                  placeholder="Ví dụ: 500000"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider mb-1.5">Đơn Vị Tiền Tệ</label>
                <input
                  type="text"
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800 text-center uppercase"
                  placeholder="VND"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black transition-all rounded-xl cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                <X className="w-4 h-4" /> Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Check className="w-4 h-4" /> Lưu thông số
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">VỐN GỐC BAN ĐẦU</span>
              <span className="text-lg font-black text-slate-800 font-mono">{formatCurrency(settings.initialCapital, settings.currency)}</span>
            </div>
            <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/50">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">MỤC TIÊU CHỐT LỜI</span>
              <span className="text-lg font-black text-emerald-700 font-mono">{formatCurrency(settings.targetProfit, settings.currency)}</span>
            </div>
            <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100/50">
              <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block mb-1">GIỚI HẠN CẮT LỖ</span>
              <span className="text-lg font-black text-rose-700 font-mono">{formatCurrency(settings.stopLoss, settings.currency)}</span>
            </div>
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">TIỀN TỆ HỆ THỐNG</span>
              <span className="text-lg font-black text-slate-800 uppercase">{settings.currency}</span>
            </div>
          </div>
        )}
      </div>

      {/* Targets & Goals Thermometer / Progress Tracker */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
        <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" /> Tiến độ kế hoạch Tài chính
        </h3>
        <div className="space-y-4">
          {/* Target Profit meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Quỹ Mục tiêu Thắng (Chốt Lời)</span>
              <span className="font-semibold text-emerald-600">
                {targetProgressPercent}% ({formatCurrency(currentBalance > settings.initialCapital ? currentBalance - settings.initialCapital : 0, settings.currency)} / {formatCurrency(settings.targetProfit - settings.initialCapital, settings.currency)})
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${targetProgressPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
              ></div>
            </div>
          </div>

          {/* Stop Loss proximity */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Mức độ Nguy hiểm Cắt Lỗ</span>
              <span className={`font-semibold ${stopLossIntensity >= 75 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                {stopLossIntensity}% ({formatCurrency(currentBalance < settings.initialCapital ? settings.initialCapital - currentBalance : 0, settings.currency)} / {formatCurrency(settings.initialCapital - settings.stopLoss, settings.currency)})
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${stopLossIntensity}%` }}
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  stopLossIntensity >= 75
                    ? 'bg-gradient-to-r from-rose-500 to-red-600'
                    : 'bg-gradient-to-r from-amber-400 to-rose-400'
                }`}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Control Drawer (Wipe stats, Backup configs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <strong>Sao lưu dữ liệu:</strong> Tải xuống sao lưu và khôi phục khi đổi trình duyệt
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Import option */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-colors font-medium">
            <ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />
            Nhập Sao lưu
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          {/* Download export option */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors font-medium"
            type="button"
          >
            Xuất dữ liệu (.json)
          </button>

          {/* Wipe data option */}
          <button
            onClick={handleWipeData}
            className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors font-medium"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm trống Nhật ký
          </button>
        </div>
      </div>
    </div>
  );
}
