-- チャットチャンネルの種類を定義
CREATE TYPE channel_type AS ENUM ('line', 'instagram', 'direct');

-- チャットチャンネルテーブル
CREATE TABLE chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_type channel_type NOT NULL,
    external_id TEXT, -- LINE or Instagram のチャンネルID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb -- チャンネル固有の追加情報
);

-- メッセージテーブル
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- text, image, video など
    is_from_user BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb -- 元のプラットフォームのメタデータ
);

-- AIアシスタントの提案テーブル
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL, -- advice, post, image など
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb -- 生成パラメータなどの追加情報
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

-- 管理者のみがアクセス可能なポリシー
CREATE POLICY "管理者のみチャンネルの閲覧可能" ON chat_channels
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "管理者のみメッセージの閲覧可能" ON chat_messages
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "管理者のみAI提案の閲覧可能" ON ai_suggestions
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM profiles WHERE role = 'admin'
        )
    ); 