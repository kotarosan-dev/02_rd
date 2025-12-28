# Goal Management App

目標管理とストーリーテリングを組み合わせた、モチベーション維持のためのWebアプリケーション。

## 機能

- 目標の作成・編集・削除
- ドラッグ&ドロップによる目標のステータス管理
- ストーリーモードによる目標達成の物語化
- AIアドバイザーによる目標設定のサポート
- 進捗管理と応援機能

## 技術スタック

- Next.js 13 (App Router)
- TypeScript
- Supabase (認証・データベース)
- Tailwind CSS
- shadcn/ui
- dnd-kit (ドラッグ&ドロップ)
- OpenAI API (AIアドバイザー)

## セットアップ

1. リポジトリのクローン:
\`\`\`bash
git clone [your-repository-url]
cd [repository-name]
\`\`\`

2. 依存関係のインストール:
\`\`\`bash
npm install
\`\`\`

3. 環境変数の設定:
\`\`\`bash
cp .env.example .env.local
\`\`\`
`.env.local`ファイルを編集し、必要な環境変数を設定してください。

4. 開発サーバーの起動:
\`\`\`bash
npm run dev
\`\`\`

## 環境変数

必要な環境変数は`.env.example`ファイルを参照してください。以下の変数を設定する必要があります：

- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `OPENAI_API_KEY`: OpenAI APIキー
- `NEXT_PUBLIC_APP_URL`: アプリケーションのURL（開発環境では`http://localhost:3000`）

## デプロイ

このアプリケーションはVercelにデプロイすることを推奨します。

1. [Vercel](https://vercel.com)でアカウントを作成
2. このリポジトリをインポート
3. 環境変数を設定
4. デプロイ

## ライセンス

MIT License 