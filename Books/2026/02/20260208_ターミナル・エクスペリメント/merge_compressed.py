# -*- coding: utf-8 -*-
"""結合して compressed-reading.md を生成し、文字数を表示する。"""
from pathlib import Path

here = Path(__file__).resolve().parent
parts = [
    here / "cr_head.md",
    here / "cr_p1.md",
    here / "cr_p2.md",
    here / "cr_p3.md",
    here / "cr_p4.md",
    here / "cr_p5.md",
    here / "cr_p6.md",
    here / "cr_p7.md",
    here / "cr_p8.md",
    here / "cr_p9.md",
    here / "cr_p10.md",
    here / "cr_p11.md",
    here / "cr_p12.md",
    here / "cr_p13.md",
    here / "cr_p14.md",
    here / "cr_p15.md",
]
out = here / "compressed-reading.md"
texts = []
for p in parts:
    if not p.exists():
        raise SystemExit(f"missing: {p}")
    texts.append(p.read_text(encoding="utf-8").strip())
merged = "\n\n---\n\n".join(texts) + "\n"
out.write_text(merged, encoding="utf-8")
n = len(merged)
print("chars:", n)
print("ratio vs source.txt ~437633:", round(n / 437633, 4))
