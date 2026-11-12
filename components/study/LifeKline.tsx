'use client';

/**
 * 人生 K 线面板
 *
 * 一块看「时间」的图：横轴是虚岁/年份，纵轴是盘面倾向指数（0–100），
 * 每根蜡烛一年，影线画的是这一年四正上煞星与四化冲突的「折腾幅度」。
 * 点一根蜡烛，右边就把这一年的五维（事业/财/关系/身体/心境）摊开，
 * 并把「流年命宫」摆出来 —— 想回盘上看，按那个按钮就跳过去。
 *
 * 明确口径写在图上：这是倾向指数，不是股市 K 线，也不是命运判决。
 */

import { useMemo, useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { SIHUA_COLORS } from '@/components/study/paper';
import { BRANCHES } from '@/lib/ziwei/constants';
import { barFacts, buildLifeKline } from '@/lib/ziwei/life-kline';

const UP = SIHUA_COLORS.忌;   // 红：往上（A 股习惯）
const DOWN = SIHUA_COLORS.禄; // 绿：往下

const H = 248;        // 绘图高度（未含轴）
const PAD_T = 26;     // 顶：给「大限」条留位
const PAD_B = 22;     // 底：给年份刻度留位
const STEP = 17;      // 每年占宽
const BODY = 9;       // 蜡烛实体宽
const GUTTER = 30;    // 左边留给刻度（不然没人知道纵轴是多少）

export default function LifeKline({
  chart,
  onLocatePalace,
}: {
  chart: ZiweiChart;
  onLocatePalace?: (branch: number) => void;
}) {
  const kline = useMemo(() => buildLifeKline(chart), [chart]);
  const [selected, setSelected] = useState<number>(() => {
    const idx = kline.bars.findIndex((b) => b.age === chart.currentAge);
    return idx >= 0 ? idx : Math.max(0, kline.bars.length - 1);
  });

  const bar = kline.bars[Math.min(selected, kline.bars.length - 1)];
  const W = GUTTER + kline.bars.length * STEP;

  /** 指数 → y 坐标（0 在下、100 在上） */
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / 100);

  // 大限分段：连续同名合成一段，用来上色与标名
  const segments = useMemo(() => {
    const out: { name: string; from: number; to: number }[] = [];
    kline.bars.forEach((b, i) => {
      const last = out[out.length - 1];
      if (last && last.name === b.daXianName) last.to = i;
      else out.push({ name: b.daXianName, from: i, to: i });
    });
    return out;
  }, [kline]);

  return (
    <div>
      {/* ── 概览条：最好/最紧/当下 ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { k: '最强的一段', v: `${kline.best.age} 岁（${kline.best.year}）`, d: `指数 ${kline.best.close}`, c: UP },
          { k: '最紧的一段', v: `${kline.worst.age} 岁（${kline.worst.year}）`, d: `指数 ${kline.worst.close}`, c: DOWN },
          {
            k: '当下大限',
            v: kline.currentSpan ? `${kline.currentSpan[0]}–${kline.currentSpan[1]} 岁` : '—',
            d: `本盘当前 ${chart.currentAge} 岁`,
            c: 'var(--zw-gold)',
          },
        ].map((x) => (
          <div key={x.k} style={{
            flex: '1 1 200px', background: 'var(--zw-panel)', border: '1px solid var(--zw-line)',
            borderRadius: 12, padding: '12px 15px',
          }}>
            <div style={{ fontSize: 11.5, letterSpacing: '0.16em', color: 'var(--zw-ink3)' }}>{x.k}</div>
            <div style={{ fontSize: 16, color: 'var(--zw-ink)', marginTop: 5, fontFamily: 'var(--zw-font-display, inherit)' }}>{x.v}</div>
            <div style={{ fontSize: 12.5, color: x.c, marginTop: 3 }}>{x.d}</div>
          </div>
        ))}
      </div>

      {/* ── K 线本体 ── */}
      <div style={{
        background: 'var(--zw-card)', border: '1px solid var(--zw-line)', borderRadius: 14,
        padding: '14px 16px 10px', overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 16.5, color: 'var(--zw-ink)', letterSpacing: '0.02em' }}>人生 K 线 · 逐年倾向</span>
          <span style={{ fontSize: 12.5, color: 'var(--zw-ink3)' }}>
            横轴虚岁／年份，纵轴为盘面倾向指数 · 红涨绿落 · 影线＝当年的折腾幅度（不是高低点）
          </span>
        </div>

        <svg width={W} height={H + 8} style={{ display: 'block' }} role="img" aria-label="人生K线">
          <g transform={`translate(${GUTTER},0)`}>
          {/* 大限底纹 */}
          {segments.map((s, i) => (
            <g key={s.name + i}>
              <rect
                x={s.from * STEP}
                y={PAD_T}
                width={(s.to - s.from + 1) * STEP}
                height={H - PAD_T - PAD_B}
                fill={i % 2 ? 'var(--zw-tint-sanfang)' : 'var(--zw-tint-daxian)'}
                opacity={0.5}
              />
              <text x={s.from * STEP + 4} y={PAD_T - 8} fontSize={10.5} fill="var(--zw-ink3)" letterSpacing="0.1em">
                {s.name}
              </text>
            </g>
          ))}

          {/* 50 / 70 参考线 */}
          {[50, 70].map((v) => (
            <line key={v} x1={0} y1={y(v)} x2={W - GUTTER} y2={y(v)}
              stroke="var(--zw-line)" strokeDasharray="3 5" strokeWidth={1} opacity={0.7} />
          ))}

          {/* 蜡烛 */}
          {kline.bars.map((b, i) => {
            const up = b.close >= b.open;
            const color = up ? UP : DOWN;
            const bx = i * STEP;
            const bodyTop = y(Math.max(b.open, b.close));
            const bodyH = Math.max(1.5, Math.abs(y(b.open) - y(b.close)));
            const isSel = i === selected;
            return (
              <g key={b.age} style={{ cursor: 'pointer' }} onClick={() => setSelected(i)}>
                <rect x={bx} y={PAD_T} width={STEP} height={H - PAD_T - PAD_B} fill="transparent" />
                <line x1={bx + STEP / 2} y1={y(b.high)} x2={bx + STEP / 2} y2={y(b.low)} stroke={color} strokeWidth={1} opacity={0.65} />
                <rect
                  x={bx + (STEP - BODY) / 2}
                  y={bodyTop}
                  width={BODY}
                  height={bodyH}
                  fill={color}
                  opacity={up ? 0.9 : 0.75}
                  stroke={isSel ? 'var(--zw-gold)' : 'transparent'}
                  strokeWidth={isSel ? 1.6 : 0}
                />
                {isSel && (
                  <line x1={bx + STEP / 2} y1={PAD_T} x2={bx + STEP / 2} y2={H - PAD_B} stroke="var(--zw-gold)" strokeWidth={1} opacity={0.5} />
                )}
                {b.age % 10 === 0 && (
                  <text x={bx + STEP / 2} y={H - PAD_B + 14} fontSize={10} fill="var(--zw-ink3)" textAnchor="middle">
                    {b.age}
                  </text>
                )}
              </g>
            );
          })}

          {/* 收盘连线：83 根蜡烛堆在一起时，只有这条线能看出走势 */}
          <polyline
            points={kline.bars.map((b, i) => `${i * STEP + STEP / 2},${y(b.close)}`).join(' ')}
            fill="none"
            stroke="var(--zw-gold)"
            strokeWidth={1.4}
            opacity={0.85}
          />

          {/* 当下一根上方的标记 */}
          <text
            x={Math.max(0, kline.bars.findIndex((b) => b.age === chart.currentAge) * STEP + STEP / 2)}
            y={PAD_T + 11}
            fontSize={10.5}
            fill="var(--zw-gold)"
            textAnchor="middle"
          >现在</text>
          </g>

          {/* 左轴刻度：没有刻度的图，读不得 */}
          {[100, 70, 50, 0].map((v) => (
            <text key={v} x={GUTTER - 8} y={y(v) + 3.5} fontSize={10} fill="var(--zw-ink3)" textAnchor="end">
              {v}
            </text>
          ))}
        </svg>

        <div style={{ fontSize: 11.5, color: 'var(--zw-ink3)', lineHeight: 1.9, marginTop: 4 }}>
          指数由「该宫星曜亮度打底 + 本命／大限／流年三层四化加减」算出，逐年可复算；
          读法是看走势与拐点，不是逐点抠数字。点一根蜡烛看那一年。
        </div>
      </div>

      {/* ── 那一年的五维 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: 16, marginTop: 16 }}>
        <div style={{ background: 'var(--zw-card)', border: '1px solid var(--zw-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 19, color: 'var(--zw-ink)', fontFamily: 'var(--zw-font-display, inherit)' }}>
              {bar.age} 岁 · {bar.year}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--zw-ink3)' }}>
              {bar.stemName}年 · {bar.palaceName} · 指数 {bar.close}（{bar.close >= 68 ? '顺' : bar.close >= 52 ? '平' : '紧'}）
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--zw-ink3)' }}>
              开 {bar.open}／高 {bar.high}／低 {bar.low}／收 {bar.close}
            </div>
          </div>

          {/* 五维条 */}
          <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
            {bar.dims.map((d) => (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 40, fontSize: 13, color: 'var(--zw-ink2)' }}>{d.label}</span>
                <div style={{ flex: 1, height: 9, background: 'var(--zw-panel)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', inset: 0, width: `${d.score}%`,
                    background: d.score >= 68 ? UP : d.score >= 52 ? 'var(--zw-gold)' : DOWN,
                    opacity: 0.75, borderRadius: 6,
                  }} />
                </div>
                <span style={{ width: 28, textAlign: 'right', fontSize: 12.5, color: 'var(--zw-ink2)' }}>{d.score}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: '14px 0 0', fontSize: 14.5, lineHeight: 1.95, color: 'var(--zw-ink)' }}>{bar.note}</p>
        </div>

        <div style={{ background: 'var(--zw-panel)', border: '1px dashed var(--zw-line)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, letterSpacing: '0.16em', color: 'var(--zw-ink3)', marginBottom: 10 }}>这一年的盘上依据</div>
          {barFacts(chart, bar).map((f) => (
            <div key={f.label} style={{ marginBottom: 9 }}>
              <div style={{ fontSize: 11.5, color: 'var(--zw-ink3)' }}>{f.label}</div>
              <div style={{ fontSize: 13.5, color: 'var(--zw-ink)', lineHeight: 1.8 }}>{f.text}</div>
            </div>
          ))}
          <div style={{ fontSize: 12.5, color: 'var(--zw-ink3)', lineHeight: 1.85 }}>
            煞星 {bar.sha} 颗压在这一年的四正上
          </div>
          {onLocatePalace && (
            <button
              type="button"
              onClick={() => onLocatePalace(bar.branch)}
              style={{
                marginTop: 12, padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 12.5, background: 'var(--zw-tint-ming)', color: 'var(--zw-ink)',
                border: '1px solid var(--zw-line)',
              }}
            >在盘上看 {BRANCHES[bar.branch]} 这一宫</button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--zw-ink3)', lineHeight: 1.95 }}>
        说明：这是「倾向指数」而不是行情图，也不是命运判决。指数高的年份是「推力足」，不是「一定成」；
        指数低的年份是「该收着走」，不是「必出坏事」。真正的判断仍要看宫里哪颗星、哪一化、谁在对宫。
        身体的事请就医。
      </div>
    </div>
  );
}
