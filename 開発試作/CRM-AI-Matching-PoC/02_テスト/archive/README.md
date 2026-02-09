# archive

デプロイに使わない実装を退避したフォルダ。**デプロイ用の正本は `../ai_matching/`**（server (1) ベース + 理由生成）。

| フォルダ | 内容 |
|----------|------|
| **server-1-console-original** | コンソールから取得した「動いている」元実装（node20, Pinecone REST）。理由生成なし。 |
| **catalyst-function-python** | Python 版（python39）。マッチング理由生成あり。コンソールは Node のため未使用。 |
| **catalyst-bundle-python** | Python 版バンドル。同上。 |
| **catalyst-bundle-nodejs** | Node 版（理由生成入り）。Pinecone SDK 使用。config が server (1) と異なるため参照用。 |
| **catalyst-upload-node** | Node 版の別実装（node20, Pinecone REST）。参照用。 |

日付: 2026-02-09
