---
name: enterprise-application-architecture-patterns
description: Martin Fowlerの『PoEAA』に基づくエンタープライズアプリケーションのアーキテクチャ設計パターン集。レイヤ化アーキテクチャ、ドメインロジック、データソース、O/Rマッピング、Webプレゼンテーション、分散パターン等を体系的に整理したフレームワーク。
---

# エンタープライズアプリケーション アーキテクチャパターン

## 概要

Martin Fowlerが体系化したエンタープライズアプリケーション開発における51の設計パターンのカタログ。アプリケーションを「プレゼンテーション層」「ドメインロジック層」「データソース層」の三層に分離し、各層の設計判断に対して再利用可能なパターンを提供する。現代の主要フレームワーク（Rails、Spring、Hibernate、Django等）の設計基盤となっている。

## 使用場面（When to Use）

- エンタープライズアプリケーションのアーキテクチャ設計を行うとき
- フレームワーク選定にあたり設計思想の違いを理解したいとき
- O/Rマッピング戦略を選択・評価するとき
- レガシーシステムのリファクタリング方針を決定するとき
- 設計レビューで共通言語を用いて議論したいとき
- DDD（ドメイン駆動設計）やCQRS等の現代パターンの理解基盤を固めたいとき

## 基本原則：三層レイヤ化アーキテクチャ

| 層 | 役割 | 主要パターン |
|----|------|------------|
| プレゼンテーション層 | ユーザーとの対話、表示ロジック | MVC、Page Controller、Front Controller、Template View |
| ドメインロジック層 | ビジネスルール、業務ロジック | Transaction Script、Domain Model、Table Module、Service Layer |
| データソース層 | データの永続化、外部システムとの通信 | Table Data Gateway、Row Data Gateway、Active Record、Data Mapper |

**依存の方向**: プレゼンテーション → ドメインロジック → データソース（上位層が下位層に依存）

## パターンカタログ

### Category 1: ドメインロジックパターン

ビジネスロジックをどのように組織化するかの選択肢。

| パターン | 概要 | 適用条件 | 代表的な実装例 |
|---------|------|---------|-------------|
| **Transaction Script** | 各ビジネストランザクションを一つの手続きとして記述 | ロジックが単純、CRUD中心 | 多くのストアドプロシージャ |
| **Domain Model** | ドメインをオブジェクトのネットワークとしてモデリング | 複雑なビジネスルール | DDD（ドメイン駆動設計） |
| **Table Module** | テーブルごとに一つのクラスにロジックを集約 | 中程度の複雑さ、DataSet等と連携 | .NET DataSet |
| **Service Layer** | ドメインロジックの前にサービス層を配置し、アプリケーションの境界を定義 | 複数のクライアントから呼ばれるロジック | Spring Service |

**選択判断フロー:**
1. ビジネスロジックが単純（CRUD中心） → Transaction Script
2. 中程度の複雑さ + DataSetスタイルの開発 → Table Module
3. 複雑なビジネスルール → Domain Model + Service Layer

### Category 2: データソースアーキテクチャパターン

ドメインオブジェクトとデータベースの間のマッピング戦略。

| パターン | 概要 | 特徴 | 代表的な実装例 |
|---------|------|------|-------------|
| **Table Data Gateway** | テーブルへのアクセスを単一クラスに集約 | SQLの隠蔽、ドメインとの分離が弱い | DAO（Data Access Object） |
| **Row Data Gateway** | テーブルの1行をオブジェクトとして表現（振る舞いなし） | データアクセスのカプセル化 | 単純なデータ転送 |
| **Active Record** | テーブルの1行をオブジェクトとして表現（振る舞いあり） | シンプル、ドメインとDBが密結合 | Ruby on Rails ActiveRecord |
| **Data Mapper** | ドメインオブジェクトとDBを完全に分離し、マッパー層で変換 | ドメインの純粋性、複雑さのコスト | Hibernate、Doctrine |

**選択判断フロー:**
1. ドメインロジックがほぼなし → Table Data Gateway / Row Data Gateway
2. ドメインロジックが中程度 + スキーマとモデルが1:1対応 → Active Record
3. ドメインロジックが複雑 + スキーマとモデルが乖離 → Data Mapper

### Category 3: O/R行動パターン

オブジェクトとデータベースの同期における振る舞いを管理する。

| パターン | 概要 | 解決する問題 |
|---------|------|------------|
| **Unit of Work** | トランザクション内の変更を追跡し一括コミット | 「何が変更されたか」の管理 |
| **Identity Map** | 同一レコードに対する重複オブジェクト生成を防止 | メモリ内整合性、不要なDB問い合わせ |
| **Lazy Load** | 必要になるまで関連オブジェクトの読み込みを遅延 | パフォーマンス最適化 |

**現代の実装対応:**
- JPA EntityManager = Unit of Work + Identity Map
- Entity Framework DbContext = Unit of Work + Identity Map
- Hibernateの遅延フェッチ = Lazy Load

### Category 4: O/R構造パターン

オブジェクトモデルとリレーショナルスキーマの構造的差異を橋渡しする。

