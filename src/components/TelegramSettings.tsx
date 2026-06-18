import { useState } from 'react';
import { TelegramConfig, CapitalSettings, TradingLog } from '../types';
import { sendTelegramMessage, formatTelegramMessage } from '../utils/telegram';
import { Send, CheckCircle, AlertTriangle, Eye, EyeOff, Info, HelpCircle, Bot, Sparkles, ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react';

interface TelegramSettingsProps {
  config: TelegramConfig;
  onChange: (newConfig: TelegramConfig) => void;
  settings: CapitalSettings;
  logs: TradingLog[];
}

export default function TelegramSettings({ config, onChange, settings, logs }: TelegramSettingsProps) {
  const [showToken, setShowToken] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Interactive wizard helper states
  const [showHelperWizard, setShowHelperWizard] = useState(false);
  const [helperToken, setHelperToken] = useState('');
  const [helperVerifyLoading, setHelperVerifyLoading] = useState(false);
  const [helperVerifyResult, setHelperVerifyResult] = useState<{ success: boolean; botName?: string; botUser?: string; error?: string } | null>(null);

  const handleVerifyAndAddBot = async () => {
    if (!helperToken.trim()) {
      setHelperVerifyResult({
        success: false,
        error: 'Vui lòng nhập Token trước khi kiểm tra.'
      });
      return;
    }

    setHelperVerifyLoading(true);
    setHelperVerifyResult(null);

    let cleanToken = helperToken.trim();
    if (cleanToken.toLowerCase().startsWith('bot')) {
      cleanToken = cleanToken.substring(3);
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const data = await response.json();
      
      if (data.ok && data.result) {
        const { first_name, username } = data.result;
        setHelperVerifyResult({
          success: true,
          botName: first_name,
          botUser: username
        });
        
        // Auto apply setup to actual active configuration
        onChange({
          ...config,
          botToken: cleanToken,
          botUsername: username,
          enabled: true
        });
      } else {
        setHelperVerifyResult({
          success: false,
          error: data.description || 'Mã Token không hợp lệ hoặc Bot đã bị thu hồi.'
        });
      }
    } catch (err) {
      setHelperVerifyResult({
        success: false,
        error: 'Lỗi mạng: Không thể kết nối tới máy chủ Telegram. Hãy kiểm tra lại mạng.'
      });
    } finally {
      setHelperVerifyLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!config.botToken || !config.chatId) {
      setTestStatus('error');
      setErrorMessage('Vui lòng điền đầy đủ Token Bot và Chat ID.');
      return;
    }

    setTestStatus('sending');
    setErrorMessage('');

    // Auto-fetch Username of the Bot
    let cleanToken = config.botToken.trim();
    if (cleanToken.toLowerCase().startsWith('bot')) {
      cleanToken = cleanToken.substring(3);
    }

    let fetchedUsername = config.botUsername || '';
    try {
      const botResponse = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const botData = await botResponse.json();
      if (botData.ok && botData.result && botData.result.username) {
        fetchedUsername = botData.result.username;
      }
    } catch (e) {
      console.warn("Could not fetch telegram username:", e);
    }

    const text = formatTelegramMessage(null, logs, settings, true);
    const result = await sendTelegramMessage(config.botToken, config.chatId, text);

    if (result.success) {
      setTestStatus('success');
      onChange({ 
        ...config, 
        botUsername: fetchedUsername || config.botUsername 
      });
      setTimeout(() => setTestStatus('idle'), 4000);
    } else {
      setTestStatus('error');
      setErrorMessage(result.error || 'Kiểm tra lại Token/Chat ID hoặc thử chat trước với Bot.');
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8" id="telegram-settings-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-sans font-black text-slate-900 text-lg">Cấu hình Telegram</h2>
            <p className="text-xs text-slate-500">Tự động báo cáo kết quả ca giao dịch tức thì</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-indigo-600 font-extrabold hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all border border-indigo-100/50"
          type="button"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showInstructions ? 'ẨN HƯỚNG DẪN' : 'XEM HƯỚNG DẪN'}
        </button>
      </div>

      {showInstructions && (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 space-y-3 animate-fadeIn">
          <h4 className="font-medium text-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-500" />
            Cách lấy thông tin cấu hình Telegram:
          </h4>
          <ol className="list-decimal pl-4 space-y-2 text-xs">
            <li>
              <strong>Tạo Bot:</strong> Tìm kiếm <span className="font-mono text-slate-800 bg-slate-200/60 px-1 rounded">@BotFather</span> trên Telegram. Gửi tin nhắn <span className="font-mono text-sky-600 font-medium">/newbot</span> và làm theo hướng dẫn để đặt tên bot. Copy dãy ký tự <strong>HTTP API Token</strong> nhận được (ví dụ: <span className="font-mono text-slate-400">719283921:AAHG...</span>).
            </li>
            <li>
              <strong>Lấy Chat ID cá nhân:</strong> Tìm Bot <span className="font-mono text-slate-800 bg-slate-200/60 px-1 rounded">@GetMyChatID_Bot</span> hoặc <span className="font-mono text-slate-800 bg-slate-200/60 px-1 rounded">@userinfobot</span>, ấn <strong>Start</strong> để nhận dãy ID số của bạn (ví dụ: <span className="font-mono text-slate-800">123456789</span>).
            </li>
            <li>
              <strong>Lấy Chat ID Nhóm (nếu muốn gửi vào Nhóm):</strong> Thêm Bot bạn vừa tạo vào Nhóm Telegram. Gửi tin nhắn bất kỳ lên nhóm. Sử dụng bot <span className="font-mono text-slate-800 bg-slate-200/60 px-1 rounded">@raw_id_bot</span> thêm vào nhóm để xem ID nhóm (ID nhóm thường có dấu âm phẩy ở đầu, ví dụ: <span className="font-mono text-slate-800">-100987654321</span>).
            </li>
            <li>
              <strong className="text-amber-700">Lưu ý quan trọng:</strong> Bạn <span className="underline">phải mở cuộc trò chuyện với Bot của bạn trước</span> (ấn <strong>Start/Bắt đầu</strong> trực tiếp với bot) thì bot mới được phép gửi tin nhắn cho bạn.
            </li>
          </ol>
        </div>
      )}

      {/* Dynamic Bot Addition Wizard (Troubleshooter & Setup Assistant) */}
      <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50/50 to-slate-50 rounded-2xl border border-indigo-100/50">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHelperWizard(!showHelperWizard)}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <Bot className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                TRÌNH THÊM BOT TELEGRAM NHANH <Sparkles className="w-3 h-3 text-indigo-500 fill-indigo-500" />
              </h3>
              <p className="text-[11px] text-slate-500">Chưa có bot? Tự động kiểm tra bot và thêm vào ứng dụng</p>
            </div>
          </div>
          <button 
            type="button"
            className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all uppercase tracking-wider"
          >
            {showHelperWizard ? 'ĐÓNG TRÌNH TRỢ GIÚP' : 'MỞ TRÌNH TRỢ GIÚP'}
          </button>
        </div>

        {showHelperWizard && (
          <div className="mt-5 space-y-4 border-t border-indigo-100/60 pt-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Create bot */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block mb-1">BƯỚC 1: TẠO BOT</span>
                  <p className="text-xs text-slate-600 font-medium">Nhấn nút dưới để tới kênh chat của <strong className="text-slate-900">@BotFather</strong> trên Telegram.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Gửi tin nhắn <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-mono font-bold">/newbot</code> và làm theo hướng dẫn để nhận mã <strong>Bot Token</strong>.</p>
                </div>
                <a 
                  href="https://t.me/BotFather" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-bold py-2.5 px-3 rounded-xl transition-all text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  MỞ @BotFather
                </a>
              </div>

              {/* Step 2: Get chat id */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block mb-1">BƯỚC 2: LẤY CHAT ID</span>
                  <p className="text-xs text-slate-600 font-medium font-sans">Tìm kiếm và nhấn Bắt đầu bot <strong className="text-slate-900">@GetMyChatID_Bot</strong> để xem mã ID của bạn.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Lưu ý: Bạn cũng cần nhấn <strong className="text-slate-800">Bắt đầu / Start</strong> với chú Bot bạn vừa tạo ở Bước 1.</p>
                </div>
                <a 
                  href="https://t.me/GetMyChatID_Bot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold py-2.5 px-3 rounded-xl transition-all text-center border border-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  MỞ @GetMyChatID_Bot
                </a>
              </div>
            </div>

            {/* Test and Add form */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">BƯỚC 3: QUÉT TOKEN & THÊM BOT TỰ ĐỘNG</h4>
              </div>
              <p className="text-xs text-slate-300">Nhập mã Token nhận được từ BotFather để kiểm tra. Hệ thống sẽ tự động quét trạng thái Bot, điền đầy đủ thông tin & kích hoạt luôn cho bạn:</p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Dán mã Token vào đây..."
                  value={helperToken}
                  onChange={(e) => setHelperToken(e.target.value)}
                  className="bg-slate-950 border border-slate-850 text-white text-xs placeholder-slate-500 px-4 py-3 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-grow"
                />
                <button
                  type="button"
                  onClick={handleVerifyAndAddBot}
                  disabled={helperVerifyLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 text-xs font-black uppercase px-5 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {helperVerifyLoading ? 'ĐANG QUÉT...' : 'QUÉT & THÊM'}
                </button>
              </div>

              {helperVerifyResult && (
                <div className={`text-xs p-3.5 rounded-xl border transition-all ${
                  helperVerifyResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-100'
                }`}>
                  {helperVerifyResult.success ? (
                    <div className="space-y-1">
                      <p className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-4 h-4 text-emerald-400" /> KẾT NỐI BOT THÀNH CÔNG!
                      </p>
                      <p className="text-[11px]">Tên hiển thị: <strong className="text-white">{helperVerifyResult.botName}</strong></p>
                      <p className="text-[11px]">Tên tài khoản: <strong className="text-white">@{helperVerifyResult.botUser}</strong></p>
                      <p className="text-[10px] text-emerald-300 mt-1.5 leading-relaxed">Mã Bot Token đã tự động được điền và bật kích hoạt bên dưới. Hãy tiếp tục điền Chat ID của bạn để nhận báo cáo tức thời!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-extrabold flex items-center gap-1.5 text-rose-400">
                        <AlertTriangle className="w-4 h-4 text-rose-400" /> KHÔNG THỂ THÊM BOT
                      </p>
                      <p className="text-[11px] font-mono leading-relaxed">{helperVerifyResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Toggle Telegram Global Enable */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
          <div>
            <label className="text-sm font-semibold text-slate-800 cursor-pointer block" htmlFor="tele-active-toggle">
              Kích hoạt tính năng thông báo
            </label>
            <p className="text-xs text-slate-500">Bật/tắt việc nhận báo cáo qua Telegram bot</p>
          </div>
          <div className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="tele-active-toggle"
              checked={config.enabled}
              onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </div>
        </div>

        {config.enabled && (
          <div className="space-y-4 pt-2 animate-fadeIn">
            {/* Telegram Token input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Telegram Bot Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Dán mã Token nhận từ @BotFather..."
                  value={config.botToken}
                  onChange={(e) => onChange({ ...config, botToken: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 outline-none rounded-xl transition-all font-mono pr-11"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Telegram Bot Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Bot Username (Optional - Tự động hiển thị khi gửi thử)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  placeholder="CapiManager_Bot"
                  value={config.botUsername?.replace(/^@/, '') || ''}
                  onChange={(e) => onChange({ ...config, botUsername: e.target.value.trim() })}
                  className="w-full text-sm pl-8 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 outline-none rounded-xl transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sử dụng để hiển thị trạng thái @bot_name ở thanh menu phía trên.</p>
            </div>

            {/* Telegram Chat ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Telegram Chat ID (Cá nhân hoặc Nhóm)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 987654321 hoặc -100987654321"
                value={config.chatId}
                onChange={(e) => onChange({ ...config, chatId: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 outline-none rounded-xl transition-all font-mono"
              />
            </div>

            {/* Notification settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Toggle send on new log */}
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block cursor-pointer" htmlFor="toggle-auto-log">
                    Gửi ngay khi chốt ca
                  </label>
                  <span className="text-[10px] text-slate-400">Gửi kết quả tức thì khi lưu</span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-auto-log"
                  checked={config.autoSendOnLog}
                  onChange={(e) => onChange({ ...config, autoSendOnLog: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Toggle send on milestone alert */}
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block cursor-pointer" htmlFor="toggle-auto-milestone">
                    Cảnh báo Chốt lời/Cắt lỗ
                  </label>
                  <span className="text-[10px] text-slate-400">Gửi khẩn cấp khi đạt mốc</span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-auto-milestone"
                  checked={config.autoSendOnMilestone}
                  onChange={(e) => onChange({ ...config, autoSendOnMilestone: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Submit & Test action area */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testStatus === 'sending' || !config.botToken || !config.chatId}
                className={`w-full py-3 px-4 rounded-xl text-xs font-black transition-all uppercase tracking-wider focus:outline-none flex items-center justify-center gap-2 ${
                  testStatus === 'sending'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-850 shadow-md shadow-slate-200'
                }`}
              >
                <Send className="w-4 h-4 text-indigo-400" />
                {testStatus === 'sending' ? 'ĐANG GỬI TIN THỬ...' : 'GỬI THỬ TIN TELEGRAM'}
              </button>

              {/* Status alerts */}
              {testStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-700 animate-slideUp">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>Thành công!</strong> Đã gửi tin nhắn mẫu đến Telegram của bạn. Hãy kiểm tra điện thoại.</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-700 animate-slideUp">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Lỗi gửi tin nhắn:</strong>
                    <span className="break-all">{errorMessage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
