# 02_R&D - 研究開発ワークスペース

## 概要
このディレクトリは社内R&D（研究開発）プロジェクトを管理するワークスペースです。

## ディレクトリ構造

```
02_R&D/
├── .claude/                    # Claude Code設定
│   └── settings.local.json     # ローカル権限設定
├── 開発試作/                    # 既存R&Dプロジェクト
│   ├── Cline/                  # Cline関連
│   ├── KindleAutoCap/          # Kindle自動キャプチャ
│   ├── metal/                  # Metal関連
│   ├── my-widget/              # Zohoウィジェット開発
│   ├── nextjsとsupabaseテスト/  # Next.js + Supabaseテスト
│   ├── project/                # プロジェクト
│   ├── React-project-zipping/  # React圧縮プロジェクト
│   └── RunwayAPI/              # Runway API
└── README.md                   # このファイル
```

## 新規プロジェクト作成

新しいR&Dプロジェクトを開始する場合は、以下のいずれかの方法で作成できます：

### 方法1: 開発試作フォルダ内に追加
```
開発試作/{プロジェクト名}/
```

### 方法2: 標準プロジェクト構造（大規模プロジェクト向け）
```
0X_{プロジェクト名}/
├── 01_計画/
├── 02_テスト/
├── 03_実装/
└── 04_その他/
```

## 開発環境

### Node.js プロジェクト
```bash
npm install
npm run dev
```

### Python プロジェクト
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
```

## 注意事項
- 機密情報（APIキー等）は.envファイルに保存し、gitにコミットしない
- 実験的なコードでも適切なドキュメントを残す
- 成功した実験は`03_実装/`に移行を検討

## 関連ディレクトリ
- `../01_Tools/` - 社内ツール
- `../../02_Services/` - サービス関連
- `../../01_Clients/` - クライアントプロジェクト
