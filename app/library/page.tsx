/**
 * /library —— 古籍原典（书架）
 *
 * 页头统一（面包屑 + 标题 + 检索），书目用统一封面比例的卡片，
 * 每张卡固定四件事：书名、卷章数、一句提要、读到哪。
 */

import Link from 'next/link';
import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics';
import ZenShell from '@/components/study/ZenShell';
import BookShelf, { type ShelfBook } from '@/components/library/BookShelf';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { T, SHAPE } from '@/components/study/type';
import { PageHead, Section, Btn } from '@/components/study/ui';

export const metadata = {
  title: '古籍原典 · 紫微斗数全集 / 全书 / 骨髓赋 · 紫微研习',
  description: '紫微斗数权威古籍全文检索：收录明代刊本《紫微斗数全集》《紫微斗数全书》《骨髓赋》等。',
};

export default function LibraryHomePage() {
  const shelf: ShelfBook[] = ALL_BOOKS.map((b) => ({
    slug: b.slug,
    title: b.title,
    dynasty: b.dynasty,
    author: b.author,
    intro: b.intro,
    chapters: b.chapters.length,
    paragraphs: b.chapters.reduce((s, c) => s + c.paragraphs.length, 0),
    scanPages: b.scan?.pageCount,
  }));

  return (
    <ZenShell activeOverride="/library">
      <div style={{ padding: '30px 28px 64px', maxWidth: 1080, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { label: '古籍原典' }]}
          title="古籍原典"
          desc={`${ALL_BOOKS.length} 部公版古籍 · ${TOTAL_PARAGRAPHS} 段精华，原文可检索，白话可逐章对照。`}
          actions={<Btn href="/library/import">导入自备 TXT</Btn>}
        />

        {/* 检索：书架的第一动作是「找一句原文」 */}
        <form action="/library/search" method="get" style={{
          display: 'flex', gap: 8, background: C.card,
          border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '8px 10px 8px 14px',
          boxShadow: 'var(--zw-shadow-card)',
        }}>
          <input
            name="q"
            aria-label="检索古籍原文"
            placeholder="搜原文，如：七杀朝斗 / 双禄朝垣 / 化忌 / 机月同梁"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: T.nav, color: C.ink, fontFamily: 'inherit', padding: '4px 4px',
            }}
          />
          <Btn primary size="sm" submit>检索</Btn>
        </form>

        <Section title="书架" hint="按卷读，进度自动记在本机" index="01" >
          <BookShelf books={shelf} />
        </Section>

        <Section title="说明" index="02">
          <p style={{ margin: 0, fontSize: T.sub, color: C.ink3, lineHeight: 1.9 }}>
            所收录古籍均为公版（明代刊本）。《紫微斗数全书（文字版）》为四卷全本原文，可全文检索、可对章生成白话；
            手上的其他本子可以从{' '}
            <Link href="/library/import" style={{ color: C.ink2, textDecoration: 'underline' }}>导入 TXT</Link>{' '}
            进来按卷分篇阅读。影印本无文字层，只能逐页看版式，不参与检索。
          </p>
        </Section>
      </div>
    </ZenShell>
  );
}
