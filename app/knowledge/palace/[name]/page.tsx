/**
 * /knowledge/palace/[name] —— 十二宫详解
 *
 * 结构分两层，页面上明确标出，不混着说：
 *   白话层（说人话 / 白话读法 / 常见现象 / 常见误读 / 主星组合）—— 编者按三合派通行口诀改写
 *   专业层（盘中怎么看 / 三方四正 / 宫干四化 / 大限用法）—— 术语照用，讲清怎么落到盘上
 * 经典一栏只引本库真正收录的原文，没收录的宫如实写「未收此宫专论」。
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PALACE_KB, PALACE_KB_SLUGS, PALACE_KB_SOURCE_NOTE, getPalaceKb, sanFangOf } from '@/lib/ziwei/palace-kb';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { PageHead } from '@/components/study/ui';

export const dynamicParams = false;

export async function generateStaticParams() {
  return PALACE_KB_SLUGS.map((name) => ({ name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const kb = getPalaceKb(name);
  if (!kb) return {};
  return {
    title: `${kb.name}详解 · 十二宫 · 紫微研习`,
    description: kb.oneLine,
  };
}

/** 小节标题：左竖条 + 章节名 */
function SecHead({ label, note }: { label: string; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ width: 3, height: 13, background: C.cinnabar, borderRadius: 2 }} />
      <span style={{ fontSize: T.sub, color: C.cinnabar, letterSpacing: TRACK.eyebrow }}>{label}</span>
      {note ? <span style={{ fontSize: T.micro, color: C.ink3 }}>{note}</span> : null}
    </div>
  );
}

