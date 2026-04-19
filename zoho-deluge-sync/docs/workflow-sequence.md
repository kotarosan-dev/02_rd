＃ Zoho 実装フロー — zoho-setup / zoho-harness 起動時のシーケンス

「Zsetup を見ながらやって」「Harness で進めて」と依頼されたときに、内部で
何がどの順番で動くのかをシーケンス図で整理したもの。

スキル間の役割分担:

| スキル | 担当 |
|---|---|
| `zoho-setup` | 個別サービスの **技術リファレンス**（CRM/Creator/Books/...の API 仕様、Deluge 制約、認証手順） |
| `zoho-harness` | **オーケストレーション**（タスク分解 → 実装 → 検証 → セーブポイント） |
| `zoho-deluge-internal-sync` | Deluge 関数の **CRUD + 実行 + ログ取得** を内部 API + `pnpm run try` で完全自動化 |
| `zoho-api-access` | 公式 REST API（Client Credentials Flow）の認証ヘルパー |

---

## パターン A: 「zoho-setup を見ながらやって」と言われたとき

軽量フロー。Planner / Evaluator は介在せず、Main Agent が直接リファレンスを読みながら実装する。
**単発タスク**・**調査寄り**・**短時間で終わる作業**向け。

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Main as Main Agent
    participant Setup as zoho-setup<br/>(リファレンス)
    participant Deluge as zoho-deluge-internal-sync<br/>(.dg + pnpm run try)
    participant API as Zoho 内部API / 公式API
    participant Repo as Git リポジトリ

    User->>Main: 「zoho-setup 見ながら<br/>○○を実装して」

    Main->>Setup: SKILL.md 読み込み
    Setup-->>Main: API可否・認証手順・<br/>Deluge制約・テンプレ

    Note over Main: タスク種別を判定
    alt API完結タスク（CRMレコード作成など）
        Main->>API: zoho-api-access で<br/>Client Credentials → REST
        API-->>Main: result
    else Deluge 関数の実装が含まれる
        Main->>Deluge: SKILL.md 読み込み<br/>（zoho-setup から参照される）
        Deluge-->>Main: .dg フォーマット・try ループ仕様
        Main->>Deluge: pnpm run create -- <name>
        Deluge->>API: 内部API POST /functions
        API-->>Deluge: id, api_name
        Main->>Main: .dg を編集<br/>(args / expect log)
        loop [PASS] が出るまで
            Main->>Deluge: pnpm run try -- <name>.dg
            Deluge->>API: PUT update + POST execute
            API-->>Deluge: logs / errors (line番号付き)
            alt [PASS]
                Deluge-->>Main: 成功
            else [ERR] / [FAIL]
                Deluge-->>Main: line=NN message=...
                Main->>Main: .dg を自動修正
            end
        end
    else GUI必須タスク（Blueprint設計など）
        Main->>User: GUI手順を提示<br/>→ 手動操作を依頼
    end

    Main->>Repo: git commit
    Main-->>User: 完了報告
```

**特徴**:
- Planner / Evaluator は呼ばない（Main が直接判断）
- Sprint Contract / tasks.json は作らない
- 軽い・速い／ただし複数タスクの統制は弱い

---

## パターン B: 「zoho-harness で進めて」と言われたとき

フルオーケストレーション。複数タスク・要件定義から一気通貫で実装する場合に使用。
**Planner / Generator / Evaluator** の 3 サブエージェントが順次起動し、状態は
`tasks.json` / `progress.md` / `next.md` / `artifacts/zoho_ids.{env}.json` に永続化される。

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Main as Main Agent
    participant Harness as zoho-harness<br/>(SKILL.md)
    participant Planner as Planner<br/>(subagent)
    participant Matrix as api-capability-matrix.md
    participant Gen as Generator<br/>(subagent)
    participant Setup as zoho-setup
    participant Deluge as zoho-deluge-internal-sync
    participant Eval as Evaluator<br/>(subagent)
    participant API as Zoho API
    participant State as tasks.json /<br/>progress.md /<br/>zoho_ids.json
    participant Repo as Git

    User->>Main: 「harness で<br/>この要件を実装して」

    %% Phase 0: 計画
    Main->>Harness: SKILL.md 読み込み
    Harness-->>Main: ワークフロー仕様

    Main->>Planner: 起動（要件 + ゴール）
    Planner->>Matrix: API可否判定
    Matrix-->>Planner: api_ok / gui_required / hybrid
    Note over Planner: Deluge 関数タスクは<br/>api_ok + tool=zoho-deluge-internal-sync
    Planner->>State: tasks.json 生成
    Planner-->>Main: タスク一覧 + 優先順位
    Main->>User: 計画レビュー依頼
    User-->>Main: 承認
    Main->>Repo: git commit (初期セーブ)

    %% Phase 1..N: 各タスク
    loop 各タスク T_i
        Main->>Gen: 起動（T_i 実行）
        Gen->>State: Sprint Contract 生成

        alt T_i = Deluge 関数実装
            Gen->>Deluge: SKILL.md 読み込み
            Gen->>Deluge: pnpm run create -- <name>
            Deluge->>API: 内部API
            loop [PASS] まで
                Gen->>Deluge: pnpm run try
                Deluge->>API: push + exec
                API-->>Deluge: logs / errors
                Gen->>Gen: .dg 修正
            end
            Gen->>State: zoho_ids.json に<br/>deluge_functions[].id 追記
        else T_i = API完結（モジュール作成等）
            Gen->>Setup: 該当セクション読み込み
            Gen->>API: Client Credentials → REST
            Gen->>State: zoho_ids.json 追記
        else T_i = GUI必須
            Gen->>State: gui-procedures/T_i.md 生成
            Gen->>User: 手順書提示<br/>→ waiting_human_ack
            User-->>Gen: ack
        end

        Gen-->>Main: 完了

        Main->>Eval: 起動（T_i 検証）
        Eval->>API: COQL等で外部影響を確認
        Eval->>State: progress.md 追記
        alt Pass
            Eval-->>Main: ✅ Pass
            Main->>Repo: git commit + tag savepoint/T-i
            Main->>State: tasks.json status=done
        else Fail
            Eval-->>Main: ❌ Fail + 理由
            Main->>Gen: 再実行
        end
    end

    %% Phase Final
    Main->>State: handoff テンプレで完了報告書
    Main->>Repo: git tag savepoint/complete
    Main-->>User: 全タスク完了報告
```