| パターン | 概要 |
|---------|------|
| **Identity Field** | オブジェクトにDBの主キーを保持する |
| **Foreign Key Mapping** | オブジェクト間の参照をDBの外部キーにマッピング |
| **Association Table Mapping** | 多対多の関連を中間テーブルで表現 |
| **Single Table Inheritance** | 継承階層を単一テーブルに格納 |
| **Class Table Inheritance** | 継承階層のクラスごとにテーブルを作成 |
| **Concrete Table Inheritance** | 具象クラスごとにテーブルを作成 |
| **Embedded Value** | 値オブジェクトを所有者のテーブルに埋め込む |
| **Serialized LOB** | オブジェクトグラフをシリアライズしてBLOBに格納 |

### Category 5: Webプレゼンテーションパターン

WebアプリケーションのUI層の設計パターン。

| パターン | 概要 | 適用場面 |
|---------|------|---------|
| **MVC (Model View Controller)** | 入力→処理→出力を分離 | ほぼすべてのWebフレームワーク |
| **Page Controller** | URLごとにコントローラを配置 | シンプルなWebアプリ |
| **Front Controller** | 単一のエントリーポイントですべてのリクエストを受け付け | 複雑なルーティング |
| **Template View** | HTMLテンプレートに動的データを埋め込み | JSP、ERB、Blade等 |
| **Transform View** | データをXSLT等で変換して出力 | XML/JSON変換 |
| **Application Controller** | 画面遷移ロジックを集約 | ウィザード形式の画面フロー |

### Category 6: 分散パターン

分散システムにおけるリモート呼び出しの設計。

| パターン | 概要 | 原則 |
|---------|------|------|
| **Remote Facade** | 粗粒度のリモートインタフェースを提供 | リモート呼び出しは回数を減らす |
| **Data Transfer Object (DTO)** | リモート呼び出しで転送するデータを一つのオブジェクトにまとめる | ネットワークラウンドトリップの削減 |

**Fowlerの第一法則**: 「オブジェクトを分散させるな（Don't distribute your objects）」

### Category 7: オフライン並行性パターン

複数のビジネストランザクションが同一データにアクセスする際の制御。

| パターン | 概要 | トレードオフ |
|---------|------|------------|
| **Optimistic Offline Lock** | コミット時に競合を検出 | 高い並行性、競合時にロールバック |
| **Pessimistic Offline Lock** | 編集開始時にロックを取得 | 競合防止、並行性低下 |
| **Coarse-Grained Lock** | 関連オブジェクト群をまとめてロック | ロック管理の簡素化 |
| **Implicit Lock** | フレームワークが自動的にロック管理 | 開発者負担の軽減 |

### Category 8: セッション状態パターン

| パターン | 概要 | トレードオフ |
|---------|------|------------|
| **Client Session State** | セッション状態をクライアント側に保持 | サーバ負荷軽減、改ざんリスク |
| **Server Session State** | セッション状態をサーバメモリに保持 | シンプル、スケーラビリティ課題 |
| **Database Session State** | セッション状態をDBに保持 | スケーラブル、DB負荷 |

### Category 9: 基盤パターン

層をまたいで利用される汎用パターン。

| パターン | 概要 |
|---------|------|
| **Gateway** | 外部システムへのアクセスをカプセル化 |
| **Mapper** | 二つの独立したオブジェクト間の通信を仲介 |
| **Layer Supertype** | 各層の共通機能を基底クラスに集約 |
| **Separated Interface** | インタフェースと実装を異なるパッケージに配置 |
| **Registry** | よく知られたオブジェクトを検索するためのグローバルオブジェクト |
| **Value Object** | 同値性で等価判定される不変オブジェクト |
| **Plugin** | コンパイル時ではなく実行時にクラスをリンク |
| **Service Stub** | テスト時に外部依存を置換 |
| **Record Set** | テーブル形式のデータのメモリ内表現 |

## パターン選択の実践ガイド

### シナリオ別推奨パターン組み合わせ

**シンプルなCRUDアプリケーション:**
- Transaction Script + Table Data Gateway + Page Controller + Template View

**中規模の業務アプリケーション:**
- Domain Model + Active Record + Front Controller + Template View + Service Layer

**複雑なエンタープライズアプリケーション:**
- Domain Model + Data Mapper + Unit of Work + Identity Map + Repository + Service Layer + Front Controller

**分散システム:**
- 上記 + Remote Facade + DTO + Optimistic Offline Lock

### 現代のパターンとの対応

| PoEAAパターン | 現代の発展形 |
|-------------|------------|
| Service Layer + Repository | CQRS（Command Query Responsibility Segregation） |
| Unit of Work（変更追跡） | イベントソーシング（Event Sourcing） |
| Repository | DDDのRepository |
| Data Mapper | DDDのAnti-Corruption Layer |
| Remote Facade + DTO | API Gateway + GraphQL |

## 注意点

- 本書のパターンは2002年時点のRDBMS中心のアーキテクチャを前提としている
- NoSQL、マイクロサービス、イベント駆動アーキテクチャへの適用には読者自身の応用が必要
- 個々のパターンの理解だけでなく、パターン間の組み合わせと整合性が重要
- パターンは「処方箋」ではなく「選択肢の地図」として利用すべきである
