# デプロイメントガイド

## 環境変数の設定

### Supabase Edge Functions

Edge Functions用の環境変数は、Supabaseダッシュボードまたはコマンドラインから設定できます。

#### ダッシュボードから設定する場合
1. [Supabaseダッシュボード](https://supabase.com/dashboard/project/upegeprmcxapdsvqtzey)にアクセス
2. Settings > Functions > Environment variables に移動
3. 必要な環境変数を追加

#### コマンドラインから設定する場合
```bash
supabase secrets set KEY="VALUE"
```

### 重要な環境変数
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `OPENAI_API_KEY`
- その他のアプリケーション固有の環境変数

## セッション管理の設定

### 認証フローの問題と対処方法

#### 1. 発生した問題
1. セッション管理の問題
   - セッションが正しく維持されない
   - ログイン後のリダイレクトが機能しない
   - ユーザーロールに基づくリダイレクトが動作しない
   - `/auth`パスにアクセスした際にセッションが失われる

#### 2. 試行錯誤のプロセス

1. クライアントサイドでのリダイレクト処理
   ```typescript
   // 最初の実装（うまくいかなかった）
   useEffect(() => {
     if (session) {
       router.push('/mypage');
     }
   }, [session]);
   ```
   - 問題点：
     - レースコンディションが発生
     - ユーザーロールの取得前にリダイレクトが発生
     - クライアントとサーバーでの状態の不一致

2. ミドルウェアでの実装（部分的に成功）
   ```typescript
   // middleware.tsの初期実装
   export async function middleware(req: NextRequest) {
     const res = NextResponse.next();
     const supabase = createMiddlewareClient({ req, res });
     await supabase.auth.getSession();
     return res;
   }
   ```
   - 改善点：
     - セッションの維持は改善
     - しかし、ロールベースのリダイレクトが不完全

3. 公開パスの設定問題
   ```typescript
   // 問題のあった実装
   const PUBLIC_PATHS = ['/login', '/signup'];
   ```
   - 問題点：
     - `/auth`パスが公開パスとして設定されていない
     - セッション維持の問題の原因となっていた

#### 3. 成功した実装

1. AuthProviderの最適化
   ```typescript
   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [user, setUser] = useState<User | null>(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       const supabase = getBrowserClient();
       
       // 初期セッションの確認（エラーハンドリング強化）
       supabase.auth.getSession().then(({ data: { session }, error }) => {
         if (error) {
           console.error('❌ セッション取得エラー:', error);
           return;
         }
         if (session) {
           console.log('✅ セッションが設定されました:', session);
           setUser(session.user);
         } else {
           console.log('⚠️ セッションがありません');
           setUser(null);
         }
         setLoading(false);
       });

       // セッション変更の監視（詳細なログ追加）
       const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
         if (session) {
           console.log('✅ セッション状態が変更されました:', session);
           setUser(session.user);
         } else {
           console.log('⚠️ セッションがありません');
           setUser(null);
         }
         setLoading(false);
       });

       return () => subscription.unsubscribe();
     }, []);

     return (
       <AuthContext.Provider value={{ user, loading }}>
         {children}
       </AuthContext.Provider>
     );
   }
   ```

2. ミドルウェアの最適化
   ```typescript
   // middleware.tsの最終実装
   export async function middleware(req: NextRequest) {
     const res = NextResponse.next();
     const supabase = createMiddlewareClient({ req, res });
     const { data: { session }, error } = await supabase.auth.getSession();

     // 公開パスの設定
     const PUBLIC_PATHS = ['/auth', '/login', '/signup'];
     const isPublicPath = PUBLIC_PATHS.some(path => req.nextUrl.pathname.startsWith(path));

     if (!session && !isPublicPath) {
       return NextResponse.redirect(new URL('/auth', req.url));
     }

     if (session) {
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', session.user.id)
         .single();

       // ロールベースのリダイレクト
       if (profile?.role === 'admin' && !req.nextUrl.pathname.startsWith('/admin')) {
         return NextResponse.redirect(new URL('/admin', req.url));
       }
       if (profile?.role === 'user' && req.nextUrl.pathname.startsWith('/admin')) {
         return NextResponse.redirect(new URL('/mypage', req.url));
       }
     }

     return res;
   }
   ```

#### 4. 実装のポイント
1. セッション管理
   - 直接Supabaseクライアントを使用
   - 詳細なログ出力の実装
   - エラーハンドリングの強化

2. ミドルウェア設定
   - 公開パスの適切な設定
   - ロールベースのアクセス制御
   - セッションチェックの最適化

3. リダイレクト処理
   - サーバーサイドでの一元管理
   - ユーザーロールに基づく適切な振り分け
   - クライアントサイドのリダイレクト削除

#### 5. 動作確認項目
1. 基本機能
   - ログイン・ログアウトの正常動作
   - セッションの永続化
   - エラー時の適切な処理

2. リダイレクト
   - 管理者ユーザーが`/admin`へ正しくリダイレクト
   - 一般ユーザーが`/mypage`へ正しくリダイレクト
   - 未認証ユーザーが`/auth`へリダイレクト

3. セキュリティ
   - 権限のないページへのアクセス制御
   - セッションの適切な管理
   - クロスサイトスクリプティング対策

#### 6. 今後の改善点
1. パフォーマンス最適化
   - セッションチェックの回数削減
   - キャッシュの活用検討

2. エラーハンドリング
   - より詳細なエラーメッセージ
   - ユーザーフレンドリーなエラー表示

3. モニタリング
   - 認証フローのログ強化
   - パフォーマンスメトリクスの収集

## デプロイ手順

### Edge Functionsのデプロイ

1. 環境変数が正しく設定されていることを確認
```bash
supabase secrets list
```

2. 関数をデプロイ
```bash
supabase functions deploy [function-name]
```

3. デプロイ後の確認
- Supabaseダッシュボードでログを確認
- 基本的な機能をテスト

### アプリケーションのデプロイ

1. ビルド
```bash
npm run build
```

2. デプロイ
```bash
gcloud run deploy biyoshitsu-app --source . --region asia-northeast1
```

## 注意点

### 環境変数の更新時
1. 環境変数を更新した後は、以下の手順が必要：
   - Dockerの再起動
   - 関連する関数の再デプロイ
   - 必要に応じてアプリケーションの再デプロイ

2. 特に注意が必要な場合：
   - LINE Messaging API関連の設定変更時
   - データベース接続情報の変更時
   - API keyの更新時

### トラブルシューティング

#### Edge Functions関連
1. `環境変数が見つからない`エラーの場合：
   - 環境変数が正しく設定されているか確認
   - Dockerを再起動
   - 関数を再デプロイ

2. Webhookエラーの場合：
   - LINE Developersコンソールでwebhook URLの設定を確認
   - Supabaseダッシュボードでログを確認

#### アプリケーション関連
1. ビルドエラーの場合：
   - 必要な環境変数が`.env.local`に設定されているか確認
   - 依存関係が正しくインストールされているか確認

2. デプロイエラーの場合：
   - Cloud Runの権限設定を確認
   - リージョンの設定を確認

#### 認証関連
1. セッションが維持されない場合：
   - ブラウザのCookieが正しく設定されているか確認
   - `auth-context.tsx`の実装を確認
   - Supabaseの認証設定を確認

2. リダイレクトが機能しない場合：
   - `middleware.ts`の設定を確認
   - ロールベースのアクセス制御が正しく実装されているか確認
   - クライアントサイドのルーティング実装を確認

## 定期的なメンテナンス
1. 環境変数の確認
2. ログの確認
3. 依存パッケージの更新
4. セキュリティアップデートの適用 

## ログインの処理フロー

### ログインがどうやって動いているかを中学生向けに説明します

アプリケーションでログインする時に、コンピュータやインターネットはどのように動いているのでしょうか？ここでは、その流れを簡単に説明します。

### 1. ユーザーがログイン情報を入力する

まず、アプリを使いたい人（ユーザー）は、自分の**メールアドレス**と**パスワード**をログインフォームに入力します。これは、学校に入るときにIDカードを見せるのと似ています。

### 2. ログインボタンをクリックする

情報を入力した後、「**ログイン**」ボタンをクリックします。これで、アプリに「私はログインしようとしています」という信号を送ります。

### 3. アプリが情報をサーバーに送る

ボタンをクリックすると、アプリはあなたの入力したメールアドレスとパスワードを**サーバー**というコンピュータに送ります。サーバーは、インターネット上でデータを管理する役割を持っています。

### 4. サーバーがSupabaseを使って確認する

サーバーは**Supabase**というサービスに頼んで、送られてきたメールアドレスとパスワードが正しいかどうかを確認します。Supabaseは、データベースという大きな情報の倉庫を管理していて、ユーザーの情報もそこに保存されています。

### 5. ログインの結果を受け取る

Supabaseは、メールアドレスとパスワードが正しいかどうかをチェックして、その結果をサーバーに返します。結果は「**成功**」または「**失敗**」のどちらかです。

### 6. アプリが結果に応じて動く

- **成功した場合**:
  - ユーザーはログインに成功します。
  - ミドルウェアという仕組みが動いて、ユーザーを適切なページ（例えばマイページや管理者ページ）に自動的に移動させます。
  - これにより、ユーザーは無限にログインページに戻されることなく、スムーズにアプリを使えるようになります。

- **失敗した場合**:
  - ユーザーに「メールアドレスまたはパスワードが違います」というメッセージが表示されます。
  - ログインページに戻り、再度正しい情報を入力するように促されます。

### 7. セッションの管理

ログインが成功すると、**セッション**という情報が**クッキー**という小さなデータに保存されます。これにより、ユーザーは再度ログイン情報を入力しなくても、次回からスムーズにログインできます。

### 図解で見るログインの流れ

```
ユーザー 
   ↓
ログインフォームに情報を入力
   ↓
ログインボタンをクリック
   ↓
アプリからサーバーへ情報送信
   ↓
サーバーがSupabaseで確認
   ↓
Supabaseがサーバーに結果を返す
   ↓
アプリが結果に応じて処理
```

### まとめ

ログインの処理フローは、ユーザーが安全にアプリを利用できるようにするための一連の手順です。Supabaseを直接利用することで、認証状態を正確に管理し、ユーザーが無限リダイレクトに遭遇しないようにしています。これにより、ユーザーはスムーズにログインし、必要なページにアクセスできるようになります。 

## コミュニティ機能とゴール機能の改善計画

### 1. データベースの統合と整理

#### 1.1. 型定義の統一
現状の問題点として、`types/goal.ts`と`types/goals.ts`に異なる`Goal`インターフェースが存在し、型の不一致が発生しています。これを解決するため、以下の改善を行います：

```typescript
// types/goal.ts に統一される型定義
export interface Goal {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  type: 'daily' | 'weekly' | 'monthly';
  category: string;
  status: 'active' | 'completed' | 'failed';
  start_date: Date;
  end_date: Date;
  is_public: boolean;
  created_at: Date;
  updated_at?: Date;
}
```

#### 1.2. 関連テーブルの構造
データベースの整合性を保つため、以下のテーブル構造を採用します：

```sql
-- goal_progress テーブル
CREATE TABLE IF NOT EXISTS goal_progress (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL,
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- goal_achievements テーブル
CREATE TABLE IF NOT EXISTS goal_achievements (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  achievement_date TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. セキュリティ設定

#### 2.1. Row Level Security (RLS)
以下のポリシーを適用して、データアクセスの制御を行います：

```sql
-- 公開ゴールのポリシー
CREATE POLICY "Users can view own goals or public goals"
  ON goals FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

-- ゴールの挿入ポリシー
CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ゴールの更新ポリシー
CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);
```

### 3. 実装手順

#### 3.1. 機能の実装順序
1. ゴール管理基本機能
   - CRUD操作の実装
   - 進捗管理機能
   - カテゴリ管理

2. コミュニティ機能
   - 公開/非公開設定
   - いいね機能
   - 進捗共有機能

3. UI/UX改善
   - 進捗更新インターフェース
   - 達成報酬表示
   - レスポンシブデザイン

#### 3.2. テストとデバッグ
1. 単体テスト
   - 各機能の動作確認
   - エラーケースの検証

2. 統合テスト
   - 全体フローの確認
   - パフォーマンステスト

### 4. デプロイ時の注意点

#### 4.1. データベースマイグレーション
1. マイグレーションファイルの作成
   ```bash
   supabase migration new add_goals_tables
   ```

2. マイグレーションの実行
   ```bash
   supabase db reset
   ```

#### 4.2. 環境変数の設定
必要な環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- その他のアプリケーション固有の環境変数

### 5. 運用とモニタリング

#### 5.1. パフォーマンス監視
- データベースクエリの最適化
- N+1問題の解決
- キャッシュの活用

#### 5.2. エラー監視
- ログの収集と分析
- エラー通知の設定
- 定期的なバックアップ

### 6. 今後の改善計画

#### 6.1. 短期的な改善
- 型定義の統一
- セキュリティ設定の強化
- 基本的なUI/UX改善

#### 6.2. 中長期的な改善
- パフォーマンスの最適化
- 新機能の追加
- ユーザーフィードバックの収集と反映 

## Dockerfileのリダイレクト問題と解決方法

### どんな問題が起きていたの？

アプリを使おうとすると、ログインページに行こうとしても、ずっとループしてしまう問題が起きていました。
これは、お店の入り口で「入ってください」と「出てください」の看板が同時に出ているようなものです。
お客さん（ユーザー）は混乱して、どうすればいいか分からなくなってしまいます。

### なぜこの問題が起きたの？

この問題は、アプリを箱（Docker）に入れて配送（デプロイ）する方法に問題がありました。
具体的には以下の2つが原因でした：

1. 箱の中身の詰め方が間違っていた
```dockerfile
# 間違った方法
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
```
これは、本を箱に入れる時に、本の一部のページだけを入れてしまうようなものです。

2. 箱の使い方の説明書が間違っていた
```dockerfile
CMD ["node", "server.js"]
```
これは、本の読み方の説明を間違えて書いてしまったようなものです。

### どうやって解決したの？

問題を解決するために、箱の詰め方と説明書を修正しました：

1. 箱の中身を正しく詰める
```dockerfile
# 正しい方法
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
```
これは、本全体をきちんと箱に入れるようなものです。

2. 説明書を正しく書き直す
```dockerfile
CMD ["npm", "start"]
```
これは、本の正しい読み方を説明書に書くようなものです。

### どうして直ったの？

この修正により：
1. アプリの全ての部品が正しく配置されるようになりました
2. アプリの動かし方が正しくなりました
3. ログインページへの案内が正しく機能するようになりました

簡単に言うと、お店の看板が「いらっしゃいませ」とだけ表示されるようになり、
お客さん（ユーザー）が混乱することなく、スムーズにお店（アプリ）に入れるようになったのです。

### 学んだこと

1. アプリを箱（Docker）に入れる時は、全ての必要な部品をきちんと入れることが大切
2. 説明書（実行コマンド）は正確に書くことが重要
3. 問題が起きたら、箱の中身を確認することから始める

### 技術的な詳細説明

#### スタンドアローンモードとは？
Next.jsには「スタンドアローンモード」という特別な実行方式があります。これは以下のような特徴があります：

1. 基本的な仕組み
```javascript
// next.config.js
module.exports = {
  output: 'standalone'
}
```
- アプリケーションを最小限の依存関係で実行できるように最適化します
- node_modulesの中から必要な部分だけを抽出します
- サーバーサイドの処理を単一の実行ファイルにまとめます

2. メリット
- デプロイメントサイズの削減
- 起動時間の短縮
- 依存関係の管理が簡単になる

3. デメリット
- 特定の機能（動的ルーティングなど）が制限される可能性がある
- カスタムサーバー設定が複雑になる
- ミドルウェアの動作に影響を与える可能性がある

#### 今回の問題の技術的な原因

1. スタンドアローンモードの制限
```dockerfile
# 問題のある設定
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
CMD ["node", "server.js"]
```
- スタンドアローンモードでは、Next.jsの標準的なルーティング処理が変更されます
- ミドルウェアの実行タイミングが通常と異なる場合があります
- 環境変数の読み込みタイミングに影響を与える可能性があります

2. 修正後の設定
```dockerfile
# 改善された設定
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
CMD ["npm", "start"]
```
- Next.jsの標準的な実行環境を維持
- ミドルウェアが期待通りに動作
- 環境変数が正しいタイミングで読み込まれる

#### 具体的な改善点

1. ファイルシステムの構造
```plaintext
# 修正前（スタンドアローンモード）
/app
└── .next
    └── standalone
        ├── server.js
        └── ...

