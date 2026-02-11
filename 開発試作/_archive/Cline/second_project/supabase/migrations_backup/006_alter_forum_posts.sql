-- 新しいカラムを追加
ALTER TABLE forum_posts
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '一般',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 新しいインデックスを作成
CREATE INDEX IF NOT EXISTS forum_posts_category_idx ON forum_posts(category); 