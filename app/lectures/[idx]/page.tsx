/**
 * /lectures/[idx] —— 单集讲义正文（idx 为数组序号，从 1 起）
 *
 * 第 8 集在原书里分成「十二命盘」与「命例实批」两段，集号重号，
 * 所以路由用序号而非集号，页面标题仍显示原集号。
 *
 * 阅读版式按「长文」设计：行宽收到 33em、字号 17.5、行高 2.0、首行缩进 2em，
 * 段与段之间留 0.6em，眼睛不需要靠字距去切段；命例另用卡片承接。
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LECTURES, LECTURE_SOURCE, lectureChars } from '@/lib/lectures/tianji';
import ZenShell from '@/components/study/ZenShell';
import AiAssist from '@/components/study/AiAssist';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { FONT, T, SHAPE, NUMERIC } from '@/components/study/type';
import { PageHead, Section, Card, Btn } from '@/components/study/ui';

export const dynamicParams = false;

export function generateStaticParams() {
  return LECTURES.map((_, i) => ({ idx: String(i + 1) }));
}

export async function generateMetadata({ params }: { params: Promise<{ idx: string }> }) {
  const { idx } = await params;
  const lec = LECTURES[Number(idx) - 1];
  if (!lec) return {};
  return {
    title: `第${lec.no}集 ${lec.name} · ${lec.subtitle} · 倪师讲义`,
    description: lec.paragraphs[0]?.slice(0, 90) ?? '',
  };
}

export default async function LecturePage({ params }: { params: Promise<{ idx: string }> }) {
  const { idx } = await params;
  const i = Number(idx) - 1;
  const lec = LECTURES[i];
  if (!lec) notFound();
  const prev = i > 0 ? LECTURES[i - 1] : null;
  const next = i < LECTURES.length - 1 ? LECTURES[i + 1] : null;
  const body = lec.paragraphs.filter((p) => !lec.cases.some((cs) => cs.raw === p));

  return (
    <ZenShell activeOverride="/lectures">
      <div style={{ padding: '30px 28px 64px', maxWidth: 860, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[
            { href: '/study', label: '研习' },
            { href: '/lectures', label: '倪师讲义' },
            { label: `第 ${lec.no} 集` },
          ]}
          kicker={lec.subtitle}
          title={`第 ${lec.no} 集 · ${lec.name}`}
          desc={`${LECTURE_SOURCE} · p${lec.pageStart}–${lec.pageEnd} · ${lec.paragraphs.length} 段 / ${lectureChars(lec)} 字。`}
        />

        <div style={{ marginBottom: 14 }}>
          <AiAssist
            task="lecture"
            cta="AI 提炼本集要点"
            note="骨架 · 关键口径 · 可操作清单 · 三道自测题"
            cacheKey={`lec-${i + 1}`}
            vars={{
              lecture: `第${lec.no}集 ${lec.name}（${lec.subtitle}）`,
              text: lec.paragraphs.join('\n').slice(0, 6000),
            }}
          />
        </div>

        {/* 正文：长文阅读区 */}
        <article style={{
          background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
          padding: '30px clamp(20px, 5vw, 44px) 34px',
        }}>
          {body.map((p, k) => (
            <p key={k} style={{
              fontFamily: FONT.serif, fontSize: 17.5, color: C.ink, lineHeight: 2.0,
              margin: '0 0 1.05em', letterSpacing: '0.02em',
              textIndent: '2em', maxWidth: '33em',
            }}>{p}</p>
          ))}
        </article>

        {lec.cases.length > 0 && (
          <Section
            index="附"
            title={`命例实批 · ${lec.cases.length} 例`}
            hint="讲义原话，缺月日时辰"
            style={{ marginTop: 26 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lec.cases.map((cs) => (
                <Card key={cs.id} dense style={{ background: mix(C.gold, 6) }}>
                  <div style={{ display: 'flex', gap: '6px 12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    {cs.year > 1911 && (
                      <span style={{ fontSize: T.sub, color: C.ink, fontFamily: FONT.mono, ...NUMERIC }}>{cs.year}</span>
                    )}
                    <span style={{ fontSize: T.sub, color: C.ink3, fontFamily: FONT.mono }}>民国 {cs.rocYear} 年</span>
                    {cs.gender && <span style={{ fontSize: T.sub, color: C.ink2 }}>{cs.gender}</span>}
                    {cs.ju && <span style={{ fontSize: T.sub, color: C.ink2 }}>{cs.ju}</span>}
                    {cs.ziweiPos && <span style={{ fontSize: T.sub, color: C.ink2 }}>紫微在{cs.ziweiPos}</span>}
                    {cs.mingGong && <span style={{ fontSize: T.sub, color: C.ink2 }}>命宫在{cs.mingGong}</span>}
                  </div>
                  <div style={{ fontFamily: FONT.serif, fontSize: T.serif - 1, color: C.ink2, lineHeight: 1.9, marginTop: 6 }}>
                    {cs.raw}
                  </div>
                </Card>
              ))}
            </div>
            <div style={{ fontSize: T.sub, color: C.ink3, marginTop: 10, lineHeight: 1.85 }}>
              讲义只给了年、性别与局数，没有月日时辰，所以这些例子不能直接当排盘校验样本；
              它们的用处是学「怎么从盘面读出结论」。
            </div>
          </Section>
        )}

        <div style={{
          marginTop: 26, paddingTop: 16, borderTop: `1px solid ${C.line}`,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {prev && <Btn href={`/lectures/${i}`} size="sm" quiet>← 第 {prev.no} 集 · {prev.name}</Btn>}
          {next && <Btn href={`/lectures/${i + 2}`} size="sm" quiet>第 {next.no} 集 · {next.name} →</Btn>}
          <Btn href="/cases" size="sm" quiet style={{ marginLeft: 'auto' }}>命例实批一览</Btn>
        </div>
      </div>
    </ZenShell>
  );
}
