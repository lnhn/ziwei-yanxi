"""把《倪海厦·天纪》紫微斗数听课笔记 PDF 抽成结构化讲义数据。

用法：
    python scripts/import-tianji.py "D:\\Downloads\\紫微斗数案例资料 ....pdf"

产物：lib/lectures/tianji.ts（页面直接 import，不再依赖 PDF）
口径：
    - 按每页首行的「天纪第N集」标题切分成集；
    - 每页按 PyMuPDF 的 block 分段落，段内换行合并（中文无需空格，ASCII 之间补空格）；
    - 命例实批的段落里，凡以「民国 N 年」开头者记为一条案例，抽出 年/性别/五行局/紫微位/命宫；
    - 原文一字不改，只做排版级清理（去页眉、压空白、并换行）。
"""

import json
import re
import sys
from pathlib import Path

import pymupdf

HEADER_RE = re.compile(r"天纪第\s*(\d+)\s*集\s*[-—]+\s*(紫微斗数\s*\d+)\s*(.*)")
CASE_RE = re.compile(r"民国\s*(\d+)\s*年[^。]{0,12}?(阳男|阴男|阳女|阴女)")
JUE_RE = re.compile(r"([金木水火土]+\s*[二三四五六]?局)")
ZIWEI_RE = re.compile(r"紫[微薇]在([子丑寅卯辰巳午未申酉戌亥])")
MING_RE = re.compile(r"命宫在([子丑寅卯辰巳午未申酉戌亥])")

ROOT = Path(__file__).resolve().parent.parent


def join_block(text: str) -> str:
    """段内换行合并：中文直接相连，ASCII 两侧补一个空格。"""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    out = ""
    for line in lines:
        if not out:
            out = line
            continue
        a, b = out[-1], line[0]
        if a.isascii() and a.isalnum() and b.isascii() and b.isalnum():
            out += " " + line
        else:
            out += line
    return re.sub(r"[ \t]{2,}", " ", out).strip()


def clean_para(p: str) -> str:
    p = p.replace("\u3000", " ").strip()
    p = re.sub(r"^[·•\-*\s]+", "", p).strip()
    return p


def parse_pdf(path: str):
    doc = pymupdf.open(path)
    lectures = []
    cur = None
    for pno in range(doc.page_count):
        blocks = [b for b in doc[pno].get_text("blocks", sort=True) if b[4].strip()]
        if not blocks:
            continue
        head_txt = blocks[0][4].replace("\n", " ")
        m = HEADER_RE.search(head_txt)
        if m:
            if cur is not None:
                lectures.append(cur)
            no = int(m.group(1))
            sub = re.sub(r"\s+", "", m.group(2))
            name = clean_para(m.group(3))
            cur = {
                "no": no,
                "name": name,
                "subtitle": sub,
                "pages": [pno + 1, pno + 1],
                "paragraphs": [],
                "cases": [],
            }
            # 有的集在标题块里还带正文，取标题之后的部分
            rest = HEADER_RE.sub("", head_txt).strip()
            rest = rest.replace(name, "", 1).strip() if name else rest
            if rest:
                paras = [clean_para(rest)]
                cur["paragraphs"].extend([x for x in paras if x])
            blocks = blocks[1:]
        if cur is None:
            continue
        cur["pages"][1] = pno + 1
        for b in blocks:
            para = clean_para(join_block(b[4]))
            if len(para) < 2:
                continue
            if re.fullmatch(r"[一二三四五六七八九十百0-9]{1,4}", para):
                continue  # 页码
            cur["paragraphs"].append(para)

            cm = CASE_RE.search(para)
            is_case = (
                re.match(r"^民国\s*\d+\s*年", para) is not None
                and cm is not None
                and len(para) <= 120
            )
            if is_case:
                roc = int(cm.group(1))
                cur["cases"].append({
                    "id": f"{cur['no']}-{len(cur['cases']) + 1}",
                    "raw": para,
                    "rocYear": roc,
                    "year": roc + 1911,
                    "gender": cm.group(2),
                    "ju": (JUE_RE.search(para).group(1).replace(" ", "") if JUE_RE.search(para) else ""),
                    "ziweiPos": (ZIWEI_RE.search(para).group(1) if ZIWEI_RE.search(para) else ""),
                    "mingGong": (MING_RE.search(para).group(1) if MING_RE.search(para) else ""),
                })
    doc.close()
    if cur is not None:
        lectures.append(cur)
    return lectures


