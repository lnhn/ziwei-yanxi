'use client';

/**
 * ScanReader —— 影印本图片阅读器
 *
 * 扫描件没有文字层，浏览器内嵌 PDF 又受插件/加密影响，
 * 所以按页渲染成 JPEG，用最稳的方式翻图：左键上一页、右键下一页、输入页码跳转。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { FONT } from '@/components/study/type';

const pad = (n: number) => String(n).padStart(3, '0');

export default function ScanReader({
  base,
  pageCount,
  pdf,
}: {
  base: string;
  pageCount: number;
  pdf?: string;
}) {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('1');

  useEffect(() => { setDraft(String(page)); }, [page]);

  const go = useCallback((n: number) => {
    setPage(Math.min(pageCount, Math.max(1, Math.round(n))));
  }, [pageCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') go(page - 1);
      if (e.key === 'ArrowRight') go(page + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, page]);

  const src = `${base}/p${pad(page)}.jpg`;
  const nextSrc = useMemo(() => (page < pageCount ? `${base}/p${pad(page + 1)}.jpg` : ''), [base, page, pageCount]);

  const btn = {
    padding: '6px 13px', borderRadius: 5, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', background: C.card, color: C.ink2,
    border: `1px solid ${C.line}`,
  } as const;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 12px', background: C.paperDeep ?? C.paper,
        border: `1px solid ${C.line}`, borderRadius: 9, marginBottom: 10,
      }}>
        <button style={btn} onClick={() => go(page - 1)} disabled={page <= 1}>上一页</button>
        <button style={btn} onClick={() => go(page + 1)} disabled={page >= pageCount}>下一页</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.ink3 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') go(Number(draft) || 1); }}
            style={{
              width: 58, padding: '5px 8px', textAlign: 'center', fontFamily: FONT.mono,
              fontSize: 13, color: C.ink, background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 5, outline: 'none',
            }}
          />
          <span>/ {pageCount} 页</span>
          <button style={{ ...btn, padding: '5px 10px' }} onClick={() => go(Number(draft) || 1)}>跳转</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: C.ink3 }}>← → 键也可翻页</span>
          <a href={src} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none' }}>看大图</a>
          {pdf && (
            <a href={pdf} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none' }}>原 PDF</a>
          )}
        </div>
      </div>

      <div style={{
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
        padding: '14px 14px 10px', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`影印本第 ${page} 页`}
          style={{ display: 'block', width: '100%', height: 'auto', background: '#fff' }}
        />
        {nextSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nextSrc} alt="" style={{ display: 'none' }} />
        )}
      </div>
      <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 8, lineHeight: 1.85 }}>
        页码为 PDF 页序（1–{pageCount}），不是原书刻的汉字页码；目次表的页码可对照着估位置翻。
      </div>
    </div>
  );
}
