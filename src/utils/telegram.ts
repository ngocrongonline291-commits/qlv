import { TradingLog, CapitalSettings } from '../types';

/**
 * Formats a number into a readable currency string.
 */
export function formatCurrency(amount: number, currency: string = 'VND'): string {
  try {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    } else if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } else {
      return `${amount.toLocaleString()} ${currency}`;
    }
  } catch (e) {
    return `${amount} ${currency}`;
  }
}

/**
 * Formats date to dd/MM/yyyy HH:mm
 */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats a trade log and capital status into a beautiful Telegram Markdown message.
 */
export function formatTelegramMessage(
  log: TradingLog | null,
  allLogs: TradingLog[],
  settings: CapitalSettings,
  isTest: boolean = false
): string {
  // Calculate stats
  let totalWin = 0;
  let totalLoss = 0;
  let winCount = 0;
  let lossCount = 0;

  let todayWin = 0;
  let todayLoss = 0;
  let todayWinCount = 0;
  let todayLossCount = 0;

  const todayDateStr = new Date().toDateString();

  allLogs.forEach(item => {
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

  let message = '';

  if (isTest) {
    message += `🔔 *THÔNG BÁO THỬ NGHIỆM TELEGRAM*\n`;
    message += `✅ Kết nối Bot Telegram hoạt động hoàn hảo!\n\n`;
  } else if (log) {
    const isWin = log.type === 'WIN';
    const statusEmoji = isWin ? '🟢 WIN (THẮNG)' : '🔴 LOSS (THUA)';
    const amountSign = isWin ? '+' : '-';
    
    message += `📊 *CẬP NHẬT KẾT QUẢ QUẢN LÝ VỐN*\n`;
    message += `⏱️ *Mốc giờ:* \`${log.hourMark}\`\n`;
    message += `👉 *Trạng thái:* ${statusEmoji}\n`;
    message += `💵 *Lợi nhuận mốc:* \`${amountSign}${formatCurrency(log.amount, settings.currency)}\`\n`;
    if (log.notes) {
      message += `📝 *Ghi chú:* _${log.notes}_\n`;
    }
    message += `───────────────────\n\n`;
  } else {
    message += `📊 *BÁO CÁO THỐNG KÊ TÀI KHOẢN*\n`;
  }

  // Current accounts section
  const balanceEmoji = netProfit >= 0 ? '📈' : '📉';
  const profitSign = netProfit >= 0 ? '+' : '';
  const todayProfitSign = todayNetProfit >= 0 ? '+' : '';
  
  message += `${balanceEmoji} *BÁO CÁO TÀI KHOẢN THỰC TẾ*\n`;
  message += `💰 *Vốn khởi điểm:* \`${formatCurrency(settings.initialCapital, settings.currency)}\`\n`;
  message += `💵 *Số dư hiện tại:* \`${formatCurrency(currentBalance, settings.currency)}\`\n`;
  message += `📆 *LỢI NHUẬN HÔM NAY:* \`${todayProfitSign}${formatCurrency(todayNetProfit, settings.currency)}\` (\`${todayProfitSign}${todayProfitPercentage}%\` | Thắng ${todayWinCount} - Thua ${todayLossCount})\n`;
  message += `🔄 *Lợi nhuận ròng tổng:* \`${profitSign}${formatCurrency(netProfit, settings.currency)}\` (\`${profitSign}${profitPercentage}%\`)\n`;
  message += `⚡️ *Tỷ lệ thắng tổng:* \`${winRate}%\` (${winCount} thắng / ${lossCount} thua)\n\n`;

  // Targets section
  message += `🎯 *Mục tiêu & Cắt lỗ:*\n`;
  message += `🟢 *Mục tiêu chốt lời:* \`${formatCurrency(settings.targetProfit, settings.currency)}\` `;
  
  if (currentBalance >= settings.targetProfit) {
    message += `🎉 *(ĐÃ HOÀN THÀNH)*`;
  } else {
    const remainingToProfit = settings.targetProfit - currentBalance;
    message += `(Còn \`${formatCurrency(remainingToProfit, settings.currency)}\`)`;
  }
  message += `\n`;

  message += `🔴 *Ngưỡng cắt lỗ:* \`${formatCurrency(settings.stopLoss, settings.currency)}\` `;
  if (currentBalance <= settings.stopLoss) {
    message += `⚠️ *(ĐÃ CHẠM NGƯỠNG)*`;
  } else {
    const remainingToStop = currentBalance - settings.stopLoss;
    message += `(Khoảng cách an toàn \`${formatCurrency(remainingToStop, settings.currency)}\`)`;
  }
  
  message += `\n\n📅 _Cập nhật lúc: ${formatDate(Date.now())}_`;

  return message;
}

/**
 * Sends a raw text message to Telegram Chat.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: 'Thiếu Token Bot hoặc Chat ID Telegram' };
  }

  // Clean token if contains "bot" word prefix
  let cleanToken = botToken.trim();
  if (cleanToken.toLowerCase().startsWith('bot')) {
    cleanToken = cleanToken.substring(3);
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description || 'Gửi tin nhắn Telegram thất bại' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi kết nối mạng đến Telegram',
    };
  }
}