export default async function PalaceDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const kb = getPalaceKb(name);
  if (!kb) notFound();

  const san = sanFangOf(kb.name);

  return (
    <ZenShell activeOverride="/knowledge">
      <div style={{ padding: '30px 28px 64px', maxWidth: 820, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { href: '/knowledge', label: '星曜知识' }, { href: '/knowledge#palaces', label: '十二宫' }, { label: kb.name }]}
          kicker={`十二宫第 ${kb.idx + 1} 位${kb.alias ? ` · ${kb.alias}` : ''}`}
          title={`${kb.name}详解`}
          desc={kb.oneLine}
        />

        {/* ── 说人话：管什么 ── */}
        <section style={{ marginTop: 22 }}>
          <SecHead label="这一宫管什么" note="白话 · 不是断语" />
          <div style={{ background: C.paperDeep, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '16px 18px' }}>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
              {kb.scope.map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: T.sub, color: C.gold, letterSpacing: TRACK.label, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.95 }}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 白话读法 ── */}
        <section style={{ marginTop: 26 }}>
          <SecHead label="白话读法" note="一段一段讲明白" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {kb.plain.map((p, i) => (
              <div key={i} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
                padding: '14px 16px 14px 18px', borderLeft: `3px solid ${mix(C.gold, 55)}`,
              }}>
                <div style={{ fontSize: T.body, color: C.ink, lineHeight: 2.05, letterSpacing: TRACK.title }}>{p}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 专业层：盘中怎么看 ── */}
        <section style={{ marginTop: 30 }}>
          <SecHead label="盘中怎么看" note="专业层 · 术语照用" />

          {/* 三方四正 */}
          {(san.trine.length > 0 || san.opposite) && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
              background: mix(C.navy, 8), border: `1px solid ${mix(C.navy, 26)}`,
              borderRadius: SHAPE.radiusCard, padding: '12px 14px', marginBottom: 12,
            }}>
              <span style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label }}>{kb.name}的三方四正</span>
              {[
                { n: san.own, tag: '本宫' },
                ...san.trine.map((n) => ({ n, tag: '三合' })),
                { n: san.opposite, tag: '对宫' },
              ].map((x) => {
                const slug = Object.values(PALACE_KB).find((p) => p.name === x.n)?.slug;
                return (
                  <Link key={`${x.tag}-${x.n}`} href={slug ? `/knowledge/palace/${slug}` : '/knowledge'} style={{
                    fontSize: T.micro, textDecoration: 'none', color: C.ink,
                    background: C.card, border: `1px solid ${C.line}`,
                    borderRadius: SHAPE.radiusChip, padding: '3px 10px', letterSpacing: TRACK.title,
                  }}>
                    <span style={{ color: C.ink3, marginRight: 4 }}>{x.tag}</span>{x.n}
                  </Link>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kb.pro.map((b) => (
              <div key={b.title} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
                padding: '13px 16px',
              }}>
                <div style={{ fontFamily: FONT.serif, fontSize: T.body, fontWeight: 700, color: C.ink, letterSpacing: TRACK.label, marginBottom: 5 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 2.0 }}>{b.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 常见现象 ── */}
        <section style={{ marginTop: 28 }}>
          <SecHead label="常见现象" note="用来对号 · 不是断语" />
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '14px 16px' }}>
            {kb.signs.map((s, i) => (
              <div key={i} style={{
                display: 'flex', gap: 9, fontSize: T.sub, color: C.ink2, lineHeight: 1.95,
                padding: '7px 0', borderTop: i ? `1px dashed ${C.line}` : 'none',
              }}>
                <span style={{ color: C.gold, flex: '0 0 auto' }}>·</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 常见误读 ── */}
        <section style={{ marginTop: 26 }}>
          <SecHead label="常见误读" note="最容易读歪的地方" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kb.misread.map((m, i) => (
              <div key={i} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 15px', background: mix(C.cinnabar, 8),
                  fontSize: T.sub, color: C.cinnabar, lineHeight: 1.85,
                }}>
                  <span style={{ letterSpacing: TRACK.label, marginRight: 6 }}>误读</span>{m.wrong}
                </div>
                <div style={{ padding: '11px 15px', fontSize: T.sub, color: C.ink, lineHeight: 2.0 }}>
                  <span style={{ color: SIHUA_COLORS.禄, letterSpacing: TRACK.label, marginRight: 6 }}>正解</span>{m.right}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 主星组合 ── */}
        <section style={{ marginTop: 26 }}>
          <SecHead label="主星落到这一宫" note="同一颗星，宫不同，说法不同" />
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, alignItems: 'start' }}>
            {kb.combos.map((c) => (
              <div key={c.stars} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
                padding: '12px 15px',
              }}>
                <div style={{ fontFamily: FONT.serif, fontSize: T.body, color: C.gold, letterSpacing: TRACK.label, marginBottom: 5 }}>{c.stars}</div>
                <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.95 }}>{c.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 与别的宫的关系 ── */}
        <section style={{ marginTop: 26 }}>
          <SecHead label="宫与宫是连动的" note="单看一格必误" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {kb.rel.map((r) => (
              <Link key={r.slug} href={`/knowledge/palace/${r.slug}`} className="zw-card-hover" style={{
                display: 'block', textDecoration: 'none', background: C.card,
                border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '12px 15px',
              }}>
                <div style={{ fontSize: T.sub, color: C.navy, letterSpacing: TRACK.label, marginBottom: 4 }}>{r.name} →</div>
                <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.95 }}>{r.text}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 经典出处 / 来路 ── */}
        <section style={{ marginTop: 26 }}>
          <SecHead label={kb.classic ? '经典出处' : '读法来路'} note={kb.classic ? '本库收录原文' : '如实说明'} />
          {kb.classic ? (
            <div style={{
              background: mix(C.gold, 10), border: `1px solid ${mix(C.gold, 26)}`,
              borderRadius: SHAPE.radiusCard, padding: '15px 18px',
            }}>
              <div style={{ fontFamily: FONT.serif, fontSize: T.body, color: C.ink, lineHeight: 2.05 }}>{kb.classic.text}</div>
              <div style={{ fontSize: T.micro, color: C.ink3, marginTop: 8 }}>— {kb.classic.source}</div>
            </div>
          ) : (
            <div style={{
              background: mix(C.cinnabar, 8), border: `1px dashed ${mix(C.cinnabar, 26)}`,
              borderRadius: SHAPE.radiusCard, padding: '13px 16px',
              fontSize: T.sub, color: C.ink2, lineHeight: 1.95,
            }}>{kb.classicNote}</div>
          )}
          <div style={{ fontSize: T.micro, color: C.ink3, lineHeight: 1.9, marginTop: 10 }}>
            {PALACE_KB_SOURCE_NOTE}
          </div>
        </section>

        {/* ── 去哪继续 ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="/chart" style={{
            fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
            background: C.navy, color: C.paper,
          }}>起一张盘对照着看</Link>
          <Link href="/knowledge#palaces" style={{
            fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
            color: C.ink2, border: `1px solid ${C.line}`, background: C.card,
          }}>回到十二宫目录</Link>
        </div>
      </div>
    </ZenShell>
  );
}
