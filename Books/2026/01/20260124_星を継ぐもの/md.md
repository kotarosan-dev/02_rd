# 『星を継ぐもの』物語構造分析

## 1. プロット構造（Save the Cat 15ビート風）

```mermaid
flowchart TD
    subgraph ACT1["第1幕: セットアップ (25%)"]
        A1[🌙 オープニング・イメージ<br>月面調査隊の日常]
        A2[💀 きっかけ<br>真紅の宇宙服の死体発見]
        A3[❓ テーマの提示<br>「人類とは何か」]
        A4[🔬 セットアップ<br>死体は5万年前に死亡<br>しかし生物学的には現代人]
        A5[🤔 悩みのとき<br>既存の科学では説明不可能]
    end
    
    subgraph TP1["第1ターニングポイント"]
        B1[📞 ハント博士招集<br>トライマグニスコープが鍵に]
    end
    
    subgraph ACT2["第2幕: 対立と探求 (50%)"]
        C1[👥 サブプロット開始<br>ダンチェッカー、マドスン参加]
        C2[🔍 お楽しみ<br>各専門家の推理合戦]
        C3[📊 ミッドポイント<br>「チャーリー」の文書解読進展]
        C4[⚠️ 迫り来る悪い奴ら<br>一つ解決すると何倍もの新たな謎]
        C5[😰 すべてを失って<br>従来の人類史では説明不能]
    end
    
    subgraph TP2["第2ターニングポイント"]
        D1[💡 心の暗闘<br>常識を疑う勇気]
    end
    
    subgraph ACT3["第3幕: 解決 (25%)"]
        E1[🎯 フィナーレ<br>人類の起源に関する<br>驚愕の真実が明らかに]
        E2[🌟 ファイナル・イメージ<br>人類史の書き換え]
    end
    
    A1 --> A2 --> A3 --> A4 --> A5 --> B1
    B1 --> C1 --> C2 --> C3 --> C4 --> C5 --> D1
    D1 --> E1 --> E2
    
    style A2 fill:#ff6b6b,color:#fff
    style B1 fill:#4ecdc4,color:#fff
    style C3 fill:#ffe66d,color:#333
    style D1 fill:#4ecdc4,color:#fff
    style E1 fill:#95e1d3,color:#333
```

---

## 2. 登場人物関係図（グレマスのアクタンモデル）

```mermaid
flowchart TB
    subgraph AXIS1["伝達の軸"]
        SENDER[📜 送り手<br>月面での死体発見<br>という事実]
        RECEIVER[🌍 受け手<br>人類全体<br>新たな起源の理解]
    end
    
    subgraph AXIS2["欲望の軸"]
        SUBJECT[🔬 主体<br>ヴィクター・ハント博士<br>原子物理学者]
        OBJECT[🎯 対象<br>「チャーリー」の謎<br>5万年前の真実]
    end
    
    subgraph AXIS3["力の軸"]
        HELPER[🤝 援助者<br>ダンチェッカー（生物学）<br>マドスン（言語学）<br>トライマグニスコープ]
        OPPONENT[⚔️ 敵対者<br>既存の常識・定説<br>科学的矛盾]
    end
    
    SENDER -.->|動機を与える| OBJECT
    OBJECT -.->|恩恵| RECEIVER
    SUBJECT -->|欲望| OBJECT
    HELPER -->|支援| SUBJECT
    OPPONENT -->|妨害| SUBJECT
    
    style SUBJECT fill:#4ecdc4,color:#fff
    style OBJECT fill:#ff6b6b,color:#fff
    style HELPER fill:#95e1d3,color:#333
    style OPPONENT fill:#ff8a5c,color:#fff
```

---

## 3. 科学的推理のシーケンス（専門家の協働プロセス）

```mermaid
sequenceDiagram
    participant 月面 as 🌙 月面調査隊
    participant ハント as 🔬 ハント博士<br>(物理学)
    participant ダン as 🧬 ダンチェッカー<br>(生物学)
    participant マド as 📜 マドスン<br>(言語学)
    participant 真実 as 💡 真実
    
    月面->>ハント: 死体発見の報告
    Note over 月面,ハント: 5万年前の死体<br>しかし現代人型
    
    ハント->>ハント: トライマグニスコープで<br>観測データ分析
    
    ハント->>ダン: 生物学的見解を求める
    ダン->>ダン: 解剖学的特徴を分析
    ダン-->>ハント: 遺伝的には人類と同一
    
    Note over ハント,ダン: 矛盾：なぜ5万年前に<br>月面に現代人が？
    
    ハント->>マド: 文書の解読依頼
    マド->>マド: 「チャーリー」の<br>文書を解析
    マド-->>ハント: 部分的解読成功
    
    loop 仮説と検証の繰り返し
        ハント->>ダン: 新仮説の提示
        ダン-->>ハント: 検証・反論
        ハント->>マド: 追加情報の依頼
        マド-->>ハント: 新たな発見
    end
    
    Note over ハント,マド: 一つ解決すると<br>何倍もの新たな疑問
    
    ハント->>真実: 学際的統合
    ダン->>真実: 生物学的裏付け
    マド->>真実: 言語学的証拠
    
    真実-->>月面: 人類の起源に関する<br>驚愕の事実
```

---

