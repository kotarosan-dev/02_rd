-- 特典テーブルのポリシー修正
DROP POLICY IF EXISTS "Admins can manage rewards" ON rewards;
DROP POLICY IF EXISTS "Anyone can view rewards" ON rewards;

-- 新しいポリシーの作成
CREATE POLICY "Anyone can view rewards"
  ON rewards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage rewards"
  ON rewards FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- サンプル特典データの追加
INSERT INTO rewards (title, description, points, category, stock) VALUES
('30分延長クーポン', '施術時間を30分延長できるクーポン', 500, 'クーポン', 50),
('スペシャルケアコース', '通常メニューに加えて特別なケアを提供', 1000, 'メニュー', 30),
('オリジナルスキンケアセット', '厳選されたスキンケア製品のセット', 2000, '商品', 20),
('VIPメンバーシップ（1ヶ月）', '1ヶ月間、すべてのサービスが10%オフ', 3000, '会員特典', 10),
('パーソナルカウンセリング', '専門家による60分の個別カウンセリング', 1500, 'サービス', 15)
ON CONFLICT DO NOTHING;