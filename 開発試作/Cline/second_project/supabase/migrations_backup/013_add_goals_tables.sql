-- 目標テーブルの作成
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  deadline DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 目標の進捗記録テーブル
CREATE TABLE goal_progress (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL,
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 目標の達成報酬テーブル
CREATE TABLE goal_achievements (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  achievement_date TIMESTAMPTZ DEFAULT NOW()
);

-- RLSの有効化
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_achievements ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成
CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- 進捗記録のポリシー
CREATE POLICY "Users can view own progress"
  ON goal_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record own progress"
  ON goal_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 達成報酬のポリシー
CREATE POLICY "Users can view own achievements"
  ON goal_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record own achievements"
  ON goal_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- インデックスの作成
CREATE INDEX goals_user_id_idx ON goals(user_id);
CREATE INDEX goal_progress_goal_id_idx ON goal_progress(goal_id);
CREATE INDEX goal_achievements_goal_id_idx ON goal_achievements(goal_id);

-- updated_at自動更新用のトリガー
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();