## 4. 謎の階層構造（バルトの謎のコード風）

```mermaid
flowchart LR
    subgraph MYSTERY1["第1層の謎"]
        M1A[❓ 死体は誰か？]
        M1B[🔍 調査: どの基地にも所属なし]
        M1C[💀 発見: 世界のいかなる人間でもない]
    end
    
    subgraph MYSTERY2["第2層の謎"]
        M2A[❓ なぜ5万年前に死亡？]
        M2B[🔍 調査: 科学的年代測定]
        M2C[🧬 発見: しかし生物学的には現代人]
    end
    
    subgraph MYSTERY3["第3層の謎"]
        M3A[❓ なぜ月面にいた？]
        M3B[🔍 調査: 文書解読・技術分析]
        M3C[📜 発見: 高度な宇宙技術の痕跡]
    end
    
    subgraph MYSTERY4["最深層の謎"]
        M4A[❓ 人類の起源とは？]
        M4B[🔍 調査: 全証拠の統合]
        M4C[🌟 発見: 驚愕の真実]
    end
    
    M1A --> M1B --> M1C
    M1C -.->|新たな疑問| M2A
    M2A --> M2B --> M2C
    M2C -.->|新たな疑問| M3A
    M3A --> M3B --> M3C
    M3C -.->|新たな疑問| M4A
    M4A --> M4B --> M4C
    
    style M1C fill:#ffcccb
    style M2C fill:#ffcccb
    style M3C fill:#ffcccb
    style M4C fill:#90EE90
```

---

## 5. キャラクターの機能分類（プロップ風）

```mermaid
flowchart TB
    subgraph HEROES["主人公群"]
        H1[🔬 ハント博士<br>探求者・統合者]
        H2[🧬 ダンチェッカー<br>検証者・懐疑者]
        H3[📜 マドスン<br>解読者・翻訳者]
    end
    
    subgraph HELPERS["援助者"]
        A1[🔭 トライマグニスコープ<br>魔法の道具]
        A2[📄 チャーリーの文書<br>手がかり]
    end
    
    subgraph OBJECT["対象"]
        O1[💀 チャーリー<br>謎そのものの具現化]
    end
    
    subgraph OBSTACLE["障害"]
        X1[📚 既存の科学常識<br>敵対者なき敵]
        X2[🤯 矛盾する証拠<br>試練]
    end
    
    H1 <-->|協力| H2
    H1 <-->|協力| H3
    H2 <-->|対立と統合| H3
    
    A1 -->|支援| H1
    A2 -->|情報提供| H3
    
    O1 -->|謎を提示| H1
    O1 -->|謎を提示| H2
    O1 -->|謎を提示| H3
    
    X1 -.->|妨害| H1
    X2 -.->|妨害| H2
    
    style H1 fill:#4ecdc4,color:#fff
    style O1 fill:#ff6b6b,color:#fff
    style X1 fill:#ffa07a
```

---

## 6. 物語の感情曲線（Story Grid風）

```mermaid
xychart-beta
    title "『星を継ぐもの』感情・緊張の推移"
    x-axis ["発見", "招集", "チーム結成", "初期分析", "矛盾発覚", "文書解読", "新仮説", "検証失敗", "再考", "統合", "真実判明"]
    y-axis "緊張度" 0 --> 100
    line [30, 50, 45, 60, 80, 70, 75, 90, 85, 95, 100]
```

---

## 7. テーマの構造（二項対立）

```mermaid
flowchart LR
    subgraph THEME["テーマの二項対立"]
        T1[既知] <-->|対立| T2[未知]
        T3[常識] <-->|対立| T4[真実]
        T5[個人の知] <-->|統合| T6[集合知]
        T7[過去] <-->|接続| T8[現在]
    end
    
    subgraph RESOLUTION["解決"]
        R1[科学的謙虚さ<br>＋<br>大胆な想像力]
    end
    
    T1 & T2 --> R1
    T3 & T4 --> R1
    T5 & T6 --> R1
    T7 & T8 --> R1
    
    style R1 fill:#95e1d3,color:#333
```

---

## 分析まとめ

| フレームワーク | 『星を継ぐもの』での適用 | 可視化の効果 |
|--------------|----------------------|-------------|
| Save the Cat 15ビート | ミステリ型プロットの構造把握 | 物語の転換点が明確に |
| グレマスのアクタンモデル | 「敵」が概念（常識）である特殊性 | 力学構造の理解 |
| シーケンス図 | 学際的協働プロセスの可視化 | 知の統合過程が見える |
| バルトの謎のコード | 謎の入れ子構造 | 読者の興味維持の仕組み |
| プロップの機能分類 | 人物の「役割」としての機能 | キャラクターの必然性 |
| 感情曲線 | 知的興奮の波 | ペーシングの分析 |

### 本作の構造的特徴

1. **敵対者なき物語**: 通常のアクタンモデルでは「敵対者」は人物だが、本作では「既存の常識」という概念が敵
2. **集合主人公**: ハント一人ではなく、専門家チーム全体が主人公機能を分担
3. **逆向きのミステリ**: 「これから何が起こるか」ではなく「過去に何が起きたか」を追う
4. **階層的謎構造**: 一つ解くと新たな謎が生まれる入れ子構造がページターナー効果を生む