'use client';

/**
 * 轻量 Markdown 渲染（给 AI 输出用）
 *
 * 问题现场：模型返回的是 Markdown（`###` 标题、`1.` 有序列表、`**加粗**`、表格），
 * 之前三处 AI 输出区都是 `whiteSpace: pre-wrap` 的原文本，于是 `**` 和 `1.` 全部裸露成字符，
 * 「渲染不出 md 效果」。这里补一层渲染，不引外部依赖 —— 只有一条约束：样式必须跟着皮肤走，
 * 所以全部用 components/study/paper.ts 的 token，而不是写死颜色。
 *
 * 支持：标题(#..####)、有序/无序列表（含缩进续行）、引用、代码块、分隔线、表格、
 *      行内 **加粗** / *斜体* / `代码` / [链接](url)。够覆盖模型实际会吐的写法。
 */

import { type ReactNode } from 'react';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { T, FONT, SHAPE } from '@/components/study/type';

/** 行内标记：**粗**、*斜*、`code`、[文字](链接) */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*([^*\n]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(<strong key={`${keyBase}-b${i}`} style={{ color: C.ink, fontWeight: 650 }}>{m[2]}</strong>);
    else if (m[4]) out.push(
      <code key={`${keyBase}-c${i}`} style={{
        fontFamily: FONT.mono, fontSize: '0.92em', padding: '1px 5px', borderRadius: 4,
        background: mix(C.navy, 12), color: C.ink,
      }}>{m[4]}</code>);
    else if (m[6]) out.push(
      <a key={`${keyBase}-a${i}`} href={m[7]} target="_blank" rel="noreferrer"
        style={{ color: C.navy, textDecoration: 'underline' }}>{m[6]}</a>);
    else if (m[9]) out.push(<em key={`${keyBase}-i${i}`} style={{ color: C.ink2 }}>{m[9]}</em>);
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes('-');

function cells(row: string): string[] {
  return row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

export default function Markdown({
  text,
  size = 15.5,
  serif = false,
}: {
  text: string;
  size?: number;
  serif?: boolean;
}) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  const family = serif ? FONT.serif : FONT.sans;

  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) { i += 1; continue; }

    // 代码块
    if (/^```/.test(line.trim())) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i += 1; }
      i += 1;
      blocks.push(
        <pre key={`k${key++}`} style={{
          margin: '10px 0', padding: '11px 13px', background: C.paperDeep,
          border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn,
          fontFamily: FONT.mono, fontSize: size - 1.5, lineHeight: 1.8, color: C.ink2,
          overflowX: 'auto', whiteSpace: 'pre',
        }}>{buf.join('\n')}</pre>,
      );
      continue;
    }

    // 分隔线
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={`k${key++}`} style={{ border: 0, borderTop: `1px dashed ${C.line}`, margin: '16px 0' }} />);
      i += 1;
      continue;
    }

    // 标题
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lv = h[1].length;
      const fs = lv === 1 ? size + 5 : lv === 2 ? size + 3 : lv === 3 ? size + 1.5 : size + 0.5;
      blocks.push(
        <div key={`k${key++}`} style={{
          fontFamily: FONT.display, fontSize: fs, color: C.ink, fontWeight: 600,
          margin: '18px 0 8px', letterSpacing: '0.03em', lineHeight: 1.6,
          paddingLeft: 10, borderLeft: `3px solid ${C.gold}`,
        }}>{inline(h[2], `h${key}`)}</div>,
      );
      i += 1;
      continue;
    }

    // 表格
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i += 1; }
      blocks.push(
        <div key={`k${key++}`} style={{ margin: '10px 0', overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: size - 1 }}>
            <thead>
              <tr>
                {head.map((c, ci) => (
                  <th key={ci} style={{
                    textAlign: 'left', padding: '7px 10px', color: C.ink, fontWeight: 600,
                    borderBottom: `1px solid ${mix(C.gold, 45)}`, background: mix(C.gold, 8),
                    whiteSpace: 'nowrap',
                  }}>{inline(c, `th${key}-${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{
                      padding: '6px 10px', color: C.ink2, borderBottom: `1px solid ${C.line}`,
                      lineHeight: 1.75, verticalAlign: 'top',
                    }}>{inline(c, `td${key}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      blocks.push(
        <blockquote key={`k${key++}`} style={{
          margin: '10px 0', padding: '10px 13px', background: mix(C.gold, 9),
          borderLeft: `3px solid ${mix(C.gold, 55)}`, borderRadius: SHAPE.radiusBtn,
          fontSize: size - 0.5, color: C.ink2, lineHeight: 1.95, fontFamily: family,
        }}>{buf.map((b, bi) => <div key={bi}>{inline(b, `q${key}-${bi}`)}</div>)}</blockquote>,
      );
      continue;
    }

    // 列表（有序 / 无序，支持悬挂缩进）
    if (/^\s*([-*•]|\d+[.、)])\s+/.test(line)) {
      const ordered = /^\s*(\d+)[.、)]\s+/.test(line);
      const items: { text: string; num?: string }[] = [];
      while (i < lines.length) {
        const m = /^\s*([-*•]|\d+[.、)])\s+(.*)$/.exec(lines[i]);
        if (m) {
          items.push({ text: m[2], num: ordered ? m[1].replace(/[.、)]/g, '') : undefined });
          i += 1;
          continue;
        }
        // 续行：非空、非新的块级标记，并入上一条
        const next = lines[i];
        if (next.trim() && !/^(#{1,4}\s|>|\||```|---|\s*([-*•]|\d+[.、)])\s+)/.test(next)) {
          items[items.length - 1].text += ' ' + next.trim();
          i += 1;
          continue;
        }
        break;
      }
      blocks.push(
        <div key={`k${key++}`} style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {items.map((it, ii) => (
            <div key={ii} style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
              <span style={{
                flex: '0 0 auto', minWidth: ordered ? 20 : 10, fontFamily: FONT.mono,
                fontSize: size - 1.5, color: C.gold, letterSpacing: '0.02em',
              }}>{it.num ?? '·'}</span>
              <span style={{ fontSize: size, color: C.ink, lineHeight: 1.95, fontFamily: family }}>
                {inline(it.text, `li${key}-${ii}`)}
              </span>
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // 中文序号小标题：一、二、三、……
    const cn = /^([一二三四五六七八九十]+)[、.．]\s*(.*)$/.exec(line.trim());
    if (cn) {
      blocks.push(
        <div key={`k${key++}`} style={{
          fontFamily: FONT.display, fontSize: size + 1.5, color: C.ink, fontWeight: 600,
          margin: '15px 0 7px', letterSpacing: '0.02em', lineHeight: 1.7,
          display: 'flex', gap: 9, alignItems: 'baseline',
        }}>
          <span style={{ fontFamily: FONT.mono, fontSize: size - 2, color: C.gold }}>{cn[1]}</span>
          <span>{inline(cn[2], `cn${key}`)}</span>
        </div>,
      );
      i += 1;
      continue;
    }

    // 普通段落（连续行合成一段）
    const buf: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4}\s|>|\||```|---|\s*([-*•]|\d+[.、)])\s+|[一二三四五六七八九十]+[、.．])/.test(lines[i])
    ) { buf.push(lines[i].trim()); i += 1; }
    blocks.push(
      <p key={`k${key++}`} style={{
        margin: '8px 0', fontSize: size, lineHeight: 2.0, color: C.ink, fontFamily: family,
      }}>{inline(buf.join(' '), `p${key}`)}</p>,
    );
  }

  return <div style={{ display: 'flex', flexDirection: 'column' }}>{blocks}</div>;
}
