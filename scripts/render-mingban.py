"""把影印本 PDF 逐页渲染成 JPEG，供 /library/mingban 的图片阅读器按页翻阅。

扫描件没有文字层，浏览器内嵌 PDF 又会被加密/插件干扰，
所以改成「每页一张图」——任何浏览器都能翻，打包离线也不会坏。
"""

import os
import sys

import pymupdf

SRC = sys.argv[1] if len(sys.argv) > 1 else "public/books/ziwei-quanshu-mingban-jinzhu.pdf"
OUT = "public/books/mingban"

os.makedirs(OUT, exist_ok=True)

doc = pymupdf.open(SRC)
# 目标宽度约 1240px：字够清楚，单页体积也能压在 ~150KB
zoom = 1240 / doc[0].rect.width
matrix = pymupdf.Matrix(zoom, zoom)

count = 0
for i, page in enumerate(doc, start=1):
    path = os.path.join(OUT, f"p{i:03d}.jpg")
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    pix.save(path, jpg_quality=55)
    count += 1

size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f"pages={count} total={size/1024/1024:.1f}MB out={OUT}")
