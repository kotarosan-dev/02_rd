-- Drop existing policies for rewards table
DROP POLICY IF EXISTS "Anyone can view rewards" ON rewards;
DROP POLICY IF EXISTS "Only admins can manage rewards" ON rewards;

-- Create new policies for rewards table
CREATE POLICY "Anyone can view rewards"
  ON rewards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage rewards"
  ON rewards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update profiles table to ensure admin role is properly set
CREATE OR REPLACE FUNCTION create_admin_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'admin@example.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_admin_profile();