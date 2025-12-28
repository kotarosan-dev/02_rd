// 環境変数から設定を読み込む
export const LINE_CHANNEL_ACCESS_TOKEN = process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN;
export const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// チャット関連の設定
export const CHAT_CONFIG = {
  maxMessageLength: 1000,
  maxMessagesPerChannel: 1000,
  supportedMessageTypes: ['text', 'image', 'video'] as const,
};

// AI関連の設定
export const AI_CONFIG = {
  model: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.7,
};

// アプリケーション全体の設定
export const APP_CONFIG = {
  name: 'Inner Glow Beauty',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
}; 