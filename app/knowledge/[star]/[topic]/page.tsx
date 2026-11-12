/**
 * /knowledge/[star]/[topic] —— 星曜知识详页
 *
 * 内容来源有两层，顺序明确：
 *   1) 本项目整理的 KB（lib/ziwei/star-kb.ts，14 星 × 13 主题，已补齐）
 *      —— 页面上必须带「编者整理」标签，不冒充原作断语库；
 *   2) 开源包原 STAR_DB（被原作者留空），若日后有人填回，仍可正常渲染。
 *   两层都没有才走缺口说明页，且 dynamicParams 必须放开，否则会直接 404。
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { TopicKey } from '@/lib/ziwei/db-analysis';
import { ALL_TOPICS, getKnowledge, getAllKnowledgeRoutes, STAR_BRIEF_SEO, STAR_TO_SLUG, SLUG_TO_STAR } from '@/lib/seo/knowledge';
import { TOPIC_LABEL, TOPIC_PALACE_NAME } from '@/lib/ziwei/db-analysis';
import { DING_GUI_GE } from '@/lib/ziwei/patterns-dinggui';
import { DING_FU_GE } from '@/lib/ziwei/patterns-dingfu';
import { DING_PIN_GE } from '@/lib/ziwei/patterns-dingpin';
import { DING_ZA_GE } from '@/lib/ziwei/patterns-dingza';
import { getKbEntry, getKbRoutes, KB_SOURCE_NOTE } from '@/lib/ziwei/star-kb';
import { getStarPlain, plainGroupOf, PLAIN_SOURCE_NOTE } from '@/lib/ziwei/star-plain';
import { searchLectures } from '@/lib/lectures/search';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { PageHead } from '@/components/study/ui';

export const dynamicParams = false;

export async function generateStaticParams() {
  // 原 STAR_DB 命中的（现状为空）+ 本项目 KB 已收录的，全部预渲染
  const dbRoutes = getAllKnowledgeRoutes().map((r) => ({ star: r.slug, topic: r.topic }));
  const kbRoutes = getKbRoutes().map((r) => ({ star: r.slug, topic: r.topic }));
  const seen = new Set<string>();
  return [...dbRoutes, ...kbRoutes].filter((r) => {
    const key = `${r.star}/${r.topic}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = SLUG_TO_STAR[slug];
  if (!star) return {};
  const kb = getKbEntry(star, topic as TopicKey);
  if (kb) {
    return {
      title: `${star} · ${TOPIC_LABEL[topic as TopicKey]} · 紫微研习`,
      description: kb.dingdiao,
    };
  }
  const data = getKnowledge(star, topic as TopicKey);
  if (!data.exists) return { title: `${star} · ${TOPIC_LABEL[topic as TopicKey] ?? ''} · 紫微研习` };
  return {
    title: `${star}入${data.palaceName}宫 · ${data.topicLabel} · 紫微研习`,
    description: data.parsed.dingdiao,
  };
}

/** 该星参与的格局（格局名里含星名的，按古籍原样列出） */
function geForStar(star: string) {
  const solo = star.replace('星', '');
  return [...DING_GUI_GE, ...DING_FU_GE, ...DING_PIN_GE, ...DING_ZA_GE].filter((g) => g.name.includes(solo));
}

/** TOPIC_PALACE_NAME 里有的带「宫」有的不带，统一补一次 */
function palaceLabel(name: string | undefined) {
  if (!name) return '';
  return name.endsWith('宫') ? name : `${name}宫`;
}

