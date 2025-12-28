-- 目標管理テーブル
CREATE TABLE goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  category TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ビフォーアフターギャラリーテーブル
CREATE TABLE before_after (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  treatment_period TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ポイント付与関数
CREATE OR REPLACE FUNCTION add_points(points_to_add INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET points = COALESCE(points, 0) + points_to_add
  WHERE id = auth.uid();
END;
$$;

-- RLSポリシーの設定
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE before_after ENABLE ROW LEVEL SECURITY;

-- 目標の閲覧ポリシー（自分の目標のみ）
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

-- 目標の作成ポリシー
CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 目標の更新ポリシー（自分の目標のみ）
CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

-- ビフォーアフターの閲覧ポリシー（全員が閲覧可能）
CREATE POLICY "Anyone can view before-after posts"
  ON before_after FOR SELECT
  USING (true);

-- ビフォーアフターの作成ポリシー
CREATE POLICY "Users can create their own before-after posts"
  ON before_after FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ビフォーアフターの更新ポリシー（自分の投稿のみ）
CREATE POLICY "Users can update their own before-after posts"
  ON before_after FOR UPDATE
  USING (auth.uid() = user_id); 