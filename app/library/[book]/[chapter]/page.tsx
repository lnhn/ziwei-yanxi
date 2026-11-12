/**
 * /library/[book]/[chapter] —— 单章阅读（浅色研习版）
 *
 * 原文用宋体大字，白话与倪师注各用浅底块区分 —— 读原典最怕三者混在一起。
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_BOOKS, getChapter } from '@/lib/classics';
import ZenShell from '@/components/study/ZenShell';
import AiAssist from '@/components/study/AiAssist';
import ClassicsReader from '@/components/library/ClassicsReader';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { PageHead } from '@/components/study/ui';

export async function generateStaticParams() {
  return ALL_BOOKS.flatMap((b) => b.chapters.map((_, i) => ({ book: b.slug, chapter: String(i) })));
}

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: slug, chapter } = await params;
  const r = getChapter(slug, parseInt(chapter, 10));
  if (!r) return {};
  return {
    title: `${r.chapter.title} · 《${r.book.title}》· 紫微研习`,
    description: r.chapter.subtitle || `《${r.book.title}》${r.chapter.title}原文`,
  };
}

export default async function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: slug, chapter } = await params;
  const r = getChapter(slug, parseInt(chapter, 10));
  if (!r) notFound();

  const { book, chapter: ch, chapterIdx } = r;
  const prev = chapterIdx - 1;
  const next = chapterIdx + 1;

  return (
    <ZenShell activeOverride="/library">
      <div style={{ padding: '30px 28px 64px', maxWidth: 820, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[
            { href: '/study', label: '研习' },
            { href: '/library', label: '古籍原典' },
            { href: `/library/${book.slug}`, label: `《${book.title}》` },
            { label: `第 ${chapterIdx + 1} 篇` },
          ]}
          title={ch.title}
          kicker={`${book.dynasty} · 共 ${book.chapters.length} 篇`}
          desc={ch.subtitle}
        />

        <div style={{
          marginBottom: 16, padding: '9px 13px', borderRadius: SHAPE.radiusBtn,
          background: C.paper, border: `1px solid ${C.line}`, fontSize: T.sub, color: C.ink3, lineHeight: 1.8,
        }}>
          原文为公版古籍字样；「白话」是本项目编者或本机 AI 生成的今译，不是原书注文，也不是倪师原话。
          想看原书版式，去「古籍原典 → 明刊影印本」翻图。
        </div>
        <div style={{ marginBottom: 14 }}>
          <AiAssist
            task="classics"
            cta="AI 精读这一章"
            note="今译 + 术语 + 落盘用法，按本机配置的模型生成"
            cacheKey={`cls-${book.slug}-${chapterIdx}`}
            vars={{
              book: book.title,
              chapter: ch.title,
              text: ch.paragraphs.map((p) => p.text).join('\n').slice(0, 3000),
            }}
          />
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '24px 26px' }}>
          <ClassicsReader
            cacheId={`${book.slug}-${chapterIdx}`}
            paragraphs={ch.paragraphs}
            subtitle={ch.subtitle}
            plainNote={book.slug === 'quanshu-yuanwen' ? '白话由编者或本机 AI 生成，不是原书注文' : undefined}
            progress={{ book: book.slug, chapterIdx, chapterTitle: ch.title }}
          />
        </div>

        {/* 上一章 / 下一章 */}
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          {prev >= 0 ? (
            <Link href={`/library/${book.slug}/${prev}`} style={{
              flex: 1, padding: '13px 16px', borderRadius: SHAPE.radiusCard, textDecoration: 'none',
              background: C.card, border: `1px solid ${C.line}`, color: C.ink,
            }}>
              <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 3 }}>← 上一章</div>
              <div style={{ fontSize: T.sub }}>{book.chapters[prev].title}</div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
          {next < book.chapters.length ? (
            <Link href={`/library/${book.slug}/${next}`} style={{
              flex: 1, padding: '13px 16px', borderRadius: SHAPE.radiusCard, textDecoration: 'none', textAlign: 'right',
              background: C.card, border: `1px solid ${C.line}`, color: C.ink,
            }}>
              <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 3 }}>下一章 →</div>
              <div style={{ fontSize: T.sub }}>{book.chapters[next].title}</div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
        </div>
      </div>
    </ZenShell>
  );
}
