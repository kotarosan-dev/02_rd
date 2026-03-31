# -*- coding: utf-8 -*-
from pathlib import Path
base = Path(__file__).resolve().parent
cr = (base / "compressed-reading.md").read_text(encoding="utf-8")
sm = (base / "structure-map.md").read_text(encoding="utf-8")
src = (base / "source.txt").read_text(encoding="utf-8")
orig = len(src)
comp = len(cr)
smap = len(sm)
total = comp + smap
lines = cr.count("\n") + (1 if cr and not cr.endswith("\n") else 0)
print("compressed_lines", lines)
print("compressed_chars", comp)
print("structure_map_chars", smap)
print("total_output_chars", total)
print("original_chars", orig)
print("ratio_compressed", round(comp / orig, 6))
print("ratio_total", round(total / orig, 6))
print("required_min_E", max(int(orig * 0.02), 8000))
print("pass_total_vs_required", total >= max(int(orig * 0.02), 8000))
print("pass_10k_compressed", comp >= 10000)
print("pass_300_lines", lines >= 300)
