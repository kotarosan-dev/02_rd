-- メッセージテーブルに既読状態を追加
ALTER TABLE chat_messages
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- チャンネルテーブルに未読カウントを追加
ALTER TABLE chat_channels
ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0;

-- チャンネル一覧ビューを更新
CREATE OR REPLACE VIEW chat_channels_with_profiles AS
SELECT 
  c.*,
  p.full_name,
  p.avatar_url,
  COALESCE(m.unread_count, 0) as unread_count
FROM chat_channels c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN (
  SELECT 
    channel_id,
    COUNT(*) FILTER (WHERE read_at IS NULL) as unread_count
  FROM chat_messages
  GROUP BY channel_id
) m ON c.id = m.channel_id; 