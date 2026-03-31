# -*- coding: utf-8 -*-
"""Parse source.txt and emit kpi_mece_master.md (MECE index of all 100 KPIs)."""
import re
from pathlib import Path

path = Path(__file__).with_name("source.txt")
lines = path.read_text(encoding="utf-8").splitlines()

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip())


def _is_digit_anchor(i: int) -> bool:
    ln = lines[i].strip()
    if not re.fullmatch(r"0\d{2}|100", ln):
        return False
    n = int(ln)
    if n < 1 or n > 100:
        return False
    prev_nonempty = []
    for j in range(max(0, i - 10), i):
        t = lines[j].strip()
        if t:
            prev_nonempty.append(t)
    recent = prev_nonempty[-8:]
    for t in recent:
        if t in (
            "MARKETING",
            "SALES",
            "WEB MARKETING",
            "FINANCE",
            "E OPERATION",
            "WORDS",
            "ΚΡΙ",
            "ACCOUNTI",
        ):
            return True
        if t.startswith("画"):
            return True
        if "マーケティング・セールスのKPI" in t or "会計・ファイナンスのKPI" in t:
            return True
        if "オペレーション・イノベーション" in t:
            return True
        if re.match(r"^WORDS\s+\d", t):
            return True
    for j in range(i + 1, min(i + 8, len(lines))):
        t = lines[j].strip()
        if not t:
            continue
        if t in ("MARKETING", "SALES", "WEB MARKETING", "FINANCE", "E OPERATION"):
            return True
        if t.startswith("E OPERATION"):
            return True
        break
    return False


def find_starts():
    candidates = {}  # n -> min line index
    for i, ln in enumerate(lines):
        if i < 1600:
            continue
        raw = ln.strip()
        if re.fullmatch(r"0\d{2}|100", raw or "") and _is_digit_anchor(i):
            n = int(raw)
            candidates[n] = min(i, candidates.get(n, 10**9))
        m = re.search(r"WORDS\s+(0\d{2}|100)\b", raw)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 100:
                candidates[n] = min(i, candidates.get(n, 10**9))
    return {n: (idx, "auto") for n, idx in sorted(candidates.items())}


def block_end(start_i: int, all_starts_sorted: list) -> int:
    for si in all_starts_sorted:
        if si > start_i:
            return si
    return len(lines)


def split_title_from_words_first_line(line: str) -> tuple[str, str]:
    m = re.match(r"^WORDS\s+\d{1,3}\s+(.+)$", line.strip())
    if m:
        rest = m.group(1).strip()
        parts = rest.split(None, 1)
        if parts[0] in ("WEB", "MARKETING", "SALES", "FINANCE") and len(parts) > 1:
            return parts[1].split(" ", 1)[-1] if "MARKETING" in rest else rest, ""
        return rest, ""
    return "", ""