**特徴**:
- Planner が **api-capability-matrix.md** を見て Deluge タスクを `api_ok` と判定
  → Generator が `zoho-deluge-internal-sync` を呼び出す
- Evaluator が独立コンテキストで **3 レベル検証**（Record / Field / Workflow）
- 各タスク完了で git tag による **セーブポイント**
- 割り込み発生時は handoff テンプレで状態を退避 → 別セッションで復帰可能

---

## パターン C: パターン B の中で Deluge 関数タスクだけを抜き出した詳細

Generator の中で `pnpm run try` がどう回るかを詳しく見たいとき用。

```mermaid
sequenceDiagram
    autonumber
    participant Gen as Generator
    participant Dg as deluge/<name>.dg
    participant Try as pnpm run try
    participant Push as push.ts
    participant Exec as exec.ts
    participant Logs as logs.ts
    participant API as 内部API<br/>(Cookie+CSRF)

    Note over Gen: zoho-deluge-sync/ が<br/>無ければ初期化

    Gen->>API: pnpm run create -- <name>
    API-->>Gen: id + 正規化済 api_name
    Gen->>Dg: スタブ生成<br/>(//! ディレクティブ + body)

    loop [PASS] が出るまで
        Gen->>Dg: body / args / expect log を編集
        Gen->>Try: pnpm run try -- deluge/<name>.dg

        Try->>Push: push (PUT /functions/<id>)
        Push->>API: Content-Type: text/plain<br/>workflow=<body>
        alt 構文エラー
            API-->>Push: 400 INVALID_DATA<br/>+ line_number
            Push-->>Try: [ERR] line=NN
            Try-->>Gen: 構文エラー詳細
        else 成功
            API-->>Push: 200 OK
            Push-->>Try: pushed

            Try->>Exec: execute (POST .../actions/test)
            Exec->>API: arguments={...}
            API-->>Exec: status + logs[] + error{}
            Exec-->>Try: result

            Try->>Try: assert<br/>(expect status / expect log)
            alt assertion 通過
                Try-->>Gen: [PASS]
            else 失敗
                Try->>Logs: 必要なら logs API
                Logs-->>Try: 詳細ログ
                Try-->>Gen: [FAIL] expected=...<br/>actual=...
            end
        end
    end

    Gen->>Gen: zoho_ids.json に id 追記
```

---

## どちらを使うか — 判断フロー

```mermaid
flowchart TD
    Start[ユーザー依頼] --> Q1{単発？<br/>調査寄り？}
    Q1 -->|Yes| SetupFlow[パターンA<br/>zoho-setup 直読み]
    Q1 -->|No| Q2{要件定義から<br/>複数タスク？}
    Q2 -->|Yes| HarnessFlow[パターンB<br/>zoho-harness フル起動]
    Q2 -->|No| Q3{Deluge 関数<br/>だけ？}
    Q3 -->|Yes| DelugeOnly[zoho-deluge-internal-sync<br/>単独で pnpm run try]
    Q3 -->|No| SetupFlow
```

| ケース | 使うパターン |
|---|---|
| 「CRM のフィールド1個追加して」 | A（zoho-setup 直読み） |
| 「この Lead → Contact 関数を作って」 | C（Deluge スキル単独） |
| 「業務フロー全体を要件定義から実装して」 | B（harness フル起動） |
| 「Books の請求書 API の仕様教えて」 | A の調査モード |
| 「先週中断したやつの続き」 | B（harness が tasks.json から復帰） |

---

## 状態ファイル早見表（パターン B のみ）

| ファイル | 生成者 | 用途 |
|---|---|---|
| `tasks.json` | Planner | タスクキュー・進捗 |
| `progress.md` | 全エージェント（追記） | 作業ログ |
| `next.md` | 直前エージェント | 次アクション |
| `contracts/sprint-T{id}.md` | Planner | 着手前合意 |
| `gui-procedures/T{id}-*.md` | Generator | GUI手順書（gui_required時） |
| `artifacts/zoho_ids.{env}.json` | Generator | 作成済みリソースID（含 deluge_functions） |
