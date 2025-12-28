-- 特典テーブルの作成
CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 特典交換履歴テーブル
CREATE TABLE reward_exchanges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSの有効化
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_exchanges ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成
CREATE POLICY "Anyone can view rewards"
  ON rewards FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage rewards"
  ON rewards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view own exchanges"
  ON reward_exchanges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create exchanges"
  ON reward_exchanges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- インデックスの作成
CREATE INDEX reward_exchanges_user_id_idx ON reward_exchanges(user_id);
CREATE INDEX reward_exchanges_reward_id_idx ON reward_exchanges(reward_id);

-- サンプルデータの挿入
INSERT INTO rewards (title, description, points, category, stock) VALUES
('30分延長クーポン', '施術時間を30分延長できるクーポン', 500, 'クーポン', 50),
('スペシャルケアコース', '通常メニューに加えて特別なケアを提供', 1000, 'メニュー', 30),
('オリジナルスキンケアセット', '厳選されたスキンケア製品のセット', 2000, '商品', 20),
('VIPメンバーシップ（1ヶ月）', '1ヶ月間、すべてのサービスが10%オフ', 3000, '会員特典', 10),
('パーソナルカウンセリング', '専門家による60分の個別カウンセリング', 1500, 'サービス', 15);