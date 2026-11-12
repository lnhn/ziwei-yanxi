/**
 * /lectures —— 倪师讲义（《天纪》紫微斗数听课笔记）
 *
 * 内容由 scripts/import-tianji.py 从 PDF 直接抽出，原文未改；
 * 这里只负责目录与检索入口，正文在 /lectures/[no]。
 */

import Link from 'next/link';
import { ALL_CASES, LECTURES, LECTURE_SOURCE, lectureChars } from '@/lib/lectures/tianji';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { FONT, T, SHAPE, NUMERIC } from '@/components/study/type';
import { PageHead, Section, Card, Btn, Banner } from '@/components/study/ui';

export const metadata = {
  title: '倪师讲义 · 天纪紫微斗数听课笔记 · 紫微研习',
  description: '《倪海厦·天纪》人间道紫微斗数部分 15 集听课笔记全文，附命例实批案例。',
};

const TOTAL_CHARS = LECTURES.reduce((s, l) => s + lectureChars(l), 0);

export default function LecturesPage() {
  return (
    <ZenShell activeOverride="/lectures">
      <div style={{ padding: '30px 28px 64px', maxWidth: 1060, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { label: '倪师讲义' }]}
          title="倪师讲义"
          desc={`${LECTURE_SOURCE} · ${LECTURES.length} 集 / ${TOTAL_CHARS} 字 · 命例实批 ${ALL_CASES.length} 例。`}
          actions={
            <>
              <Btn href="/cases" size="sm">命例实批一览</Btn>
              <Btn href="/study/practice" size="sm" quiet>先用七步练安星</Btn>
            </>
          }
        />

        <Banner tone="info" title="怎么读">
          讲义原文按 PDF 逐页抽出，只做去页眉、并换行的排版清理，一字未改。
          倪师讲的是「以果决行」—— 先看盘怎么断，再谈怎么改；读的时候请配合「手工推演」练安星，
          再把「命盘依据」自己走一遍，才不算看故事。
        </Banner>

        <Section title="全部讲次" hint="按集序，点开即读" index="01">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
            {LECTURES.map((l, i) => {
              const first = l.paragraphs[0] ?? '';
              return (
                <Link
                  key={i}
                  href={`/lectures/${i + 1}`}
                  className="zw-card-hover"
                  style={{
                    display: 'block', textDecoration: 'none', color: 'inherit',
                    background: C.card, border: `1px solid ${C.line}`,
                    borderRadius: SHAPE.radiusCard, padding: '16px 18px',
                    transition: 'border-color .15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: FONT.display, fontSize: T.h3, color: C.ink, letterSpacing: '0.08em' }}>
                      第 {l.no} 集
                    </div>
                    <div style={{ fontSize: T.micro, color: C.ink3 }}>{l.subtitle}</div>
                    {l.name && (
                      <div style={{
                        marginLeft: 'auto', fontSize: T.micro, color: C.gold,
                        border: `1px solid ${C.line}`, borderRadius: 4, padding: '1px 7px',
                      }}>{l.name}</div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: FONT.serif, fontSize: T.serif - 2, color: C.ink2, lineHeight: 1.75,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{first}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: T.micro, color: C.ink3, flexWrap: 'wrap' }}>
                    <span style={{ ...NUMERIC }}>p{l.pageStart}–{l.pageEnd}</span>
                    <span>{l.paragraphs.length} 段</span>
                    <span style={{ ...NUMERIC }}>{lectureChars(l)} 字</span>
                    {l.cases.length > 0 && <span>{l.cases.length} 例</span>}
                    <span style={{ marginLeft: 'auto', color: C.gold }}>读 →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      </div>
    </ZenShell>
  );
}