def extract_fields(block: list[str]) -> dict:
    text = "\n".join(block)
    title = ""
    definition = ""
    formula = ""
    stakeholders = ""
    related = ""

    first = block[0].strip() if block else ""
    if first.startswith("WORDS ") and re.search(r"WORDS\s+\d+", first):
        tit_guess, _ = split_title_from_words_first_line(first)
        if tit_guess and not tit_guess.startswith("WEB"):
            title = tit_guess
        elif "WEB MARKETING" in first:
            mwm = re.search(r"WEB MARKETING\s+(.+)$", first)
            if mwm:
                title = mwm.group(1).strip()[:120]

    i = 0
    while i < len(block):
        ln = block[i].strip()
        if not ln or ln == "KPI" or ln.startswith("CHAPTER"):
            i += 1
            continue
        if ln.startswith("WORDS ") and re.match(r"WORDS\s+\d", ln):
            i += 1
            continue
        if ln in (
            "MARKETING",
            "SALES",
            "WEB MARKETING",
            "FINANCE",
            "E OPERATION",
            "INNOVATION",
            "OPERATION",
            "ACCOUNTI",
            "WORDS",
            "ΚΡΙ",
        ):
            i += 1
            continue
        if "マーケティング・セールスのKPI" in ln or "オペレーション" in ln[:20]:
            i += 1
            continue
        if re.fullmatch(r"0\d{2}|100", ln):
            i += 1
            continue
        if ln.startswith("設定例"):
            break
        if not title:
            title = ln[:120]
            i += 1
            while i < len(block) and not block[i].strip():
                i += 1
            if i < len(block):
                definition = block[i].strip()[:500]
        else:
            definition = ln[:500]
        break

    if m := re.search(
        r"数値の取り方/計算式\s*\n?([^\n]+?)(?=\n\s*主な対象者|\n\s*設定例|\n\s*O\s*$|\n\s*PART2|\Z)",
        text,
    ):
        formula = norm(m.group(1))[:800]
    if not formula and (
        m2 := re.search(r"数値の取り方/計算式\s+(.+)$", text, re.MULTILINE)
    ):
        formula = norm(m2.group(1))[:800]
    if m := re.search(
        r"主な対象者\s*\n([\s\S]+?)(?=\n\s*PART2|\n\s*概\s*要|\n\s*KPIの見方|\Z)",
        text,
    ):
        stakeholders = norm(m.group(1))[:500]
    if m := re.search(r"関連\s*KPI\s*\n([\s\S]+?)(?=\n\s*CHAPTER|\Z)", text):
        chunk = m.group(1).strip()
        lines_after = []
        for raw in chunk.splitlines():
            s = raw.strip()
            if not s or re.fullmatch(r"\d+", s):
                continue
            if s.startswith("PART2") or "基本KPI" in s:
                continue
            lines_after.append(s)
        for s in reversed(lines_after):
            if len(s) <= 120 and "、" in s:
                related = norm(s)[:400]
                break
        if not related and lines_after:
            tail = lines_after[-1]
            if len(tail) <= 160:
                related = norm(tail)[:400]

    return {
        "title": title[:120],
        "definition": definition[:500],
        "formula": formula,
        "stakeholders": stakeholders,
        "related": related,
    }


def chapter_for(n: int) -> str:
    if 1 <= n <= 35:
        return "CH3 マーケ・セールス"
    if 36 <= n <= 54:
        return "CH4 オペレーション・イノベーション"
    if 55 <= n <= 72:
        return "CH5 組織"
    return "CH6 会計・ファイナンス"


