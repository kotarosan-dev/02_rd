-- Add foreign key relationship between forum_posts and profiles
ALTER TABLE forum_posts
ADD COLUMN profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing posts to set profile_id from user_id
UPDATE forum_posts
SET profile_id = user_id
WHERE profile_id IS NULL;

-- Make profile_id NOT NULL after updating existing data
ALTER TABLE forum_posts
ALTER COLUMN profile_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX forum_posts_profile_id_idx ON forum_posts(profile_id);

-- Update the select policy to include profile information
DROP POLICY IF EXISTS "Anyone can read forum posts" ON forum_posts;
CREATE POLICY "Anyone can read forum posts"
ON forum_posts FOR SELECT
USING (true);

-- Add trigger to automatically set profile_id from user_id on insert
CREATE OR REPLACE FUNCTION set_forum_post_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_id := NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forum_posts_set_profile_id
  BEFORE INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_forum_post_profile_id();