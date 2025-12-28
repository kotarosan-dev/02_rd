-- Drop existing tables
DROP TABLE IF EXISTS goal_achievements CASCADE;
DROP TABLE IF EXISTS goal_progress CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS reward_exchanges CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;

-- Create goals table with correct relationships
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  deadline DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goal progress table
CREATE TABLE goal_progress (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL,
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goal achievements table
CREATE TABLE goal_achievements (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  achievement_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create rewards table
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

-- Create reward exchanges table
CREATE TABLE reward_exchanges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_exchanges ENABLE ROW LEVEL SECURITY;

-- Create policies for goals
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

-- Create policies for goal progress
CREATE POLICY "Users can view own progress"
  ON goal_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record own progress"
  ON goal_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for goal achievements
CREATE POLICY "Users can view own achievements"
  ON goal_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record own achievements"
  ON goal_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for rewards
CREATE POLICY "Anyone can view rewards"
  ON rewards FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage rewards"
  ON rewards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'service_role'
    )
  );

-- Create policies for reward exchanges
CREATE POLICY "Users can view own exchanges"
  ON reward_exchanges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create exchanges"
  ON reward_exchanges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX goals_user_id_idx ON goals(user_id);
CREATE INDEX goal_progress_goal_id_idx ON goal_progress(goal_id);
CREATE INDEX goal_achievements_goal_id_idx ON goal_achievements(goal_id);
CREATE INDEX reward_exchanges_user_id_idx ON reward_exchanges(user_id);
CREATE INDEX reward_exchanges_reward_id_idx ON reward_exchanges(reward_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();