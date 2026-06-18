import { useState, useEffect, FormEvent } from 'react';
import { TradingLog, LogType, CapitalSettings, TelegramConfig } from '../types';
import { sendTelegramMessage, formatTelegramMessage, formatDate, formatCurrency } from '../utils/telegram';
import { Plus, Trash2, Edit2, Send, Save, X, ChevronLeft, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';

interface TradingLogsProps {
  logs: TradingLog[];
  settings: CapitalSettings;
  telegramConfig: TelegramConfig;
  onAddLog: (log: TradingLog) => void;
  onDeleteLog: (id: string) => void;
  onUpdateLog: (log: TradingLog) => void;
}

export default function TradingLogs({
  logs,
  settings,
  telegramConfig,
  onAddLog,
  onDeleteLog,
  onUpdateLog,
}: TradingLogsProps) {
  // Add log Form State
  const [hourMark, setHourMark] = useState('');
  const [type, setType] = useState<LogType>('WIN');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [sendTele, setSendTele] = useState(telegramConfig.autoSendOnLog);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHourMark, setEditHourMark] = useState('');
  const [editType, setEditType] = useState<LogType>('WIN');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Auto detect current hour on load
  useEffect(() => {
    const hours = new Date().getHours().toString().padStart(2, '0');
    setHourMark(`${hours}:00`);
  }, []);

  // Update sendTele when global auto-send config shifts
  useEffect(() => {
    setSendTele(telegramConfig.autoSendOnLog);
  }, [telegramConfig.autoSendOnLog]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hourMark.trim()) return alert('Vui lòng nhập hoặc chọn mốc giờ.');
    if (!amount || Number(amount) <= 0) return alert('Số tiền phải lớn hơn 0.');

    setIsSubmitting(true);
    const numAmount = Number(amount);

    const newLog: TradingLog = {
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      hourMark: hourMark.trim(),
      type: type,
      amount: numAmount,
      notes: notes.trim(),
      telegramSent: false,
    };

    // If Telegram sending is requested and details are ready
    if (sendTele && telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId) {
      // Temporarily add log to compute projected state
      const mockLogs = [newLog, ...logs];
      const message = formatTelegramMessage(newLog, mockLogs, settings, false);
      const res = await sendTelegramMessage(telegramConfig.botToken, telegramConfig.chatId, message);
      if (res.success) {
        newLog.telegramSent = true;
      }
    }

    onAddLog(newLog);
    
    // Reset form
    setAmount('');
    setNotes('');
    setIsSubmitting(false);
    
    // Auto increment hour prediction
    const [currHr, currMin] = hourMark.split(':');
    if (currHr && !isNaN(Number(currHr))) {
      const nextHr = (Number(currHr) + 1) % 24;
      setHourMark(`${nextHr.toString().padStart(2, '0')}:00`);
    }
  };

  // Resend log to Tele manually
  const handleManualSendTele = async (log: TradingLog) => {
    if (!telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
      alert('Vui lòng bật cấu hình Telegram và điền đầy đủ thông tin để sử dụng.');
      return;
    }

    const message = formatTelegramMessage(log, logs, settings, false);
    const res = await sendTelegramMessage(telegramConfig.botToken, telegramConfig.chatId, message);

    if (res.success) {
      onUpdateLog({ ...log, telegramSent: true });
      alert(`Đã gửi báo cáo mốc giờ ${log.hourMark} lên Telegram thành công!`);
    } else {
      alert(`Lỗi khi gửi lên Telegram: ${res.error}`);
    }
  };

  // Start edit flow
  const startEdit = (log: TradingLog) => {
    setEditingId(log.id);
    setEditHourMark(log.hourMark);
    setEditType(log.type);
    setEditAmount(log.amount.toString());
    setEditNotes(log.notes || '');
  };

  // Save edits
  const saveEdit = (id: string) => {
    if (!editHourMark.trim()) return alert('Vui lòng chọn hoặc điền mốc giờ.');
    if (!editAmount || Number(editAmount) <= 0) return alert('Số tiền phải lớn hơn 0.');

    const originalLog = logs.find((l) => l.id === id);
    if (originalLog) {
      onUpdateLog({
        ...originalLog,
        hourMark: editHourMark.trim(),
        type: editType,
        amount: Number(editAmount),
        notes: editNotes.trim(),
      });
    }
    setEditingId(null);
  };

  // Pagination helper
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);

  const hourOptions = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <div className="space-y-6" id="trading-logs-section">
      {/* Input Log Form */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
        <h2 className="font-sans font-black text-slate-900 text-xl mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          Chốt Kết Quả Mốc Giờ
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Hour slot selection / custom input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Mốc Giờ / Ca Làm
              </label>
              <div className="flex gap-1.5">
                <select
                  value={hourOptions.includes(hourMark) ? hourMark : ''}
                  onChange={(e) => setHourMark(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl"
                >
                  <option value="">-- Tự nhập --</option>
                  {hourOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {!hourOptions.includes(hourMark) && (
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Ca 1, H4,..."
                    value={hourMark}
                    onChange={(e) => setHourMark(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none rounded-xl font-mono"
                  />
                )}
              </div>
            </div>

            {/* Win Loss Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Kết Quả Ca
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('WIN')}
                  className={`py-2 px-3 text-sm font-semibold rounded-xl border transition-all ${
                    type === 'WIN'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🟢 THẮNG (WIN)
                </button>
                <button
                  type="button"
                  onClick={() => setType('LOSS')}
                  className={`py-2 px-3 text-sm font-semibold rounded-xl border transition-all ${
                    type === 'LOSS'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🔴 THUA (LOSS)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Lợi nhuận mốc giờ ({settings.currency})
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder={`Ví dụ: 10000 hoặc 50000...`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none rounded-xl font-mono transition-all"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Ghi chú / Chiến lược
              </label>
              <input
                type="text"
                placeholder="Ghi nhanh chiến thuật, tâm lý..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none rounded-xl transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Telegram Instant Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send-tele-instant"
                checked={sendTele}
                disabled={!telegramConfig.enabled}
                onChange={(e) => setSendTele(e.target.checked)}
                className="rounded text-sky-500 focus:ring-sky-500 w-4 h-4 disabled:bg-slate-200 disabled:cursor-not-allowed"
              />
              <label
                className={`text-xs font-medium cursor-pointer ${
                  telegramConfig.enabled ? 'text-slate-600' : 'text-slate-400'
                }`}
                htmlFor="send-tele-instant"
              >
                Gửi Telegram tức thì khi lưu{ !telegramConfig.enabled && ' (Chưa cấu hình bot)'}
              </label>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-200 uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'ĐANG GỬI...' : 'LƯU KẾT QUẢ CA'}
            </button>
          </div>
        </form>
      </div>

      {/* History Log Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between col-span-12">
          <div>
            <h3 className="font-sans font-black text-slate-900 text-lg">Lịch Sử Quản Lý Theo Mốc Giờ</h3>
            <p className="text-xs text-slate-500 mt-0.5">Danh sách các phiên và thông tin lợi nhuận tích lũy</p>
          </div>
          <span className="text-xs font-black px-3.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-mono uppercase tracking-wider">
            {logs.length} bản ghi
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium">Chưa có lịch sử giao dịch nào được ghi lại.</p>
            <p className="text-xs text-slate-400 mt-1">Hãy bắt đầu điền kết quả mốc giờ đầu tiên ở khung phía trên!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm text-slate-600">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Mốc Giờ</th>
                  <th className="px-5 py-3.5">Kết Quả</th>
                  <th className="px-5 py-3.5">Lợi Nhuận</th>
                  <th className="px-5 py-3.5">Thời Gian Ghi</th>
                  <th className="px-5 py-3.5">Ghi Chú</th>
                  <th className="px-5 py-3.5 text-center">Gửi Tele</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentLogs.map((log) => {
                  const isEditingThis = editingId === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Hour Mark column */}
                      <td className="px-5 py-3.5">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editHourMark}
                            onChange={(e) => setEditHourMark(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-mono w-24 outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                            {log.hourMark}
                          </span>
                        )}
                      </td>

                      {/* Type column */}
                      <td className="px-5 py-3.5">
                        {isEditingThis ? (
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as LogType)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                          >
                            <option value="WIN">🟢 THẮNG</option>
                            <option value="LOSS">🔴 THUA</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              log.type === 'WIN'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {log.type === 'WIN' ? '🟢 WIN' : '🔴 LOSS'}
                          </span>
                        )}
                      </td>

                      {/* Amount column */}
                      <td className="px-5 py-3.5">
                        {isEditingThis ? (
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-mono w-28 outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className={`font-mono font-semibold ${log.type === 'WIN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {log.type === 'WIN' ? '+' : '-'}
                            {formatCurrency(log.amount, settings.currency)}
                          </span>
                        )}
                      </td>

                      {/* Timestamp column */}
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {formatDate(log.timestamp)}
                      </td>

                      {/* Notes column */}
                      <td className="px-5 py-3.5 max-w-[200px] truncate title={log.notes}">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm w-full outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">{log.notes || '-'}</span>
                        )}
                      </td>

                      {/* Tele Sent Status with direct send option */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {log.telegramSent ? (
                            <span className="text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              ✓ Đã gửi
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5" title="Chưa gửi Telegram">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                Chưa gửi
                              </span>
                              {telegramConfig.enabled && (
                                <button
                                  type="button"
                                  onClick={() => handleManualSendTele(log)}
                                  className="p-1 hover:bg-slate-100 text-sky-600 rounded transition-colors"
                                  title="Gửi báo cáo ca này lên Telegram"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Operations */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditingThis ? (
                            <>
                              <button
                                onClick={() => saveEdit(log.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(log)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Sửa bản ghi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteLog(log.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa bản ghi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, logs.length)} / {logs.length} ca
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-semibold text-slate-700 bg-slate-50 rounded border border-slate-200">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
