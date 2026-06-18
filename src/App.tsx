import { useState, useEffect } from 'react';
import { TradingLog, CapitalSettings, TelegramConfig } from './types';
import CapitalOverview from './components/CapitalOverview';
import TradingLogs from './components/TradingLogs';
import TelegramSettings from './components/TelegramSettings';
import AnalyticsCharts from './components/AnalyticsCharts';
import { sendTelegramMessage, formatTelegramMessage } from './utils/telegram';
import { Wallet, Shield, Clock, BookOpen, CheckCircle, BarChart3, ListTodo, Sliders } from 'lucide-react';

const LOCAL_STORAGE_LOGS_KEY = 'vnvung_trading_logs';
const LOCAL_STORAGE_SETTINGS_KEY = 'vnvung_capital_settings';
const LOCAL_STORAGE_TELEGRAM_KEY = 'vnvung_telegram_config';

const DEFAULT_SETTINGS: CapitalSettings = {
  initialCapital: 600000,   // 600,000 VND
  targetProfit: 700000,     // 700,000 VND (600,000 VND + 100,000 VND profit target)
  stopLoss: 500000,         // 500,000 VND (600,000 VND - 100,000 VND stop loss)
  currency: 'VND',
};

const DEFAULT_TELEGRAM: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: false,
  autoSendOnLog: true,
  autoSendOnMilestone: true,
};

