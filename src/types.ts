export type LogType = 'WIN' | 'LOSS';

export interface TradingLog {
  id: string;
  timestamp: number; // UTC timestamp of when it was recorded
  hourMark: string; // The hourly milestone, e.g. "08:00", "14:00", "Ca 1 (9h)"
  type: LogType;
  amount: number; // Always positive value; the state determines if it is profit/loss
  notes?: string;
  telegramSent?: boolean;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  autoSendOnLog: boolean;
  autoSendOnMilestone: boolean;
  botUsername?: string;
}

export interface CapitalSettings {
  initialCapital: number;
  targetProfit: number;
  stopLoss: number;
  currency: string;
}