def main():
    src = sys.argv[1]
    lectures = parse_pdf(src)

    total_chars = sum(len(p) for l in lectures for p in l["paragraphs"])
    total_cases = sum(len(l["cases"]) for l in lectures)
    print(f"集数 {len(lectures)}，段落 {sum(len(l['paragraphs']) for l in lectures)}，"
          f"字数 {total_chars}，案例 {total_cases}")
    for l in lectures:
        print(f"  第{l['no']:>2}集 {l['subtitle']} · {l['name']}  p{l['pages'][0]}-{l['pages'][1]}  "
              f"段{len(l['paragraphs'])} 案例{len(l['cases'])}")

    data = [{
        "no": l["no"],
        "subtitle": l["subtitle"],
        "name": l["name"],
        "pageStart": l["pages"][0],
        "pageEnd": l["pages"][1],
        "paragraphs": l["paragraphs"],
        "cases": l["cases"],
    } for l in lectures]

    # 同时留一份 JSON，便于检索/复用
    (ROOT / "lib" / "lectures").mkdir(parents=True, exist_ok=True)
    (ROOT / "lib" / "lectures" / "tianji.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    ts = build_ts(data)
    (ROOT / "lib" / "lectures" / "tianji.ts").write_text(ts, encoding="utf-8")
    print("written: lib/lectures/tianji.ts  bytes=", len(ts.encode("utf-8")))


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def build_ts(data) -> str:
    lines = [
        "/**",
        " * 《倪海厦·天纪》紫微斗数听课笔记 · 结构化文本",
        " *",
        " * 由 scripts/import-tianji.py 从原书 PDF 直接抽取，原文一字未改：",
        " * 只做了去页眉、压空白、段内换行合并三类排版级清理。",
        " * 版权归原作者与讲者，此处仅作本地研习检索之用。",
        " */",
        "",
        "export type LectureCase = {",
        "  id: string;",
        "  raw: string;",
        "  rocYear: number;",
        "  year: number;",
        "  gender: string;",
        "  ju: string;",
        "  ziweiPos: string;",
        "  mingGong: string;",
        "};",
        "",
        "export type Lecture = {",
        "  no: number;",
        "  subtitle: string;",
        "  name: string;",
        "  pageStart: number;",
        "  pageEnd: number;",
        "  paragraphs: string[];",
        "  cases: LectureCase[];",
        "};",
        "",
        "export const LECTURES: Lecture[] = [",
    ]
    for l in data:
        lines.append("  {")
        lines.append(f"    no: {l['no']},")
        lines.append(f"    subtitle: {ts_str(l['subtitle'])},")
        lines.append(f"    name: {ts_str(l['name'])},")
        lines.append(f"    pageStart: {l['pageStart']},")
        lines.append(f"    pageEnd: {l['pageEnd']},")
        lines.append("    paragraphs: [")
        for p in l["paragraphs"]:
            lines.append(f"      {ts_str(p)},")
        lines.append("    ],")
        lines.append("    cases: [")
        for c in l["cases"]:
            lines.append("      {")
            for k in ("id", "raw", "gender", "ju", "ziweiPos", "mingGong"):
                lines.append(f"        {k}: {ts_str(c[k])},")
            lines.append(f"        rocYear: {c['rocYear']},")
            lines.append(f"        year: {c['year']},")
            lines.append("      },")
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export const LECTURE_SOURCE = '《倪海厦·天纪》人间道听课笔记（紫微斗数部分）';")
    lines.append("")
    lines.append("export function getLecture(no: number): Lecture | undefined {")
    lines.append("  return LECTURES.find((l) => l.no === no);")
    lines.append("}")
    lines.append("")
    lines.append("export function lectureChars(l: Lecture): number {")
    lines.append("  return l.paragraphs.reduce((s, p) => s + p.length, 0);")
    lines.append("}")
    lines.append("")
    lines.append("export const ALL_CASES = LECTURES.flatMap((l) =>")
    lines.append("  l.cases.map((c) => ({ ...c, lectureNo: l.no, lectureName: l.name })),")
    lines.append(");")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    main()
