/**
 * /cases —— 命例实批一览
 *
 * 全部来自《天纪》讲义里的「命例实批」段，按集归属列出。
 * 讲义只给年/性别/局数，多缺月日时辰，所以这里定位为「读断法的参照」，
 * 不冒充排盘校验样本：因此每行只给「原集 · 年份 · 性别 · 局数 · 紫微位」，
 * 不摆「查看命盘」这种点不动的按钮 —— 缺月日时起不了盘。
 */

import Link from 'next/link';
import { ALL_CASES, LECTURES } from '@/lib/lectures/tianji';
import ZenShell from '@/components/study/ZenShell';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { FONT, T, SHAPE, NUMERIC } from '@/components/study/type';
import { PageHead, Section, Card, Btn, Banner } from '@/components/study/ui';

export const metadata = {
  title: '命例实批一览 · 天纪紫微斗数案例 · 紫微研习',
  description: '《倪海厦·天纪》讲义中的紫微斗数命例实批，按集汇总，附年份、性别、五行局、紫微位与命宫。',
};

export default function CasesPage() {
  const withCases = LECTURES.filter((l) => l.cases.length > 0);

  return (
    <ZenShell activeOverride="/cases">
      <div style={{ padding: '30px 28px 64px', maxWidth: 1020, margin: '0 auto' }}>
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { label: '命例实批' }]}
          title="命例实批"
          desc={`共 ${ALL_CASES.length} 例，出自倪师《天纪》讲义「命例实批」各集；参数照原文录，缺什么不补。`}
          actions={<Btn href="/lectures" quiet>回讲义目录</Btn>}
        />

        <Banner tone="warn" title="先说明">
          这些例子多数只有「民国某年、性别、五行局、紫微在某宫」，缺月日时辰 —— 因此<b>不能</b>当排盘引擎的校验样本；
          但可以当读盘的参照：先看倪师从哪个宫读出什么结论，再回自己的盘上找同样的结构。
        </Banner>

        {withCases.map((l, i) => (
          <Section
            key={l.no}
            index={String(i + 1).padStart(2, '0')}
            title={`第 ${l.no} 集 · ${l.name}`}
            hint={`${l.cases.length} 例`}
            aside={<Btn href={`/lectures/${LECTURES.indexOf(l) + 1}`} size="sm" quiet>读这一集 →</Btn>}
          >
            <Card dense style={{ padding: '6px 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {l.cases.map((cs, k) => (
                  <div key={cs.id} style={{
                    padding: '12px 10px',
                    borderBottom: k === l.cases.length - 1 ? 'none' : `1px solid ${mix(C.line, 60)}`,
                  }}>
                    {/* 出生资料一行：年份、性别、局数、紫微、命宫 —— 缺项不补，就空着 */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px 14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: T.micro, color: C.gold, fontFamily: FONT.mono, minWidth: 20, ...NUMERIC }}>
                        {String(k + 1).padStart(2, '0')}
                      </span>
                      {cs.year > 1911 && (
                        <span style={{ fontSize: T.sub, color: C.ink, fontFamily: FONT.mono, ...NUMERIC }}>{cs.year}</span>
                      )}
                      <span style={{ fontSize: T.sub, color: C.ink3, fontFamily: FONT.mono }}>民国 {cs.rocYear} 年</span>
                      {cs.gender && <span style={{ fontSize: T.sub, color: C.ink2 }}>{cs.gender}</span>}
                      {cs.ju && <span style={{ fontSize: T.sub, color: C.ink2 }}>{cs.ju}</span>}
                      {cs.ziweiPos && <span style={{ fontSize: T.sub, color: C.ink2 }}>紫微在{cs.ziweiPos}</span>}
                      {cs.mingGong && <span style={{ fontSize: T.sub, color: C.ink2 }}>命宫在{cs.mingGong}</span>}
                      {(!cs.year || !cs.gender) && <span style={{ fontSize: T.micro, color: C.cinnabar }}>原文缺项</span>}
                    </div>
                    <div style={{
                      fontFamily: FONT.serif, fontSize: T.serif - 1, color: C.ink2, lineHeight: 1.8, marginTop: 6,
                    }}>
                      {cs.raw}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>
        ))}

        <div style={{ marginTop: 26, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn href="/chart" primary>起自己的盘，找同样的结构</Btn>
          <Link href="/lectures" style={{
            fontSize: T.sub, padding: '9px 18px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
            color: C.ink2, background: C.card, border: `1px solid ${C.line}`,
          }}>回讲义目录</Link>
        </div>
      </div>
    </ZenShell>
  );
}
