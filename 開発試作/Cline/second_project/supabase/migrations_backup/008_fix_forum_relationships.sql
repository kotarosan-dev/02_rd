-- Drop existing foreign key constraints if they exist
ALTER TABLE forum_posts
DROP CONSTRAINT IF EXISTS forum_posts_profile_id_fkey;

-- Remove profile_id column if it exists
ALTER TABLE forum_posts
DROP COLUMN IF EXISTS profile_id;

-- Add foreign key relationship between forum_posts and profiles using user_id
ALTER TABLE forum_posts
ADD CONSTRAINT forum_posts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add foreign key relationship between post_comments and profiles using user_id
ALTER TABLE post_comments
ADD CONSTRAINT post_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add foreign key relationship between post_likes and profiles using user_id
ALTER TABLE post_likes
ADD CONSTRAINT post_likes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();