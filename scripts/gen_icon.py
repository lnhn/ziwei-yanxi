"""
生成桌面版图标 —— 朱红印章底 + 宋体「紫」字，与侧栏 Logo 同一套语言。

产出（src-tauri/icons/）：
  32x32.png / 128x128.png / 128x128@2x.png（256）/ icon.png（512）/ icon.ico（多尺寸）
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "src-tauri" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

SEAL = (166, 67, 43)      # #A6432B 朱砂
PAPER = (250, 244, 232)   # #FAF4E8

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\simsun.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def pick_font(size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make(size: int) -> Image.Image:
    # 先 4 倍画再缩，边缘才不会毛
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.18)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=SEAL)

    font = pick_font(int(s * 0.62))
    ch = "紫"
    bbox = d.textbbox((0, 0), ch, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((s - w) / 2 - bbox[0], (s - h) / 2 - bbox[1]), ch, font=font, fill=PAPER)

    return img.resize((size, size), Image.LANCZOS)


sizes = {
    "32x32.png": 32,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
}

for name, px in sizes.items():
    make(px).save(OUT / name)
    print("wrote", name, px)

ico_sizes = [16, 24, 32, 48, 64, 128, 256]
frames = [make(s) for s in ico_sizes]
frames[-1].save(OUT / "icon.ico", format="ICO", sizes=[(s, s) for s in ico_sizes])
print("wrote icon.ico", ico_sizes)
