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
  is_from_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- AI提案テーブル
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  suggestion_type TEXT CHECK (suggestion_type IN ('advice', 'post', 'image')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLSポリシーの設定
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- チャットチャンネルのポリシー
CREATE POLICY "管理者はすべてのチャンネルを閲覧可能" ON public.chat_channels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'isAdmin' = 'true'
    )
  );

CREATE POLICY "管理者はチャンネルを作成可能" ON public.chat_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'isAdmin' = 'true'
    )
  );

-- チャットメッセージのポリシー
CREATE POLICY "管理者はすべてのメッセージを閲覧可能" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'isAdmin' = 'true'
    )
  );

CREATE POLICY "管理者はメッセージを送信可能" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'isAdmin' = 'true'
    )
  );

-- AI提案のポリシー
CREATE POLICY "管理者はAI提案を閲覧可能" ON public.ai_suggestions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'isAdmin' = 'true'
    )
  );

CREATE POLICY "管理者はAI提案を作成可能" ON public.ai_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'isAdmin' = 'true'
    )
  );

-- プロフィールへのアクセスポリシー
CREATE POLICY "誰でもプロフィールを閲覧可能" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- テストデータの挿入（オプション）
INSERT INTO public.chat_channels (user_id, channel_type)
SELECT id, 'direct'
FROM public.profiles
WHERE id = '79817177-4f8e-4c28-b7fe-a77c6df71ba1'
ON CONFLICT DO NOTHING; 