/**
 * /knowledge —— 星曜知识（浅色研习版 · 卡片式）
 *
 * 三层内容，来路各不相同，页面上不混着说：
 *   1. STAR_PLAIN（lib/ziwei/star-plain.ts）—— 编者写的大白话档案：像什么人、喜什么、忌什么、四类问题怎么读；
 *   2. KB（lib/ziwei/star-kb.ts）—— 14 星 × 13 主题共 182 条，书面口径，每页四段；
 *   3. 四套格局判据（定贵/定富/定品/定杂，49 条）—— 仓库原样保留的古籍条文，带可否判定。
 * 开源包原本的 STAR_DB 断语库是空对象（db-analysis.ts 第 54 行），此处不假装有。
 */

import Link from 'next/link';
import { ALL_STARS, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { DING_GUI_GE } from '@/lib/ziwei/patterns-dinggui';
import { DING_FU_GE } from '@/lib/ziwei/patterns-dingfu';
import { DING_PIN_GE } from '@/lib/ziwei/patterns-dingpin';
import { DING_ZA_GE } from '@/lib/ziwei/patterns-dingza';
import { PATTERN_PLAIN_NOTE } from '@/lib/ziwei/patterns-plain';
import { kbCount } from '@/lib/ziwei/star-kb';
import { getStarPlain, PLAIN_SOURCE_NOTE } from '@/lib/ziwei/star-plain';
import { PALACE_KB } from '@/lib/ziwei/palace-kb';
import PatternGrid from '@/components/study/PatternGrid';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { PageHead, Card, Section, Btn } from '@/components/study/ui';

const KB_COUNT = kbCount();
const PALACE_ORDER_KB = Object.values(PALACE_KB).sort((a, b) => a.idx - b.idx);

export const metadata = {
  title: '星曜知识 · 十四主星与格局判据 · 紫微研习',
  description: '十四主星大白话档案 + 182 条星曜论述 + 四十九格古籍判据。',
};

type GeRow = { no: number; name: string; note: string; status: string; why?: string };

const GE_SETS: { title: string; sub: string; key: 'gui' | 'fu' | 'pin' | 'za'; rows: GeRow[] }[] = [
  { title: '定贵二十七格', sub: '《紫微斗数全书》定贵局 · 主贵显与格局成立条件', key: 'gui', rows: DING_GUI_GE as GeRow[] },
  { title: '定富六格', sub: '主财禄丰足', key: 'fu', rows: DING_FU_GE as GeRow[] },
  { title: '定品八格', sub: '主地位品秩', key: 'pin', rows: DING_PIN_GE as GeRow[] },
  { title: '定杂八格', sub: '杂格，多应于大限流年而非本命', key: 'za', rows: DING_ZA_GE as GeRow[] },
];

export default function KnowledgeHomePage() {
  const total = GE_SETS.reduce((s, g) => s + g.rows.length, 0);

  return (
    <ZenShell activeOverride="/knowledge">
      <div style={{ padding: '30px 28px 64px', maxWidth: 1080, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { label: '星曜知识' }]}
          title="星曜知识"
          desc={`十四主星大白话档案 · ${KB_COUNT} 条星曜论述 · ${total} 条格局判据 · 十二宫逐宫详解。`}
          actions={<Btn href="/chart" primary>拿自己的盘对照</Btn>}
        />

        {/* 两个检索入口：按星曜、按宫位 —— 查东西先选维度 */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
          <Card dense>
            <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 6 }}>按星曜查</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_STARS.map((s) => (
                <Link key={s} href={`/knowledge/${STAR_TO_SLUG[s]}/overview`} style={{
                  fontSize: T.sub, textDecoration: 'none', color: C.ink2, padding: '3px 9px',
                  border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusChip,
                }}>{s}</Link>
              ))}
            </div>
          </Card>
          <Card dense>
            <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 6 }}>按宫位查</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PALACE_ORDER_KB.map((p) => (
                <Link key={p.slug} href={`/knowledge/palace/${p.slug}`} style={{
                  fontSize: T.sub, textDecoration: 'none', color: C.ink2, padding: '3px 9px',
                  border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusChip,
                }}>{p.name.replace('宫', '')}</Link>
              ))}
            </div>
          </Card>
        </div>

        {/* ── 十四主星 · 卡片 ── */}
        <Section title="十四主星" hint="像什么人 / 喜什么 / 怕什么" index="01" style={{ marginTop: 28 }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
          {ALL_STARS.map((star) => {
            const p = getStarPlain(star);
            return (
              <Link
                key={star}
                href={`/knowledge/${STAR_TO_SLUG[star]}/overview`}
                className="zw-card-hover"
                style={{
                  display: 'flex', gap: 14, textDecoration: 'none', background: C.card,
                  border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '14px 16px',
                  transition: 'box-shadow .18s ease, transform .18s ease, border-color .18s ease',
                }}
              >
                {/* 星名印 */}
                <div style={{
                  flex: '0 0 58px', height: 58, borderRadius: SHAPE.radiusBtn,
                  background: C.paperDeep, border: `1px solid ${C.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT.serif, fontSize: T.h2, fontWeight: 700, letterSpacing: TRACK.title, color: C.navy,
                }}>{star.replace('星', '')}</div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT.serif, fontSize: T.h3, fontWeight: 700, letterSpacing: TRACK.label, color: C.ink }}>{star}</span>
                    <span style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.title }}>{p?.meta ?? '主星'}</span>
                  </div>

                  <div style={{ fontSize: T.body, color: C.ink, lineHeight: 1.7, marginTop: 5 }}>
                    {p?.oneLine ?? STAR_BRIEF_SEO[star] ?? ''}
                  </div>

                  {p && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 9 }}>
                      {p.keys.map((k) => (
                        <span key={k} style={{
                          fontSize: T.micro, color: C.ink2, background: C.paper,
                          border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusChip, padding: '2px 9px', letterSpacing: TRACK.title,
                        }}>{k}</span>
                      ))}
                    </div>
                  )}

                  <div style={{
                    marginTop: 9, fontSize: T.micro, color: C.ink3, lineHeight: 1.7,
                    borderTop: `1px dashed ${C.line}`, paddingTop: 8,
                  }}>
                    {p ? <span style={{ color: C.gold }}>{p.hua}</span> : null}
                    <span style={{ marginLeft: 8 }}>13 主题详解 →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        </Section>

        {/* ── 十二宫 · 卡片 ── */}
        <section id="palaces" style={{ marginTop: 34, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: FONT.display, fontSize: T.body, letterSpacing: TRACK.label, color: C.ink }}>十二宫详解</div>
            <div style={{ fontSize: T.micro, color: C.ink3 }}>每宫一页 · 管什么 / 白话读法 / 盘中怎么看 / 常见误读</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, alignItems: 'start' }}>
            {PALACE_ORDER_KB.map((p) => (
              <Link key={p.slug} href={`/knowledge/palace/${p.slug}`} className="zw-card-hover" style={{
                display: 'block', textDecoration: 'none', background: C.card,
                border: `1px solid ${C.line}`, borderLeft: `3px solid ${mix(C.navy, 45)}`,
                borderRadius: SHAPE.radiusCard, padding: '13px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: FONT.serif, fontSize: T.h3, fontWeight: 700, color: C.ink, letterSpacing: TRACK.label }}>{p.name}</span>
                  {p.alias && <span style={{ fontSize: T.micro, color: C.ink3 }}>{p.alias}</span>}
                </div>
                <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.9, marginTop: 6 }}>{p.oneLine}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                  {p.scope.slice(0, 3).map((s) => (
                    <span key={s.label} style={{
                      fontSize: T.micro, color: C.ink2, background: C.paper,
                      border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusChip, padding: '2px 9px',
                    }}>{s.label}</span>
                  ))}
                  <span style={{ fontSize: T.micro, color: C.gold, alignSelf: 'center', marginLeft: 2 }}>详解 →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 格局库 · 卡片 ── */}
        {GE_SETS.map((set) => (
          <section key={set.title} style={{ marginTop: 34 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <div style={{ fontFamily: FONT.display, fontSize: T.body, letterSpacing: TRACK.label, color: C.ink }}>{set.title}</div>
              <div style={{ fontSize: T.micro, color: C.ink3 }}>{set.rows.length} 条 · {set.sub}</div>
            </div>
            {/* 判据卡：可点开，展开给白话与用途 */}
            <PatternGrid
              rows={set.rows.map(({ no, name, note, status, why }) => ({ no, name, note, status, why }))}
              setKey={set.key}
            />
            <div style={{ fontSize: T.micro, color: C.ink3, marginTop: 10, lineHeight: 1.9 }}>
              {PATTERN_PLAIN_NOTE}
            </div>
          </section>
        ))}

        {/* ── 来路说明（不遮掩） ── */}
        <div style={{
          marginTop: 34, padding: '18px 20px', borderRadius: SHAPE.radiusCard,
          background: C.paper, border: `1px dashed ${C.line}`,
        }}>
          <div style={{ fontSize: T.sub, color: C.ink, letterSpacing: TRACK.title, marginBottom: 8 }}>知识层的内容来路</div>
          <div style={{ fontSize: T.meta, color: C.ink2, lineHeight: 2 }}>
            开源包把「十四主星 × 十三宫位」的断语库（STAR_DB）留空了。本版按三合派通行口诀<b>重新整理了 {KB_COUNT} 条</b>，
            14 星 × 13 主题逐页补齐，每页四段：一句话定调 / 核心论断 / 命盘依据 / 经典出处。<br />
            卡片上的「大白话」是另一层，只讲这颗星像什么人、喜忌什么、落到四类问题上怎么读，不算断语。
            {PLAIN_SOURCE_NOTE}<br />
            四十九条格局判据是仓库原样保留的古籍条文，出处与判定条件原样照录。
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Link href="/library" style={{
              fontSize: T.sub, padding: '7px 14px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
              background: C.ink, color: C.paper,
            }}>先读古籍原典</Link>
            <Link href="/chart" style={{
              fontSize: T.sub, padding: '7px 14px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
              color: C.ink2, border: `1px solid ${C.line}`, background: C.card,
            }}>拿自己盘对照</Link>
          </div>
        </div>
      </div>
    </ZenShell>
  );
}
