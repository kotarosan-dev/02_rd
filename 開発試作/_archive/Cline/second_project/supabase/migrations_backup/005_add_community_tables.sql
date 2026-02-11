-- フォーラム投稿テーブル
CREATE TABLE IF NOT EXISTS forum_posts (
  id serial PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '一般',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ブックマークテーブル
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id serial PRIMARY KEY,
  post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- いいねテーブル
CREATE TABLE IF NOT EXISTS post_likes (
  id serial PRIMARY KEY,
  post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- コメントテーブル
CREATE TABLE IF NOT EXISTS post_comments (
  id serial PRIMARY KEY,
  post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS forum_posts_user_id_idx ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS forum_posts_created_at_idx ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_category_idx ON forum_posts(category);
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS post_bookmarks_post_id_idx ON post_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS post_bookmarks_user_id_idx ON post_bookmarks(user_id);

-- RLSの設定
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

-- 投稿のポリシー
CREATE POLICY "Anyone can read forum posts"
  ON forum_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON forum_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own posts"
  ON forum_posts FOR UPDATE
  USING (user_id = (
    SELECT id FROM profiles
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own posts"
  ON forum_posts FOR DELETE
  USING (user_id = (
    SELECT id FROM profiles
    WHERE id = auth.uid()
  ));

-- いいねのポリシー
CREATE POLICY "Anyone can read likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can toggle likes"
  ON post_likes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can remove own likes"
  ON post_likes FOR DELETE
  USING (user_id = (
    SELECT id FROM profiles
    WHERE id = auth.uid()
  ));

-- コメントのポリシー
CREATE POLICY "Anyone can read comments"
  ON post_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON post_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  ));

-- ブックマークのポリシー
CREATE POLICY "Anyone can read bookmarks"
  ON post_bookmarks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create bookmarks"
  ON post_bookmarks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can remove own bookmarks"
  ON post_bookmarks FOR DELETE
  USING (user_id = (
    SELECT id FROM profiles
    WHERE id = auth.uid()
  ));

-- トリガーの設定（既存のupdate_updated_at_column関数を使用）
CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();