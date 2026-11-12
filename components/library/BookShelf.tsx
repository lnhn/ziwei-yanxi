'use client';

/**
 * 书架 —— 统一封面比例的卡片
 *
 * 封面固定 3:4（宽 100% 高按比例），书名、卷数、阅读进度都在同一位置，
 * 八本书摆在一起时眼睛不需要重新找锚点。进度来自本机 book-progress。
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { FONT, T, TRACK, SHAPE } from '@/components/study/type';
import { loadBookProgress, type BookProgress } from '@/lib/study/book-progress';

export interface ShelfBook {
  slug: string;
  title: string;
  dynasty: string;
  author: string;
  intro: string;
  chapters: number;
  paragraphs: number;
  scanPages?: number;
}

export default function BookShelf({ books }: { books: ShelfBook[] }) {
  const [prog, setProg] = useState<Record<string, BookProgress>>({});

  useEffect(() => {
    const map: Record<string, BookProgress> = {};
    for (const b of books) {
      const p = loadBookProgress(b.slug);
      if (p) map[b.slug] = p;
    }
    setProg(map);
  }, [books]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 14, alignItems: 'start' }}>
      {books.map((b) => {
        const p = prog[b.slug];
        const pct = p && b.chapters > 0 ? Math.min(100, Math.round(((p.chapterIdx + 1) / b.chapters) * 100)) : 0;
        return (
          <Link
            key={b.slug}
            href={`/library/${b.slug}`}
            className="zw-card-hover"
            style={{
              display: 'flex', flexDirection: 'column', textDecoration: 'none',
              background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
              overflow: 'hidden', transition: 'border-color .15s ease, box-shadow .15s ease',
            }}
          >
            {/* 封面：统一 3:4，书名字竖排压在纸上 */}
            <div style={{
              position: 'relative', aspectRatio: '4 / 3',
              background: `linear-gradient(160deg, ${mix(C.gold, 8)}, transparent 60%), ${C.paperDeep}`,
              borderBottom: `1px solid ${C.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 14px',
            }}>
              <span style={{
                position: 'absolute', top: 10, left: 12,
                fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label,
              }}>{b.dynasty}</span>
              <span style={{
                fontFamily: FONT.display, fontSize: 19, color: C.ink, letterSpacing: '0.12em',
                textAlign: 'center', lineHeight: 1.5, fontWeight: 700,
              }}>《{b.title}》</span>
              {b.scanPages ? (
                <span style={{
                  position: 'absolute', bottom: 10, right: 12, fontSize: T.micro, color: C.ink3,
                  fontFamily: FONT.mono,
                }}>影印 {b.scanPages} 页</span>
              ) : (
                <span style={{
                  position: 'absolute', bottom: 10, right: 12, fontSize: T.micro, color: C.ink3,
                  fontFamily: FONT.mono,
                }}>{b.chapters} 章</span>
              )}
            </div>

            <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div style={{ fontSize: T.sub, color: C.ink3 }}>{b.author}</div>
              <div style={{
                fontSize: T.sub, color: C.ink2, lineHeight: 1.75,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{b.intro}</div>

              <div style={{ marginTop: 'auto' }}>
                {p ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: T.micro, color: C.gold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        读到 · {p.chapterTitle.replace(/^(卷[一二三四五六七八九十]|卷首)\s*·\s*/, '')}
                      </span>
                      <span style={{ fontSize: T.micro, color: C.ink3, fontFamily: FONT.mono }}>{pct}%</span>
                    </div>
                    <div style={{ marginTop: 5, height: 3, borderRadius: 3, background: mix(C.navy, 10) }}>
                      <div style={{ height: 3, borderRadius: 3, width: `${pct}%`, background: C.gold }} />
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: T.micro, color: C.ink3 }}>{b.scanPages ? '尚未翻阅' : '尚未开卷'}</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