export default async function KnowledgeDetail({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = SLUG_TO_STAR[slug];
  if (!star) notFound();

  const topicKey = topic as TopicKey;
  const kb = getKbEntry(star, topicKey);
  const data = getKnowledge(star, topicKey);
  const plain = getStarPlain(star);
  const group = plainGroupOf(topicKey);

  // ── 有正文（KB 优先，其次原 STAR_DB）：正常渲染 ──
  const sections: [string, string | undefined, boolean][] = kb
    ? [
      ['一句话定调', kb.dingdiao, true],
      ['核心论断', kb.lundian, false],
      ['命盘依据', kb.yiju, false],
      ['经典出处', kb.chuchu, false],
    ]
    : [
      ['一句话定调', data.parsed.dingdiao, true],
      ['核心论断', data.parsed.lundian, false],
      ['命盘依据', data.parsed.yiju, false],
      ['经典出处', data.parsed.chuchu, false],
    ];

  if (kb || data.exists) {
    const title = kb
      ? `${star} · ${TOPIC_LABEL[topicKey]}`
      : `${star}入${palaceLabel(data.palaceName)}`;
    const siblings = ALL_TOPICS.filter((t) => t !== topicKey);
    const lecHits = searchLectures(star, 40).filter((h) => h.text.length >= 24);

    return (
      <ZenShell activeOverride="/knowledge">
        <div style={{ padding: '30px 28px 64px', maxWidth: 820, margin: '0 auto' }}>
          <PageHead
            tight
            crumbs={[{ href: '/study', label: '研习' }, { href: '/knowledge', label: '星曜知识' }, { label: star }, { label: TOPIC_LABEL[topicKey] }]}
            kicker={`${TOPIC_LABEL[topicKey]} · 对应${palaceLabel(TOPIC_PALACE_NAME[topicKey])}`}
            title={title}
            desc={STAR_BRIEF_SEO[star] ?? ''}
          />

          {/* ── 说人话：星曜档案 + 当前主题的白话读法 ── */}
          {plain && (
            <section style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <span style={{ width: 3, height: 13, background: C.cinnabar, borderRadius: 2 }} />
                <span style={{ fontSize: T.sub, color: C.cinnabar, letterSpacing: TRACK.eyebrow }}>说人话</span>
                <span style={{ fontSize: T.micro, color: C.ink3 }}>编者白话 · 不是断语</span>
              </div>

              <div style={{ background: C.paperDeep, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '16px 18px' }}>
                <div style={{ fontSize: T.bodyLg, color: C.ink, letterSpacing: TRACK.title, lineHeight: 1.7 }}>
                  {plain.oneLine}
                </div>
                <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.95, marginTop: 8 }}>
                  {plain.person}
                </div>

                {/* 喜忌 */}
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
                  {([['喜', plain.likes, SIHUA_COLORS.禄], ['忌', plain.dislikes, C.cinnabar]] as const).map(([label, arr, color]) => (
                    <div key={label} style={{ minWidth: 180 }}>
                      <div style={{ fontSize: T.micro, color, letterSpacing: TRACK.label, marginBottom: 5 }}>{label}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {arr.map((x) => (
                          <span key={x} style={{
                            fontSize: T.micro, color: C.ink2, background: C.card,
                            border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusChip, padding: '2px 9px',
                          }}>{x}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 当前主题的白话 */}
                {group && (
                  <div style={{
                    marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${C.line}`,
                    fontSize: T.sub, color: C.ink, lineHeight: 2,
                  }}>
                    <span style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginRight: 8 }}>
                      {TOPIC_LABEL[topicKey]} · 白话
                    </span>
                    {plain.groups[group]}
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: T.micro, color: C.ink3, lineHeight: 1.8 }}>
                  {PLAIN_SOURCE_NOTE}
                </div>
              </div>
            </section>
          )}

          {sections.map(([t, body, hl]) => body ? (
            <section key={t} style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 3, height: 13, background: C.gold, borderRadius: 2 }} />
                <span style={{ fontSize: T.sub, color: C.gold, letterSpacing: TRACK.eyebrow }}>{t}</span>
              </div>
              <div style={{
                background: hl ? mix(C.gold, 12) : C.card, border: `1px solid ${C.line}`,
                borderRadius: SHAPE.radiusCard, padding: '16px 18px',
                fontSize: hl ? 16 : 14, color: hl ? C.ink : C.ink2, lineHeight: 2.05, whiteSpace: 'pre-wrap',
                fontFamily: t === '经典出处' ? FONT.serif : undefined,
              }}>{body}</div>
            </section>
          ) : null)}

          {/* 来路说明：只在 KB 内容上出现，避免把编者整理误当古籍原文 */}
          {kb && (
            <div style={{
              marginTop: 18, padding: '11px 14px', borderRadius: SHAPE.radiusBtn,
              background: C.paper, border: `1px solid ${C.line}`,
              fontSize: T.eyebrow, color: C.ink3, lineHeight: 1.9,
            }}>
              编者整理 · 依三合派通行口诀。{KB_SOURCE_NOTE}
            </div>
          )}

          {/* 倪师讲义里的相关段落（原文摘引，可回读整集）
              ── 阅读取向：讲义是「读」的，不是「扫」的，所以字号提到 16、行高 2.0，
                 集号做成 eyebrow 小标，条目用左金线卡片，一眼分得清「哪一集说的什么」。 */}
          {lecHits.length > 0 && (
            <section style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ width: 3, height: 13, background: C.gold, borderRadius: 2 }} />
                <span style={{ fontFamily: FONT.display, fontSize: T.body, letterSpacing: TRACK.label, color: C.ink }}>
                  倪师讲义里讲到「{star}」
                </span>
                <span style={{ fontSize: T.micro, color: C.ink3 }}>
                  共 {lecHits.length} 处 · 原文摘引，点整集可回读
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lecHits.slice(0, 4).map((h, i) => (
                  <Link
                    key={i}
                    href={`/lectures/${h.lectureIdx}`}
                    className="zw-card-hover"
                    style={{
                      display: 'block', textDecoration: 'none', color: 'inherit',
                      background: C.card, border: `1px solid ${C.line}`,
                      borderLeft: `3px solid ${mix(C.gold, 55)}`,
                      borderRadius: SHAPE.radiusCard, padding: '15px 18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
                      <span style={{ fontSize: T.micro, color: C.gold, letterSpacing: TRACK.eyebrow }}>
                        第 {h.lectureNo} 集
                      </span>
                      <span style={{ fontSize: T.sub, color: C.ink2 }}>{h.lectureName}</span>
                      <span style={{ fontSize: T.micro, color: C.ink3, marginLeft: 'auto' }}>回读整集 →</span>
                    </div>
                    <div
                      style={{
                        fontFamily: FONT.serif, fontSize: 16, color: C.ink, lineHeight: 2.0,
                        letterSpacing: TRACK.title,
                      }}
                      dangerouslySetInnerHTML={{ __html: h.snippet }}
                    />
                  </Link>
                ))}
              </div>

              {lecHits.length > 4 && (
                <Link
                  href={`/library/search?q=${encodeURIComponent(star)}`}
                  style={{
                    fontSize: T.sub, color: C.navy, textDecoration: 'none',
                    display: 'inline-block', marginTop: 10, letterSpacing: TRACK.title,
                  }}
                >在讲义全文里搜「{star}」的其余 {lecHits.length - 4} 处 →</Link>
              )}
            </section>
          )}

          {/* 同一星的其它主题 */}
          <section style={{ marginTop: 26 }}>
            <div style={{ fontSize: T.meta, letterSpacing: TRACK.label, color: C.ink2, marginBottom: 9 }}>
              {star}的其它主题
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {siblings.map((t) => {
                const has = !!getKbEntry(star, t) || getKnowledge(star, t).exists;
                return (
                  <Link
                    key={t}
                    href={`/knowledge/${slug}/${t}`}
                    style={{
                      fontSize: T.sub, padding: '6px 13px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
                      color: has ? C.ink2 : C.ink3, background: C.card,
                      border: `1px solid ${C.line}`, opacity: has ? 1 : 0.55,
                    }}
                  >{TOPIC_LABEL[t]}</Link>
                );
              })}
            </div>
          </section>

          <div style={{ display: 'flex', gap: 8, marginTop: 26, flexWrap: 'wrap' }}>
            <Link href="/chart" style={{
              fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
              background: C.navy, color: C.paper,
            }}>起自己的盘看{star}落哪</Link>
            <Link href="/library" style={{
              fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
              color: C.ink2, border: `1px solid ${C.line}`, background: C.card,
            }}>查古籍原文</Link>
            <Link href="/knowledge" style={{
              fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
              color: C.ink2, border: `1px solid ${C.line}`, background: C.card,
            }}>返回知识总览</Link>
          </div>
        </div>
      </ZenShell>
    );
  }

  // ── 两层都没有：诚实说明 + 可用的替代内容 ──
  const ges = geForStar(star);

  return (
    <ZenShell activeOverride="/knowledge">
      <div style={{ padding: '30px 28px 64px', maxWidth: 820, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { href: '/knowledge', label: '星曜知识' }, { label: star }, { label: TOPIC_LABEL[topicKey] ?? topic }]}
          title={star}
          desc={STAR_BRIEF_SEO[star] ?? ''}
        />

        <div style={{
          marginTop: 20, padding: '16px 18px', borderRadius: SHAPE.radiusCard,
          background: mix(C.gold, 12), border: `1px solid ${C.gold}`,
        }}>
          <div style={{ fontSize: T.sub, color: C.ink, letterSpacing: TRACK.title, marginBottom: 6 }}>
            这一页还没写
          </div>
          <div style={{ fontSize: T.meta, color: C.ink2, lineHeight: 2 }}>
            「{star} · {TOPIC_LABEL[topicKey] ?? topic}」这一条尚未收录，这里不编造内容。
            其余主题已可读，可从下方进入。
          </div>
        </div>

        {ges.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <div style={{ fontSize: T.sub, letterSpacing: TRACK.label, color: C.ink, marginBottom: 10 }}>
              {star}参与的格局（古籍原文 · 可用来对照自己的盘）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ges.map((g) => (
                <div key={`${g.no}-${g.name}`} style={{
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: T.body, color: C.ink, letterSpacing: TRACK.title }}>{g.name}</div>
                  <div style={{ fontSize: T.meta, color: C.ink3, lineHeight: 1.85, marginTop: 4 }}>{g.note}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
          <Link href="/chart" style={{
            fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
            background: C.navy, color: C.paper,
          }}>起自己的盘看{star}落哪</Link>
          <Link href="/library" style={{
            fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
            color: C.ink2, border: `1px solid ${C.line}`, background: C.card,
          }}>查古籍原文</Link>
          <Link href={`/knowledge/${STAR_TO_SLUG[star]}/overview`} style={{
            fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
            color: C.ink2, border: `1px solid ${C.line}`, background: C.card,
          }}>返回该星总览</Link>
        </div>
      </div>
    </ZenShell>
  );
}
