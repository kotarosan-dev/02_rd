# -*- coding: utf-8 -*-
"""Second batch of excerpts (different phase) into cr_p13.md."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = HERE / "source.txt"
out = HERE / "cr_p13.md"
text = src.read_text(encoding="utf-8")
chunks = [p.strip().replace("\n", " ") for p in text.split("\n\n") if len(p.strip()) > 180]
# 先頭バッチとずらす
chunks = chunks[len(chunks) // 10 :]
step = max(1, len(chunks) // 40)
selected = chunks[::step][:40]
lines = ["\n\n---\n\n## 原著断片集B（別区間サンプル）\n"]
for i, s in enumerate(selected, 1):
    excerpt = s[:650] + ("…" if len(s) > 650 else "")
    lines.append(f"\n### 断片B-{i}\n\n> {excerpt}\n")
block = "".join(lines)
old = out.read_text(encoding="utf-8").rstrip()
out.write_text(old + block + "\n", encoding="utf-8")
print("b excerpts:", len(selected), "chars:", len(block))
