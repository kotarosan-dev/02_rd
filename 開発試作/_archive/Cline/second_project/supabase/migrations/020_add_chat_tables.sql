-- チャットチャンネルテーブル
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_type TEXT CHECK (channel_type IN ('line', 'instagram', 'direct')),
  external_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'video')),
  is_from_user BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- AI提案テーブル
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  suggestion_type TEXT CHECK (suggestion_type IN ('advice', 'post', 'image')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- インデックスの作成
CREATE INDEX chat_channels_user_id_idx ON chat_channels(user_id);
CREATE INDEX chat_channels_last_message_at_idx ON chat_channels(last_message_at);
CREATE INDEX chat_messages_channel_id_created_at_idx ON chat_messages(channel_id, created_at);
CREATE INDEX ai_suggestions_channel_id_idx ON ai_suggestions(channel_id);

-- RLSポリシーの設定
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- チャンネルのポリシー
CREATE POLICY "ユーザーは自分のチャンネルを閲覧可能" ON chat_channels
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "ユーザーは自分のチャンネルを作成可能" ON chat_channels
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "ユーザーは自分のチャンネルを更新可能" ON chat_channels
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- メッセージのポリシー
CREATE POLICY "チャンネル参加者はメッセージを閲覧可能" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_channels
      WHERE id = chat_messages.channel_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "チャンネル参加者はメッセージを送信可能" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_channels
      WHERE id = chat_messages.channel_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

-- AI提案のポリシー
CREATE POLICY "チャンネル参加者はAI提案を閲覧可能" ON ai_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_channels
      WHERE id = ai_suggestions.channel_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "管理者のみAI提案を作成可能" ON ai_suggestions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "管理者のみAI提案を更新可能" ON ai_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- チャンネル一覧ビューの作成（管理者を除外）
CREATE OR REPLACE VIEW chat_channels_with_profiles AS
SELECT 
  c.*,
  p.full_name,
  p.avatar_url,
  p.role
FROM chat_channels c
LEFT JOIN profiles p ON c.user_id = p.id
WHERE p.role != 'admin'; 