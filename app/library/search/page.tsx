'use client';

/**
 * /library/search?q=xxx —— 全文检索（古籍 + 倪师讲义）
 *
 * 2026-11 改：从服务端渲染改成纯客户端渲染。
 * 原因：桌面版（Tauri）只能装静态产物，服务端读 searchParams 的页面在 static export
 * 下是死的。改成从 window.location.search 取词后，网页版与桌面版行为完全一致。
 *
 * 古籍走内核的 searchClassics，讲义走 lib/lectures/search。
 * 影印本（无文字层）不参与检索，页面上不显示它的结果。
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { searchClassics, getParagraphById, type SearchHit } from '@/lib/classics';
import { searchLectures, type LectureHit } from '@/lib/lectures/search';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { T, FONT, SHAPE } from '@/components/study/type';
import { PageHead } from '@/components/study/ui';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [ready, setReady] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [lhits, setLhits] = useState<LectureHit[]>([]);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('q') || '';
    const query = raw.trim();
    setQ(query);
    if (query) {
      setHits(searchClassics(query, 50));
      setLhits(searchLectures(query, 30));
    }
    setReady(true);
  }, []);

  return (
    <ZenShell activeOverride="/library">
      <div style={{ padding: '34px 26px 60px', maxWidth: 800, margin: '0 auto' }}>
        <PageHead
          kicker="古籍原典 · 全文检索"
          title={q ? `「${q}」` : '检索'}
          desc={ready ? `古籍 ${hits.length} 条 · 倪师讲义 ${lhits.length} 条` : '检索中…'}
        />

        {/* 换个词再搜 */}
        <form action="/library/search" method="get" className="zw-search" style={{
          marginTop: -4, display: 'flex', gap: 8, background: C.card,
          border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '9px 11px',
        }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="再搜一个词，如：化忌 / 紫微 / 命宫 / 半空折翅"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: T.sub, color: C.ink, fontFamily: 'inherit', padding: '4px 6px',
            }}
          />
          <button type="submit" style={{
            padding: '7px 16px', borderRadius: SHAPE.radiusBtn, fontSize: T.sub, cursor: 'pointer', fontFamily: 'inherit',
            background: C.navy, color: C.paper, border: `1px solid ${C.navy}`,
          }}>检索</button>
        </form>

        {ready && hits.length === 0 && lhits.length === 0 ? (
          <div style={{
            marginTop: 22, background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
            padding: '40px 20px', textAlign: 'center', fontSize: T.sub, color: C.ink2, lineHeight: 1.9,
          }}>
            {q ? (
              <>
                <div style={{ marginBottom: 8 }}>未在古籍与讲义中找到「{q}」</div>
                <div style={{ fontSize: T.meta, color: C.ink3 }}>
                  可试：七杀朝斗 / 双禄朝垣 / 化忌 / 紫微 / 命宫 / 机月同梁 / 半空折翅
                </div>
              </>
            ) : <div>请输入要检索的关键词</div>}
          </div>
        ) : (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lhits.map((hit, i) => (
              <Link
                key={`l${i}`}
                href={`/lectures/${hit.lectureIdx}`}
                className="zw-card-hover"
                style={{
                  display: 'block', textDecoration: 'none', color: 'inherit', transition: 'border-color .15s ease, box-shadow .15s ease',
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: T.micro, color: C.ink3, marginBottom: 8 }}>
                  <span style={{ color: C.navy, fontWeight: 600 }}>倪师讲义 · 第 {hit.lectureNo} 集</span>
                  <span>·</span>
                  <span>{hit.lectureName}</span>
                </div>
                <div
                  style={{ fontSize: T.body, color: C.ink, lineHeight: 1.95, fontFamily: FONT.serif }}
                  dangerouslySetInnerHTML={{ __html: hit.snippet }}
                />
              </Link>
            ))}

            {hits.map((hit, i) => {
              const ctx = getParagraphById(hit.paragraphId);
              const chapterIdx = ctx?.chapterIdx ?? 0;
              return (
                <Link
                  key={i}
                  href={`/library/${hit.bookSlug}/${chapterIdx}#${hit.paragraphId}`}
                  className="zw-card-hover"
                  style={{
                    display: 'block', textDecoration: 'none', color: 'inherit', transition: 'border-color .15s ease, box-shadow .15s ease',
                    background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '16px 18px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: T.micro, color: C.ink3, marginBottom: 8 }}>
                    <span style={{ color: C.gold, fontWeight: 600 }}>《{hit.bookTitle}》</span>
                    <span>·</span>
                    <span>{hit.chapterTitle}</span>
                  </div>
                  <div
                    style={{ fontSize: T.body, color: C.ink, lineHeight: 1.95 }}
                    dangerouslySetInnerHTML={{ __html: hit.snippet }}
                  />
                </Link>
              );
            })}
          </div>
        )}

        {ready && (hits.length > 0 || lhits.length > 0) && (
          <div style={{ marginTop: 18, fontSize: T.micro, color: C.ink3, lineHeight: 1.85 }}>
            《紫微斗数全书（明版今注）》为扫描影印件、无文字层，不参与全文检索，可在
            <Link href="/library/mingban" style={{ color: C.navy, textDecoration: 'none' }}> 古籍原典 · 明版今注 </Link>
            逐页翻阅。
          </div>
        )}
      </div>
      <style>{`mark { background: ${mix(C.gold, 26)}; color: #7a5a10; padding: 0 2px; border-radius: 2px; }`}</style>
    </ZenShell>
  );
}