# 修正後（標準モード）
/app
├── .next
│   ├── server
│   ├── static
│   └── ...
├── node_modules
└── package.json
```

2. 実行環境の違い
```plaintext
# スタンドアローンモード
- 最小限の依存関係
- カスタマイズされたサーバー
- 制限された機能セット

# 標準モード
- 完全な依存関係
- Next.jsの標準サーバー
- すべての機能が利用可能
```

3. パフォーマンスの比較
```plaintext
スタンドアローンモード:
- イメージサイズ: 小
- 起動時間: 速い
- メモリ使用量: 少ない

標準モード:
- イメージサイズ: 大
- 起動時間: やや遅い
- メモリ使用量: やや多い
```

#### ベストプラクティス

1. スタンドアローンモードの使用判断
- 単純なアプリケーションの場合は有効
- 認証やダイナミックルーティングを使用する場合は注意が必要
- カスタムサーバー設定がある場合は避ける

2. デプロイメント設定のチェックポイント
- 環境変数の設定と読み込みタイミング
- ミドルウェアの動作確認
- ルーティングの挙動確認
- セッション管理の動作確認

3. トラブルシューティング手順
- ログの詳細な確認
- 環境変数の値の検証
- ミドルウェアの動作検証
- ルーティングパターンのテスト

この経験から、Next.jsアプリケーションをDockerコンテナ化する際は、アプリケーションの要件に応じて適切な実行モードを選択することが重要だと分かりました。特に認証やセッション管理を含むアプリケーションでは、標準モードの使用を推奨します。 

## Supabaseキーの問題と解決方法

### 発生した問題
1. 401 Unauthorized エラー
   - APIリクエストで古いSupabaseキーが使用されていた
   - デプロイ環境と実行環境で異なるキーが使用されていた
   ```
   # 古いキー（実行環境で使用）
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdlcHJtY3hhcGRzdnF0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI4NzIzNDgsImV4cCI6MjAxODQ0ODM0OH0.eE8lUNYEwzgJcHG9-kGxCVrWuJQhDrxhQQEzomP-4Oc

   # 新しいキー（デプロイ環境で使用）
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdlcHJtY3hhcGRzdnF0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MjcxMzYsImV4cCI6MjA0OTUwMzEzNn0.6ZuN5KsupNWy4i5DbhIlUMgR3_V4dDR22R2DyvJn5Vw
   ```

2. 原因
   - Dockerイメージのビルド時に古い環境変数が埋め込まれていた可能性
   - Cloud Runの環境変数設定と実際のアプリケーションの設定の不一致
   - キャッシュされたDockerイメージの使用

### 解決方法

1. プロジェクトとイメージの確認
   ```bash
   # 正しいプロジェクトの設定
   gcloud config set project biyoshitsu-kari

   # GCRイメージパスの設定
   GCR_IMAGE="asia-northeast1-docker.pkg.dev/biyoshitsu-kari/cloud-run-source-deploy/biyoshitsu-app"
   ```

2. 新しいDockerイメージのビルドとプッシュ
   ```bash
   # ビルド時に新しい環境変数を設定
   docker build -t biyoshitsu-app \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://upegeprmcxapdsvqtzey.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<新しいキー> \
     --build-arg NEXT_PUBLIC_APP_URL=https://biyoshitsu-app-1070916839862.asia-northeast1.run.app \
     .

   # GCRへのプッシュ
   docker tag biyoshitsu-app:latest $GCR_IMAGE
   docker push $GCR_IMAGE
   ```

3. Cloud Runへのデプロイ
   ```bash
   gcloud run deploy biyoshitsu-app \
     --image $GCR_IMAGE \
     --region asia-northeast1 \
     --platform managed \
     --allow-unauthenticated
   ```

### 重要な注意点

1. 環境変数の管理
   - 本番環境の環境変数は必ずCloud Run上で設定
   - Dockerビルド時の環境変数とCloud Run上の環境変数の一致を確認
   - 古い環境変数が残っていないか定期的に確認

2. デプロイ時のチェックリスト
   - [ ] 正しいプロジェクトIDの使用
   - [ ] 最新の環境変数の設定
   - [ ] Dockerイメージの正しいビルド
   - [ ] Cloud Run設定の確認

3. トラブルシューティング手順
   - Cloud Runの環境変数設定の確認
   - Dockerイメージのリビルド
   - ブラウザキャッシュのクリア
   - アプリケーションログの確認

### 予防策

1. 環境変数の定期的な監査
2. デプロイプロセスの自動化
3. 環境変数の変更履歴の管理
4. テスト環境での事前確認 