def main():
    best = find_starts()
    missing = [n for n in range(1, 101) if n not in best]
    if missing:
        raise SystemExit(f"Still missing KPI numbers: {missing}")

    sorted_starts = sorted(idx for idx, _ in best.values())

    rows = []
    for n in range(1, 101):
        start_i, kind = best[n]
        end_i = block_end(start_i, sorted_starts)
        block = lines[start_i:end_i]
        f = extract_fields(block)
        rows.append(
            {
                "no": n,
                "chapter": chapter_for(n),
                **f,
            }
        )

    out = []
    out.append("# KPI大全 MECEマスター（100指標・全件インデックス）")
    out.append("")
    out.append("> ソース: 同一フォルダの `source.txt`（嶋田毅『KPI大全』スキャン）を機械解析。**OCR欠落は `WORDS 番号` 行などで補完。** 本文の数式・図は紙書を正とする。")
    out.append("")
    out.append("## MECEの切り口")
    out.append("")
    out.append("| レイヤ | 内容 | 排他性 | 完備性 |")
    out.append("|--------|------|--------|--------|")
    out.append("| L0 本書構成 | PART1 概要 / PART2 基本KPI100 | PART1は概念・事例、PART2は指標辞典 | 100件はすべてPART2に属する |")
    out.append("| L1 章 | CH3〜CH6の4ドメイン | ドメインは相互排他 | 001〜100を4章に完全分割 |")
    out.append("| L2 指標番号 | 001〜100 | 各番号は一意 | 欠番なし（本表で100行） |")
    out.append("")
    out.append("### 章 ↔ 番号レンジ対応（完備）")
    out.append("")
    out.append("| 章 | 番号レンジ | 件数 |")
    out.append("|----|------------|------|")
    out.append("| CH3 マーケティング・セールス | 001〜035 | 35 |")
    out.append("| CH4 オペレーション・イノベーション | 036〜054 | 19 |")
    out.append("| CH5 組織のKPI | 055〜072 | 18 |")
    out.append("| CH6 会計・ファイナンス | 073〜100 | 28 |")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 100指標一覧表（参照の主索引）")
    out.append("")
    out.append("| No | ドメイン | 指標名（本書） | 定義（先頭文・要約） | 計算・入手（抽出） | 主な対象者（抽出） | 関連KPI（抽出） |")
    out.append("|----|----------|----------------|----------------------|-------------------|---------------------|----------------|")
    for r in rows:
        d = r["definition"].replace("|", "\\|")
        f = r["formula"].replace("|", "\\|")
        s = r["stakeholders"].replace("|", "\\|")
        rel = r["related"].replace("|", "\\|")
        tit = r["title"].replace("|", "\\|")
        out.append(
            f"| {r['no']:03d} | {r['chapter']} | {tit} | {d} | {f} | {s} | {rel} |"
        )
    out.append("")
    out.append("---")
    out.append("")
    out.append("## PART1 概念整理（CH1・CH2・用語解説の位置づけ）")
    out.append("")
    out.append("以下はPART2以外の**論点マップ**（指標番号なし）。詳文は `source.txt` 該当チャンク参照。")
    out.append("")
    out.append("### CHAPTER1 KPIとは何か")
    out.append("- **定義**: 目標達成度合いを確認する指標。財務以外（顧客満足・不良品率等）も含む。")
    out.append("- **戦略連動**: 戦略変更に応じ重視KPIが変わる（例: 粗利重視へシフト時は利益・CS関連が前面）。")
    out.append("- **BSC接続**: 財務／顧客／内部プロセス／学習成長の多視点と戦略マップ（因果）。")
    out.append("- **分解**: 足し算・掛け算型、ファネル細分化で粒度向上。")
    out.append("- **測定**: 誤った数字→誤った意思決定。定義とデータソースの明確化。")
    out.append("- **限界**: KPIは多くは手段。理念・ビジョンとバランス。評価報酬の単一紐づけは脆い。")
    out.append("- **ゲーミング**: 売上単独偏重→取りやすい商材・既存偏重など副作用（他KPIとのバランス）。")
    out.append("")
    out.append("### CHAPTER2 実例ストーリー")
    out.append("- **CASE1 A光学工業**: 営業プロセス可視化、リード→コンバージョン、ファネルKPI。")
    out.append("- **CASE2 コクーン**: 新規事業のマーケ・プロダクト・プロセスKPI設計。")
    out.append("")
    out.append("### 各章末「用語解説」")
    out.append("- CH3〜CH6の `[*]` 用語は章末に集約。本マスターの表の「関連KPI」とあわせて参照。")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## スキャン修正メモ（TOCと実ページの差異）")
    out.append("")
    out.append("| 項目 | 補正内容 |")
    out.append("|------|----------|")
    out.append("| 015 | OCR乱れ → 本文は **SQL数**（MQL後の営業管轄リード） |")
    out.append("| 016 | TOCのREP → 本文は **RFP数** |")
    out.append("| 022 | 目次欠落 → **LTV（顧客生涯価値）** |")
    out.append("| 029,033 | 見出し行が `WORDS 029` 形式で開始 |")
    out.append("| 067 | **1人当たりの人材開発投資** |")
    out.append("| 087 | **製造原価**（率／個あたり等は本文） |")
    out.append("| 089〜096 | 089=FCF, 090=WACC, 091=NPV, 092=ROIC, 093=EVA, 094=実効税率, 095=株価, 096=売上高成長率（目次の並び乱れを本文で確定） |")
    out.append("")

    Path(__file__).with_name("kpi_mece_master.md").write_text(
        "\n".join(out), encoding="utf-8"
    )
    print("Wrote kpi_mece_master.md, KPI count", len(rows))


if __name__ == "__main__":
    main()
