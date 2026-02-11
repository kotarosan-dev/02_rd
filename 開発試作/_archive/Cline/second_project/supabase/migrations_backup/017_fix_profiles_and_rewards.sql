-- プロフィールテーブルの修正
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;

ALTER TABLE profiles
ADD PRIMARY KEY (id);

-- 特典テーブルのポリシー修正
DROP POLICY IF EXISTS "Admins can manage rewards" ON rewards;

CREATE POLICY "Admins can manage rewards"
ON rewards FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- プロフィール作成トリガーの修正
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'admin@example.com' THEN 'admin'
      ELSE 'user'
    END,
    ''
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除して再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();