export default function App() {
  // State initialization with local state loading
  const [logs, setLogs] = useState<TradingLog[]>([]);
  const [settings, setSettings] = useState<CapitalSettings>(DEFAULT_SETTINGS);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(DEFAULT_TELEGRAM);
  
  // App UI auxiliary states
  const [clockTime, setClockTime] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'charts' | 'settings'>('overview');

  // Load state on mount
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (savedLogs) setLogs(JSON.parse(savedLogs));

      const savedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.initialCapital === 10000000) {
          const migrated = {
            ...parsed,
            initialCapital: 600000,
            targetProfit: 700000,
            stopLoss: 500000,
          };
          setSettings(migrated);
          localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(migrated));
        } else {
          setSettings(parsed);
        }
      }

      const savedTelegram = localStorage.getItem(LOCAL_STORAGE_TELEGRAM_KEY);
      if (savedTelegram) setTelegramConfig(JSON.parse(savedTelegram));
    } catch (e) {
      console.error('Error reading localStorage configurations:', e);
    }
  }, []);

  // Sync state helpers
  const handleLogsChange = (newLogs: TradingLog[]) => {
    setLogs(newLogs);
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(newLogs));
  };

  const handleSettingsChange = (newSettings: CapitalSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const handleTelegramConfigChange = (newTele: TelegramConfig) => {
    setTelegramConfig(newTele);
    localStorage.setItem(LOCAL_STORAGE_TELEGRAM_KEY, JSON.stringify(newTele));
  };

  // Detailed operational helpers
  const handleAddLog = async (newLog: TradingLog) => {
    const updatedLogs = [newLog, ...logs];
    handleLogsChange(updatedLogs);

    // Dynamic milestone triggers: Auto check if target chốt lời / stop-loss is reached
    if (telegramConfig.enabled && telegramConfig.autoSendOnMilestone && telegramConfig.botToken && telegramConfig.chatId) {
      // Calculate projected values
      let totalW = 0;
      let totalL = 0;
      updatedLogs.forEach(l => {
        if (l.type === 'WIN') totalW += l.amount;
        else totalL += l.amount;
      });
      const net = totalW - totalL;
      const current = settings.initialCapital + net;

      let milestoneAlert = '';
      if (current >= settings.targetProfit) {
        milestoneAlert = `🎉 🔥 *CẢNH BÁO MỤC TIÊU CỰC ĐẠI!* Đã đạt mốc mục tiêu chốt lời kế hoạch: \`${settings.targetProfit.toLocaleString()} ${settings.currency}\`!\nSố dư hiện tại: \`${current.toLocaleString()} ${settings.currency}\`.\nHãy bảo toàn lợi nhuận tối ưu!`;
      } else if (current <= settings.stopLoss) {
        milestoneAlert = `🚨 🛑 *CẢNH BÁO DƯỚI NGƯỠNG CHIẾN THUẬT!* Tài khoản đã sụt giảm chạm ngưỡng cắt lỗ: \`${settings.stopLoss.toLocaleString()} ${settings.currency}\`!\nSố dư hiện tại: \`${current.toLocaleString()} ${settings.currency}\`.\nHãy lập tức dừng giao dịch kiểm tra lại chiến lược!`;
      }

      if (milestoneAlert) {
        // Send a separate prominent alert message to telegram channel
        await sendTelegramMessage(telegramConfig.botToken, telegramConfig.chatId, milestoneAlert);
      }
    }
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Xác nhận xóa bản ghi kết quả này?')) {
      const filtered = logs.filter(l => l.id !== id);
      handleLogsChange(filtered);
    }
  };

  const handleUpdateLog = (updatedLog: TradingLog) => {
    const mapped = logs.map(l => l.id === updatedLog.id ? updatedLog : l);
    handleLogsChange(mapped);
  };

  const handleClearLogs = () => {
    handleLogsChange([]);
  };

  const handleImportLogs = (importedLogs: TradingLog[], importedSettings?: CapitalSettings) => {
    handleLogsChange(importedLogs);
    if (importedSettings) {
      handleSettingsChange(importedSettings);
    }
    alert('Khôi phục tệp nhật ký thành công!');
  };

  // Local Clock implementation
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setClockTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" id="vnvung-app-root">
      {/* Upper Navigation Header bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 backdrop-blur-md bg-white/95 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-150">
            VP
          </div>
          <div>
            <h1 className="text-2xl font-black text-indigo-600 tracking-tight">VỐNVỮNG<span className="text-rose-500">PRO</span></h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Hệ thống quản lý vốn & Telegram Signal</p>
          </div>
        </div>

        {/* Live Clock & Security Stamp */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId ? (
            <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full border border-emerald-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                TELEGRAM CONNECTED{telegramConfig.botUsername ? `: @${telegramConfig.botUsername.replace(/^@/, '')}` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TELEGRAM OFFLINE</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 font-bold font-mono rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{clockTime || '00:00:00'}</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Mobile quick-switching Navigation tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar scroll-smooth gap-1 p-1 bg-slate-100 rounded-xl lg:hidden">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[100px] text-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 min-w-[100px] text-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all ${
              activeTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Nhật ký {logs.length > 0 && `(${logs.length})`}
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex-1 min-w-[100px] text-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all ${
              activeTab === 'charts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Phân tích
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 min-w-[100px] text-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Telegram
          </button>
        </div>

        {/* Desktop grid, fallback tabs for responsive widths */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLS: Core Functional Space */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Desktop views: always visible. Mobile views: conditional based on activeTab */}
            <div className={`${activeTab === 'overview' ? 'block' : 'hidden lg:block'}`}>
              <CapitalOverview
                settings={settings}
                onUpdateSettings={handleSettingsChange}
                logs={logs}
                onClearLogs={handleClearLogs}
                onImportLogs={handleImportLogs}
              />
            </div>

            <div className={`${activeTab === 'charts' ? 'block' : 'hidden lg:block'}`}>
              <AnalyticsCharts logs={logs} settings={settings} />
            </div>

            <div className={`${activeTab === 'logs' ? 'block' : 'hidden lg:block'}`}>
              <TradingLogs
                logs={logs}
                settings={settings}
                telegramConfig={telegramConfig}
                onAddLog={handleAddLog}
                onDeleteLog={handleDeleteLog}
                onUpdateLog={handleUpdateLog}
              />
            </div>
          </div>

          {/* RIGHT 1 COL: Integration, Configuration and Trade Rules */}
          <div className="space-y-6">
            <div className={`${activeTab === 'settings' ? 'block' : 'hidden lg:block'}`}>
              <TelegramSettings
                config={telegramConfig}
                onChange={handleTelegramConfigChange}
                settings={settings}
                logs={logs}
              />
            </div>

            {/* Psychological & Discipline Trading Rules Card! */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6" id="trading-rules-card">
              <h3 className="font-sans font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Quy Tắc Quản Lý Vốn Vàng
              </h3>

              <ul className="space-y-4 text-xs text-slate-600">
                <li className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[11px] flex items-center justify-center border border-indigo-100">1</span>
                  <div>
                    <strong className="text-slate-900 font-bold block">Quy tắc sinh mệnh 2%</strong>
                    <span>Tuyệt đối không bao giờ mạo hiểm quá 2% tổng quỹ vốn trên bất kỳ một giao dịch đơn lẻ nào.</span>
                  </div>
                </li>

                <li className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[11px] flex items-center justify-center border border-indigo-100">2</span>
                  <div>
                    <strong className="text-slate-900 font-bold block">Kỷ luật mốc giờ biệt lập</strong>
                    <span>Có thắng có thua là chu kỳ tự nhiên. Chia vốn và chốt kết quả theo từng khung dứt khoát tránh cuốn nộ đi lệnh dồn (Martingale).</span>
                  </div>
                </li>

                <li className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[11px] flex items-center justify-center border border-indigo-100">3</span>
                  <div>
                    <strong className="text-slate-900 font-bold block">Tôn trọng Chốt lời & Cắt lỗ</strong>
                    <span>Dứt khoát tắt máy rút tiền khi đã đạt mục tiêu hoặc chạm giới hạn cắt lỗ chiến thuật đặt ra ban đầu.</span>
                  </div>
                </li>

                <li className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[11px] flex items-center justify-center border border-indigo-100">4</span>
                  <div>
                    <strong className="text-slate-900 font-bold block">Tối ưu mốc giờ nghỉ ngơi</strong>
                    <span>Ghi nhận thống kê biểu đồ cột hiệu năng mốc giờ để phát hiện khung thời gian tỉnh táo và tránh giao dịch mệt mỏi.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
