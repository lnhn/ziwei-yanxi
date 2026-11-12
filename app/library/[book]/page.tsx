/**
 * /library/[book] —— 单部古籍目录（浅色研习版）
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_BOOKS, getBookBySlug } from '@/lib/classics';
import ScanReader from '@/components/library/ScanReader';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { PageHead, Btn } from '@/components/study/ui';

export async function generateStaticParams() {
  return ALL_BOOKS.map((b) => ({ book: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) return {};
  return { title: `《${book.title}》· ${book.dynasty} · 紫微研习`, description: book.intro };
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) notFound();

  return (
    <ZenShell activeOverride="/library">
      <div style={{ padding: '30px 28px 64px', maxWidth: 820, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { href: '/library', label: '古籍原典' }, { label: `《${book.title}》` }]}
          title={`《${book.title}》`}
          kicker={`${book.dynasty} · ${book.author}`}
          desc={book.intro}
          actions={book.slug === 'quanshu-yuanwen'
            ? <Btn href="/library/mingban" size="sm">影印本 →</Btn>
            : book.slug === 'mingban'
              ? <Btn href="/library/quanshu-yuanwen" size="sm">文字版 →</Btn>
              : undefined}
        />

        {book.scan ? (
          <>
            <div style={{
              marginBottom: 14, padding: '12px 16px', borderRadius: SHAPE.radiusBtn,
              background: mix(C.gold, 12), border: `1px solid ${C.gold}`,
              fontSize: T.meta, color: C.ink2, lineHeight: 1.9,
            }}>
              影印本 · 共 {book.scan.pageCount} 页。{book.scan.note}
            </div>
            <ScanReader base="/books/mingban" pageCount={book.scan.pageCount} pdf={book.scan.pdf} />

            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, marginTop: 18, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 20px', borderBottom: `1px solid ${C.line}`,
                fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.eyebrow,
              }}>CONTENTS · 目次摘录（原书页码）</div>
              {book.scan.toc.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 14, padding: '12px 20px',
                    borderBottom: i === (book.scan?.toc.length ?? 0) - 1 ? 'none' : `1px dashed ${C.line}`,
                  }}
                >
                  <div style={{ flex: 1, fontSize: T.body, color: C.ink, letterSpacing: TRACK.title, fontFamily: FONT.serif }}>{t.title}</div>
                  <div style={{ fontSize: T.eyebrow, color: C.ink3, fontFamily: FONT.mono }}>{t.page}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 20px', borderBottom: `1px solid ${C.line}`,
            fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.eyebrow,
          }}>CHAPTERS · 章节目录</div>
          {book.chapters.map((chapter, i) => {
            const vol = /^(卷[一二三四五六七八九十]|卷首)/.exec(chapter.title)?.[1] ?? '';
            const prevVol = i > 0 ? (/^(卷[一二三四五六七八九十]|卷首)/.exec(book.chapters[i - 1].title)?.[1] ?? '') : '';
            return (
              <div key={i}>
                {vol && vol !== prevVol && (
                  <div style={{
                    padding: '10px 20px', background: C.paper, borderBottom: `1px solid ${C.line}`,
                    fontSize: T.micro, color: C.gold, letterSpacing: TRACK.eyebrow,
                  }}>{vol} · {book.chapters.filter((c) => (/^(卷[一二三四五六七八九十]|卷首)/.exec(c.title)?.[1] ?? '') === vol).length} 篇</div>
                )}
                <Link
                  href={`/library/${book.slug}/${i}`}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 14, padding: '14px 20px',
                    borderBottom: i === book.chapters.length - 1 ? 'none' : `1px dashed ${C.line}`,
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: T.sub, color: C.gold, fontWeight: 600, minWidth: 34, letterSpacing: TRACK.title }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: T.body, color: C.ink, letterSpacing: TRACK.title }}>
                      {chapter.title.replace(/^(卷[一二三四五六七八九十]|卷首)\s*·\s*/, '')}
                    </div>
                    {chapter.subtitle && (
                      <div style={{ fontSize: T.eyebrow, color: C.ink3, marginTop: 4, lineHeight: 1.8 }}>
                        {chapter.subtitle.length > 46 ? `${chapter.subtitle.slice(0, 46)}…` : chapter.subtitle}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: T.micro, color: C.ink3 }}>{chapter.paragraphs.length} 段</div>
                  <div style={{ fontSize: T.sub, color: C.navy }}>→</div>
                </Link>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </ZenShell>
  );
}
