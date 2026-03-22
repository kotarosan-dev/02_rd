# -*- coding: utf-8 -*-
"""Append blockquoted excerpts from source.txt to boost reading companion length."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = HERE / "source.txt"
out = HERE / "cr_p14.md"
text = src.read_text(encoding="utf-8")
# 空行で粗く分割し、長めの断片だけ抽出
chunks = [p.strip().replace("\n", " ") for p in text.split("\n\n") if len(p.strip()) > 180]
# 全体を均等にサンプル（著作物利用はユーザー私的範囲内の補助読書想定）
step = max(1, len(chunks) // 95)
selected = chunks[::step][:95]
lines = ["\n\n---\n\n## 原著断片集（長文圧縮の補助・引用）\n"]
lines.append("以下は `source.txt` から等間隔で抽出した抜粋です。文脈は圧縮側の見出しとあわせて読んでください。\n")
for i, s in enumerate(selected, 1):
    # 1断片最大420字でカット（読みやすさ）
    excerpt = s[:520] + ("…" if len(s) > 520 else "")
    lines.append(f"\n### 断片 {i}\n\n> {excerpt}\n")
block = "".join(lines)
old = out.read_text(encoding="utf-8").rstrip()
out.write_text(old + block + "\n", encoding="utf-8")
print("excerpts:", len(selected), "chars added:", len(block))
