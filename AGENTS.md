# AGENTS.md

## Cursor Cloud specific instructions

### Codebase overview

This is an R&D workspace (`02_R&D`) containing multiple independent sub-projects (not a monorepo). There is no root-level `package.json`. Each sub-project manages its own dependencies independently.

**Active projects:**

| Project | Path | Runtime | Start command |
|---------|------|---------|---------------|
| CRM AI Matching PoC (backend) | `開発試作/CRM-AI-Matching-PoC/02_テスト/ai_matching/` | Node.js / Express | `node run-local.js` (port 3000) |
| CRM Widget (frontend) | `開発試作/CRM-AI-Matching-PoC/02_テスト/crm-widget/` | Static HTML/JS | Serve `app/widget.html` (requires ZET CLI or any static server) |
| CRM Analytics Demo | `scripts/crm-analytics-demo/` | Node.js | Individual scripts |
| Zoho Learn Tests | `Learn/` | Node.js (ESM) | Individual scripts |
| Book Processor | `book-processor/` | PowerShell / GAS | Windows-oriented pipeline; not runnable on Linux |

Everything under `開発試作/_archive/` is archived and should not be modified.

### Running the main service locally

```bash
cd "開発試作/CRM-AI-Matching-PoC/02_テスト/ai_matching"
npm install
node run-local.js        # Express server on port 3000
```

Key endpoints: `GET /` (status), `GET /health`, `GET /stats`, `POST /upsert`, `POST /search`.

### External service dependencies

Full functionality requires API keys configured via `.env` at `開発試作/CRM-AI-Matching-PoC/03_実装/config/.env` (see `.env.example` in the same directory). Required keys:

- `PINECONE_API_KEY` / `PINECONE_HOST` — vector search (required for `/upsert`, `/search`, `/stats`)
- `OPENAI_API_KEY` — match reason generation (optional; matching works without it)
- `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` / `ZOHO_ORG_ID` — Zoho CRM API (required for CRM scripts)

Without these keys, the server starts and health endpoints work, but data operations return `PINECONE_API_KEY must be set`.

### Lint / Test / Build

- **No ESLint or linter** is configured for active projects.
- **No automated test suite** exists. Testing is manual via `curl` or Zoho CRM widget interaction.
- **No build step** is needed; the backend is plain Node.js (CommonJS), the widget is static HTML/CSS/JS.

### Gotchas

- Directory names contain Japanese characters (e.g. `開発試作`). Always quote paths in shell commands.
- `dotenv` v17+ prints an informational line to stdout on startup when `.env` is missing — this is not an error.
- The widget (`crm-widget/`) is designed to run inside Zoho CRM's iframe SDK. Standalone local testing requires ZET CLI (`zet run`) or loading `app/test.html` directly.
- `book-processor/` relies on PowerShell and Windows-specific paths (`G:\マイドライブ`); it is not runnable on Linux.
