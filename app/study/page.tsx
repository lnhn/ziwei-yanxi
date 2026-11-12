'use client';

/**
 * /study —— 研习首页
 *
 * 这一版按「打开就能接着做事」重排：
 *   首屏只留两个动作 —— 开始排盘（主操作）/ 继续上次（有记录就直接带参回盘）；
 *   下面才是今天的阅读、练习进度与按用途分的入口，同一个入口不重复出现两次。
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ALL_STARS, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { FONT, T, TRACK, SHAPE, NUMERIC } from '@/components/study/type';
import { loadProgress, weakestStep, STEP_LABELS, type PracticeProgress, EMPTY_PROGRESS } from '@/lib/study/progress';
import { loadLastBirth } from '@/lib/study/last-chart';
import { listRecords, type ReadingRecord } from '@/lib/study/reading-history';
import { chartQuery } from '@/lib/study/chart-link';
import type { BirthInfo } from '@/lib/ziwei/types';
import { Card, PageHead, Section, Btn, Badge, ListRow, Empty } from '@/components/study/ui';

function todayStar(): string {
  const d = new Date();
  const idx = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % ALL_STARS.length;
  return ALL_STARS[idx];
}

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function birthText(b: BirthInfo): string {
  const h = b.hour;
  const label = h === 0 ? '早子时' : h === 11 ? '亥时' : `${BRANCH[h]}时`;
  return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')} ${label} · ${b.gender === 'female' ? '女' : '男'}${b.city ? ` · ${b.city}` : ''}`;
}

export default function StudyHome() {
  const [star, setStar] = useState<string>('紫微');
  const [prog, setProg] = useState<PracticeProgress>(EMPTY_PROGRESS);
  const [last, setLast] = useState<BirthInfo | null>(null);
  const [recent, setRecent] = useState<ReadingRecord[]>([]);
  const [dateText, setDateText] = useState('');

  useEffect(() => {
    setStar(todayStar());
    setProg(loadProgress());
    setLast(loadLastBirth());
    setRecent(listRecords().slice(0, 3));
    setDateText(new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }));
  }, []);

  const weak = weakestStep(prog);
  const slug = STAR_TO_SLUG[star] ?? 'ziwei';
  const brief = STAR_BRIEF_SEO[star] ?? '';

  return (
    <div style={{ padding: '30px 28px 64px', maxWidth: 1080, margin: '0 auto' }}>
      <PageHead
        tight
        title="研习首页"
        desc="以紫微斗数为门：先看懂盘面，再挂上地理与时辰，最后才谈人的选择。"
        actions={<Btn href="/chart" primary>开始排盘</Btn>}
      />

      {/* ── 首屏：开始 / 继续 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]" style={{ gap: 14 }}>
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label }}>起一张新盘</div>
            <h2 style={{
              fontFamily: FONT.display, fontSize: T.h1, margin: '8px 0 0', color: C.ink, letterSpacing: '0.03em',
            }}>输入生辰，看出盘面</h2>
            <p style={{ margin: '8px 0 0', fontSize: T.body, color: C.ink2, lineHeight: 1.8 }}>
              农历换算、真太阳时、四化与宫位一次算清；出盘后就在同一页解盘，顺手落一条记录。
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn href="/chart" primary>开始排盘</Btn>
              <Btn href="/study/learn">入门学习 · 继续上次</Btn>
            <Btn href="/cases">看命例实批</Btn>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 10 }}>继续上次</div>
          {last ? (
            <>
              <div style={{ fontSize: T.body, color: C.ink, fontFamily: FONT.mono, ...NUMERIC, lineHeight: 1.7 }}>
                {birthText(last)}
              </div>
              {recent[0] && (
                <div style={{ fontSize: T.sub, color: C.ink3, marginTop: 8, lineHeight: 1.8 }}>
                  上次推演 {recent[0].hits} 次 · 命宫 {recent[0].meta.mingBranch} · {recent[0].meta.ju}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <Btn href={`/chart?${chartQuery(last)}`} primary>接着看这张盘</Btn>
                <Btn href="/history" quiet>解盘历史</Btn>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: T.body, color: C.ink2, lineHeight: 1.8 }}>
                还没有起过盘。起一张之后，这里会记住生辰，下次一点就回到原盘。
              </p>
              <div style={{ marginTop: 14 }}><Btn href="/chart" primary>先起第一张盘</Btn></div>
            </>
          )}
        </Card>
      </div>

      {/* ── 今日一星 ── */}
      <Section title="今日一星" hint={dateText} index="01"
        aside={<Btn href={`/knowledge/${slug}/overview`} size="sm" quiet>读全文 →</Btn>}
      >
        <Card>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: FONT.display, fontSize: T.hero, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>
                  {star}
                </span>
                <Badge>十四主星</Badge>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: T.body, color: C.ink2, lineHeight: 1.85 }}>
                {brief || '未收录简介，进入知识库查看完整论断。'}
              </p>
            </div>
            {/* 十二宫缩影：中点即进盘页 —— 不再摆一排点不动的格子 */}
            <Link href="/chart" style={{
              flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(4, 1fr)', gap: 3, width: 118, textDecoration: 'none',
            }} title="去起盘排盘">
              {Array.from({ length: 16 }, (_, i) => {
                const center = i === 5 || i === 6 || i === 9 || i === 10;
                if (center) {
                  return <div key={i} style={{
                    gridArea: i === 5 ? '2 / 2 / 4 / 4' : 'auto', borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: C.gold, letterSpacing: '0.08em',
                    border: `1px solid ${mix(C.gold, 16)}`,
                  }}>{i === 5 ? '起盘 →' : ''}</div>;
                }
                return <div key={i} style={{
                  height: 15, borderRadius: 2,
                  background: mix(C.navy, 8), border: `1px solid ${mix(C.gold, 14)}`,
                }} />;
              })}
            </Link>
          </div>
        </Card>
      </Section>

      {/* ── 七步进度 ── */}
      <Section title="手工推盘七步" hint="练一次记一次" index="02"
        aside={<Btn href="/study/practice" size="sm">去练一盘 →</Btn>}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
          <Metric value={prog.runs} unit="张" label="已练盘" />
          <Metric value={prog.fullPass} unit="张" label="七步全对" accent />
          <Metric value={prog.wrongTotal} unit="条" label="累计错项" />
          <Metric value={weak ? Math.round(weak.rate * 100) : 0} unit="%" label={weak ? `最弱：${weak.label}` : '最弱：待练'} />
        </div>

        <Card dense style={{ marginTop: 12 }}>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 10 }}>
            {STEP_LABELS.map((label, i) => {
              const total = prog.stepTotal[i] ?? 0;
              const ok = prog.stepOk[i] ?? 0;
              const rate = total ? Math.round((ok / total) * 100) : -1;
              return (
                <div key={label} style={{ padding: '9px 11px', border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn, background: C.paper }}>
                  <div style={{ fontSize: T.sub, color: C.ink2 }}>{i + 1}. {label}</div>
                  <div style={{ marginTop: 6, height: 3, borderRadius: 3, background: mix(C.navy, 8) }}>
                    <div style={{
                      height: 3, borderRadius: 3, width: `${rate < 0 ? 0 : rate}%`,
                      background: rate >= 80 ? SIHUA_COLORS.禄 : rate >= 50 ? C.gold : rate > 0 ? C.cinnabar : C.line,
                    }} />
                  </div>
                  <div style={{ fontSize: T.micro, color: C.ink3, marginTop: 5, ...NUMERIC }}>
                    {rate < 0 ? '未练' : `${rate}%（${ok}/${total}）`}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </Section>

      {/* ── 最近解盘 ── */}
      <Section title="最近的盘" hint="本地研究库" index="03"
        aside={<Btn href="/history" size="sm" quiet>全部记录 →</Btn>}
      >
        {recent.length ? (
          <Card dense style={{ padding: '8px 10px' }}>
            {recent.map((r) => (
              <ListRow
                key={r.id}
                href={`/history`}
                title={<span style={{ fontFamily: FONT.mono, ...NUMERIC, fontSize: T.sub }}>{birthText(r.birth)}</span>}
                meta={`命宫 ${r.meta.mingBranch} · ${r.meta.ju} · ${r.meta.mingStars.join('/') || '空宫'}`}
                aside={<Badge tone="gold">推演 {r.hits} 次</Badge>}
              />
            ))}
          </Card>
        ) : (
          <Empty
            title="还没有推演记录"
            desc="在排盘页展开一次解盘，这张盘就会自动落进本机的研究库。"
            action={<Btn href="/chart" primary size="sm">去起盘</Btn>}
          />
        )}
      </Section>

      {/* ── 按用途分的入口 ── */}
      <Section title="按用途找" index="04">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12 }}>
          <GroupCard title="查" desc="星曜、宫位、古籍原典" items={[
            { href: '/knowledge', label: '星曜知识库' },
            { href: '/library', label: '古籍原典' },
            { href: '/lectures', label: '倪师讲义' },
          ]} />
          <GroupCard title="练" desc="手工推演与命例对照" items={[
            { href: '/study/practice', label: '手工推演七步' },
            { href: '/cases', label: '命例实批' },
            { href: '/history', label: '解盘历史' },
          ]} />
          <GroupCard title="记" desc="自己的笔记与提示词" items={[
            { href: '/study/notes', label: '研习手记' },
            { href: '/study/prompts', label: '解盘提示词' },
          ]} />
        </div>
      </Section>

      <p style={{ marginTop: 26, fontSize: T.meta, color: C.ink3, lineHeight: 1.9 }}>
        参考倪海厦《天纪》三合派体系：命盘只讲倾向，选择权在人。
      </p>
    </div>
  );
}

function Metric({ value, unit, label, accent }: { value: number; unit: string; label: string; accent?: boolean }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: T.h1, fontWeight: 700, color: accent ? C.gold : C.ink, ...NUMERIC, lineHeight: 1.2 }}>{value}</span>
        <span style={{ fontSize: T.micro, color: C.ink3 }}>{unit}</span>
      </div>
      <div style={{ fontSize: T.micro, color: C.ink3, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function GroupCard({ title, desc, items }: { title: string; desc: string; items: { href: string; label: string }[] }) {
  return (
    <Card dense>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: FONT.display, fontSize: T.h3, color: C.ink }}>{title}</span>
        <span style={{ fontSize: T.micro, color: C.ink3 }}>{desc}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((it) => (
          <Link key={it.href} href={it.href} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 2px', fontSize: T.body, color: C.ink2, textDecoration: 'none',
            borderBottom: `1px solid ${mix(C.line, 55)}`,
          }}>
            <span>{it.label}</span>
            <span style={{ color: C.ink3, fontSize: T.sub }}>→</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
