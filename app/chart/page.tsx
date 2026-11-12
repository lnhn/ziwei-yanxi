'use client';

/**
 * /chart —— 起盘排盘
 *
 * 内核完全沿用：generateChart()（iztro 安星）+ lunar-javascript 农历层 + 四化/大限。
 * 这一页要同时成立在两种底上：日读的纸（纸宣/绢沙）与夜读的墨（玄墨/石青/绛紫/松烟）。
 * 所以色值一个都不写死，全部走 --zw-* 变量；结构上只做三件事：
 *   1) 字号比别处大一档 —— 盘面信息密度高，小字在这里就是受罪；
 *   2) 宫位按性质染色（命宫金、三方青、煞聚赤、空宫压暗），一眼分得清主次；
 *   3) 底色加一层极淡的斜向晕光，让整张盘像搁在灯下的一页纸上。
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import entry from './entry.module.css';
import { useRouter } from 'next/navigation';
import { generateChart } from '@/lib/ziwei/algorithm';
import { loadSchoolConfig } from '@/lib/ziwei/school-config';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { palaceSlugOf } from '@/lib/ziwei/palace-kb';
import { readChartQuery } from '@/lib/study/chart-link';
import { saveLastBirth } from '@/lib/study/last-chart';
import { saveRecord, makeRecord } from '@/lib/study/reading-history';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import ZenShell from '@/components/study/ZenShell';
import { FONT, T, TRACK, SHAPE } from '@/components/study/type';
import LightBirthForm from '@/components/study/LightBirthForm';
import ChartBoardDark from '@/components/study/ChartBoardDark';
import ReadingPanel from '@/components/study/ReadingPanel';
import LifeKline from '@/components/study/LifeKline';
import { PAPER_COLORS as C, SURFACE, SIHUA_COLORS, TINT, mix } from '@/components/study/paper';
import { PageHead, Btn, FactRow } from '@/components/study/ui';

export default function ChartPage() {
  const router = useRouter();
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  /** 起盘即落库：hits>0 表示这张盘已在解盘历史里，数字是第几次推演 */
  const [historyHits, setHistoryHits] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  /** 这张盘是怎么起的 —— 接盘时原样带过去，解盘页不必再填一遍生辰 */
  const [birth, setBirth] = useState<BirthInfo | null>(null);
  /** 是否在本页展开解盘：排盘与解盘是同一件事的两半，不该逼人换页重起一张盘 */
  const [readingOpen, setReadingOpen] = useState(false);
  /** 是否展开人生 K 线：解盘讲「这一格怎么读」，K 线讲「哪一年」 */
  const [klineOpen, setKlineOpen] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const readingRef = useRef<HTMLDivElement | null>(null);
  const klineRef = useRef<HTMLDivElement | null>(null);

  const palace = selected !== null ? chart?.palaces.find((p) => p.branch === selected) : null;

  function openSection(which: 'reading' | 'kline') {
    if (which === 'reading') {
      setReadingOpen(true);
      window.setTimeout(() => readingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else {
      setKlineOpen(true);
      window.setTimeout(() => klineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }

  function locatePalace(branch: number) {
    setSelected(branch);
    boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 从解盘页回来、或点「在盘上看这一宫」时，地址里带着这张盘的成因（可能还带 branch）：
  // 有就直接复原同一张盘，不再让用户重填一遍
  useEffect(() => {
    const info = readChartQuery(window.location.search);
    if (!info) return;
    try {
      const c = generateChart(info, { leapMonth: loadSchoolConfig().leapMonth });
      setChart(c);
      setBirth(info);
      saveLastBirth(info);
      // 起盘即落库（同生辰累计次数）：解盘历史页据此回看与统计
      setHistoryHits(saveRecord(makeRecord(info, c)));
      const b = Number(new URLSearchParams(window.location.search).get('branch'));
      setSelected(Number.isFinite(b) && b >= 0 && b <= 11 ? b : c.mingGongBranch);
    } catch {
      // 参数坏了就退回表单，不硬撑
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ZenShell activeOverride="/chart">
      <div style={{ padding: '30px 28px 64px', maxWidth: chart ? 1460 : 1144, margin: '0 auto', position: 'relative' }}>
        {/* ── 页头：与全站共用一套（面包屑 + 标题 27 + 主操作）── */}
        <PageHead
          tight
          crumbs={[{ href: '/study', label: '研习' }, { label: '起盘排盘' }]}
          title="起盘排盘"
          desc="输入生辰即出盘；真太阳时按出生地经度校正，点任一宫位看细节。"
          actions={chart ? (
            <>
              <Btn onClick={() => openSection('reading')} primary>
                {readingOpen ? '↓ 回到解盘' : '解这张盘'}
              </Btn>
              <Btn onClick={() => openSection('kline')} quiet>人生 K 线</Btn>
              <Btn href="/history" quiet>解盘历史</Btn>
            </>
          ) : (
            <Btn href="/study/practice" quiet>不会推？看七步手册</Btn>
          )}
        />

        {/* ── 出生资料摘要：出盘后收成一行，随时可「修改」 ── */}
        {chart && birth && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px 18px', flexWrap: 'wrap',
            padding: '10px 14px', borderRadius: SHAPE.radiusBtn,
            background: C.card, border: `1px solid ${C.line}`, marginBottom: 16,
          }}>
            <span style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label }}>出生资料</span>
            <FactRow items={[
              { label: '公历', value: `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')}` },
              { label: '时辰', value: `${BRANCHES[birth.hour]}时` },
              { label: '性别', value: birth.gender === 'female' ? '女' : '男' },
              { label: '农历', value: `${chart.lunarInfo.lunarYear}年${chart.lunarInfo.isLeapMonth ? '闰' : ''}${Math.abs(chart.lunarInfo.lunarMonth)}月${chart.lunarInfo.lunarDay}日` },
              ...(birth.city ? [{ label: '出生地', value: birth.city }] : []),
              { label: '年干支', value: `${STEMS[chart.lunarInfo.yearStem]}${BRANCHES[chart.lunarInfo.yearBranch]}` },
              { label: '五行局', value: chart.wuxingJuName ?? '—' },
            ]} />
            <button
              type="button"
              onClick={() => { setChart(null); setSelected(null); setBirth(null); setReadingOpen(false); setKlineOpen(false); }}
              style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: T.sub, color: C.ink2,
                background: 'transparent', border: `1px solid ${C.line}`,
              }}
            >修改</button>
          </div>
        )}

        {!chart ? (
          <section className={entry.card} aria-label="出生资料">
            <div className={entry.form}>
              <h2>填写出生资料</h2>
                <LightBirthForm
                  tone={{
                    card: 'transparent', paper: C.paper, line: C.line,
                    ink: C.ink, ink2: C.ink2, ink3: C.ink3, accent: C.navy,
                  }}
                  onSubmit={(info: BirthInfo) => {
                    const c = generateChart(info, { leapMonth: loadSchoolConfig().leapMonth });
                    setChart(c);
                    setSelected(c.mingGongBranch);
                    setBirth(info);
                    saveLastBirth(info);
                    setHistoryHits(saveRecord(makeRecord(info, c)));
                    setReadingOpen(false);
                    setKlineOpen(false);
                  }}
                />
            </div>
            <figure className={entry.art}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/suzhou-star-chart.jpg" alt="宋代苏州天文图拓片，星点与星官连线刻在圆形星图中" />
              <figcaption>
                <a href="https://commons.wikimedia.org/wiki/File:Suchow_star_chart_rubbing.jpg" target="_blank" rel="noreferrer">
                  苏州天文图
                </a>
                <span>南宋 · 石刻拓片</span>
              </figcaption>
            </figure>
          </section>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'hidden', marginTop: 28 }}>
          <div
            className="zw-chart-cols"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 392px)',
              gap: 22, alignItems: 'start', paddingBottom: 6,
            }}
          >
            {/* ── 盘面 ── */}
            <div ref={boardRef} style={{ scrollMarginTop: 20 }}>
              <ChartBoardDark chart={chart} selectedBranch={selected} onSelect={setSelected} />
              <Btn href="/study/learn?start=1">先学怎么读盘</Btn>

              {/* 盘下注解：一行干支、一行提示，小字但不糊 */}
              <div style={{
                marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 22px',
                fontSize: T.sub, color: C.ink3, lineHeight: 1.9, letterSpacing: TRACK.body,
              }}>
                <span>农历 {chart.lunarInfo.lunarYear} 年{chart.lunarInfo.isLeapMonth ? '闰' : ''}{Math.abs(chart.lunarInfo.lunarMonth)}月{chart.lunarInfo.lunarDay}日</span>
                <span>年干支 {STEMS[chart.lunarInfo.yearStem]}{BRANCHES[chart.lunarInfo.yearBranch]}</span>
                <span>当前 {chart.currentAge} 岁</span>
                <span style={{ color: C.gold }}>点宫位可高亮其三方四正</span>
                {historyHits > 0 && (
                  <Link href="/history" style={{ color: C.ink3, textDecoration: 'none' }}>
                    已存入解盘历史{historyHits > 1 ? `（第 ${historyHits} 次推演）` : ''} · 去研究库 →
                  </Link>
                )}
              </div>
            </div>

            {/* ── 右栏 ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 宫位详情：顶部一条金色细线，表示这一宫在盘上的身份 */}
              <div className="zw-glass" style={{
                borderRadius: SHAPE.radiusCard,
                overflow: 'hidden',
              }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${C.gold}, ${mix(C.gold, 0)})` }} />
                <div style={{ padding: '22px 22px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: FONT.serif, fontSize: 26, letterSpacing: '0.1em', color: C.ink,
                      }}>
                        {palace ? palace.name : '选择宫位'}
                      </span>
                      {palace && palaceSlugOf(palace.name) && (
                        <Link href={`/knowledge/palace/${palaceSlugOf(palace.name)}`} style={{
                          fontSize: T.micro, color: C.gold, textDecoration: 'none', letterSpacing: '0.14em',
                          borderBottom: `1px dashed ${mix(C.gold, 45)}`, paddingBottom: 1,
                        }}>这一宫详解 →</Link>
                      )}
                    </div>
                    {palace && (
                      <span style={{ fontSize: T.sub, color: C.ink3, letterSpacing: '0.1em', fontFamily: FONT.mono }}>
                        {STEMS[palace.stem]}{BRANCHES[palace.branch]} · {palace.daXianAge ? `${palace.daXianAge[0]}–${palace.daXianAge[1]} 岁` : '—'}
                      </span>
                    )}
                  </div>

                  {!palace && (
                    <div style={{ fontSize: T.sub, color: C.ink3, lineHeight: 2, letterSpacing: TRACK.body }}>
                      点盘上任一宫，这里会展开该宫的星曜、亮度、自化与大限 —— 上方盘面同时把它的三方四正点起来。
                    </div>
                  )}

                  {palace && (
                    <>
                      {/* 星曜：按类型着色 —— 主星墨、煞星朱、四化四色 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                        {palace.stars.length === 0 && (
                          <span style={{ fontSize: T.body, color: C.ink3 }}>
                            空宫，借对宫 {palace.borrowedFromName ?? '—'}
                          </span>
                        )}
                        {palace.stars.map((s) => {
                          const sha = s.type === 'sha';
                          return (
                            <span key={s.name} style={{
                              display: 'inline-flex', alignItems: 'baseline', gap: 6,
                              fontSize: 15, padding: '6px 11px', borderRadius: 5,
                              background: sha ? mix(SURFACE.seal, 9) : mix(C.gold, 5),
                              border: `1px solid ${sha ? mix(SURFACE.seal, 28) : mix(C.gold, 18)}`,
                              color: sha ? SURFACE.seal : C.ink,
                              letterSpacing: '0.05em',
                            }}>
                              <span style={{ fontFamily: s.type === 'major' ? FONT.serif : FONT.sans, fontWeight: s.type === 'major' ? 600 : 400 }}>
                                {s.name}
                              </span>
                              {s.brightnessRaw && (
                                <span style={{ fontSize: 11.5, color: C.ink3 }}>{s.brightnessRaw}</span>
                              )}
                              {s.siHua && (
                                <span style={{
                                  fontSize: 11, padding: '0 4px', borderRadius: 2,
                                  color: SIHUA_COLORS[s.siHua] ?? C.gold,
                                  border: `1px solid ${mix(SIHUA_COLORS[s.siHua] ?? C.gold, 35)}`,
                                }}>化{s.siHua}</span>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      <div style={{
                        fontSize: T.body, color: C.ink2, lineHeight: 2.15,
                        borderTop: `1px dashed ${mix(C.gold, 22)}`, paddingTop: 15,
                      }}>
                        {palace.daXianAge && (
                          <div>大限：{palace.daXianAge[0]}–{palace.daXianAge[1]} 岁{palace.isCurrentDaXian ? '（当前）' : ''}</div>
                        )}
                        {palace.isEmpty && (
                          <div>空宫论法：借对宫「{palace.borrowedFromName}」之星{palace.borrowedStars?.length ? `（${palace.borrowedStars.join('、')}）` : ''}</div>
                        )}
                        {palace.selfSihua?.length ? (
                          <div>宫干自化：{palace.selfSihua.map((x) => `化${x.siHua}(${x.starName})`).join('、')}</div>
                        ) : null}
                        {(() => {
                          const opp = chart.palaces.find((x) => x.branch === (palace.branch + 6) % 12);
                          const tri = [
                            chart.palaces.find((x) => x.branch === (palace.branch + 4) % 12),
                            chart.palaces.find((x) => x.branch === (palace.branch + 8) % 12),
                          ].filter(Boolean) as typeof chart.palaces;
                          const brief = (p: ZiweiChart['palaces'][number]) =>
                            p.stars.filter((s) => s.type === 'major').map((s) => s.name).join('、') || '空宫';
                          return (
                            <>
                              {opp && (
                                <div style={{ color: C.ink3, fontSize: T.sub }}>
                                  对宫 · {opp.name}：<span style={{ color: C.ink2 }}>{brief(opp)}</span>
                                </div>
                              )}
                              <div style={{ color: C.ink3, fontSize: T.sub }}>
                                三合 · {tri.map((p) => `${p.name}（${brief(p)}）`).join(' / ')}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {palace.stars.some((s) => s.type === 'major') && (
                        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {palace.stars.filter((s) => s.type === 'major').map((s) => {
                            const slug = STAR_TO_SLUG[s.name];
                            if (!slug) return null;
                            return (
                              <Link key={s.name} href={`/knowledge/${slug}/overview`} className="zw-ghost-btn" style={{
                                fontSize: T.sub, padding: '7px 12px', borderRadius: 5, textDecoration: 'none',
                                color: C.gold, border: `1px solid ${mix(C.gold, 30)}`, background: mix(C.gold, 7),
                                letterSpacing: '0.06em',
                              }}>{s.name}详解 →</Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="zw-glass" style={{
                borderRadius: SHAPE.radiusCard,
                padding: '20px 22px 22px',
              }}>
                <div style={{ fontSize: T.eyebrow, letterSpacing: '0.28em', color: C.ink3, marginBottom: 15 }}>NEXT · 接着做</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: T.body }}>
                  <button
                    type="button"
                    onClick={() => openSection('reading')}
                    style={{
                      textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      color: C.ink, letterSpacing: TRACK.body, fontWeight: 600, fontFamily: 'inherit', fontSize: T.body,
                    }}
                  >
                    → 就在本页解这张盘（六层判据 + 七问）
                  </button>
                  <button
                    type="button"
                    onClick={() => openSection('kline')}
                    style={{
                      textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      color: C.ink2, letterSpacing: TRACK.body, fontFamily: 'inherit', fontSize: T.body,
                    }}
                  >
                    → 看人生 K 线（逐年倾向 + 五维）
                  </button>
                  <Link href="/study/practice" style={{ color: C.ink2, textDecoration: 'none', letterSpacing: TRACK.body }}>
                    → 练一盘手工推演
                  </Link>
                  <Link href="/knowledge" style={{ color: C.ink2, textDecoration: 'none', letterSpacing: TRACK.body }}>
                    → 查这一宫的星曜
                  </Link>
                </div>
                <div style={{
                  fontSize: T.meta, color: C.ink3, marginTop: 16, lineHeight: 2,
                  borderTop: `1px dashed ${mix(C.gold, 18)}`, paddingTop: 13,
                }}>
                  本盘由引擎现算，若与古籍案例不符，以案例为准 —— 那才是验证规则的地方。
                  想换纸墨，在左下「外观」里挑。
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ── 人生 K 线：把「哪一年」这件事摊成时间轴 ── */}
        {chart && klineOpen && (
          <section
            ref={klineRef}
            style={{ marginTop: 44, scrollMarginTop: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${mix(C.gold, 40)})` }} />
              <span style={{ display: 'inline-block', width: 6, height: 6, background: C.gold, transform: 'rotate(45deg)' }} />
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${mix(C.gold, 40)}, transparent)` }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: T.eyebrow, letterSpacing: TRACK.eyebrow, color: C.gold, marginBottom: 10 }}>
                行运 · 逐年倾向
              </div>
              <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: T.h1, fontWeight: 700, letterSpacing: TRACK.title, color: C.ink }}>
                人生 K 线
              </h2>
              <p style={{ margin: '10px 0 0', fontSize: T.body, color: C.ink2, lineHeight: 1.95, maxWidth: 800 }}>
                解盘讲的是「这一格怎么读」，可人真正要问的往往是「哪一年」。这里把 8 到 90 岁逐年压成一根蜡烛：
                纵轴是盘面倾向指数，影线是那一年的折腾幅度。点一根看那一年的事业、财、关系、身体、心境怎么摆，
                还能按着流年命宫回到盘面上去核对。
              </p>
            </div>
            <LifeKline chart={chart} onLocatePalace={locatePalace} />
          </section>
        )}

        {/* ── 就地解盘：盘在上面，判据在下面，同一张盘一路往下读 ── */}
        {chart && readingOpen && (
          <section
            ref={readingRef}
            style={{
              marginTop: 44, scrollMarginTop: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${mix(C.gold, 40)})` }} />
              <span style={{ display: 'inline-block', width: 6, height: 6, background: C.gold, transform: 'rotate(45deg)' }} />
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${mix(C.gold, 40)}, transparent)` }} />
            </div>
            <ReadingPanel
              chart={chart}
              onLocatePalace={locatePalace}
              title="解这张盘"
              kicker="明盘 · 六层读法"
              intro="下面的判据全部从这张盘上现取：哪一宫、哪颗星、什么亮度、哪一化，逐条写清「从哪来」。先自己按六层读一遍，再把收窄后的问题交给模型 —— 它只许引用这些事实。"
            />
          </section>
        )}
      </div>
    </ZenShell>
  );
}
