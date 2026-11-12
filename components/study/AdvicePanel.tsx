'use client';

/**
 * 核心建议面板 —— 解完六层判据之后，落到「那我该怎么做」
 *
 * 六张卡：事业 / 财 / 感情 / 家庭生活 / 身体 / 心性。
 * 每张卡固定四块：一句总判断 → 盘上依据 → 可做 / 该避 → 时间窗口。
 * 这样做是为了让每条建议都能被追溯：说「少硬闯」的时候，旁边就写着官禄宫那颗落陷的星。
 */

import { useMemo } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { buildAdvice, type Advice } from '@/lib/ziwei/advice';
import { PAPER_COLORS as C, SHADOW, SURFACE, TINT, mix } from '@/components/study/paper';
import { FONT, T, TRACK, SHAPE } from '@/components/study/type';

const GOOD = 'var(--zw-lu)';
const WARN = 'var(--zw-ji)';

export default function AdvicePanel({
  chart,
  onAsk,
}: {
  chart: ZiweiChart;
  /** 点「深挖这一维」时把这一维的提示词交给 AI 区 */
  onAsk?: (a: Advice) => void;
}) {
  const advice = useMemo(() => buildAdvice(chart), [chart]);

  return (
    <section style={{ marginTop: 44 }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ fontSize: T.eyebrow, letterSpacing: TRACK.eyebrow, color: C.gold, marginBottom: 10 }}>
          落地 · 六维建议
        </div>
        <h2 style={{
          margin: 0, fontFamily: FONT.display, fontSize: T.h1, fontWeight: 700,
          letterSpacing: TRACK.title, color: C.ink,
        }}>那该怎么做</h2>
        <p style={{ margin: '10px 0 0', fontSize: T.body, color: C.ink2, lineHeight: 1.95, maxWidth: 800 }}>
          判据回答「这盘是什么」，建议回答「接下来怎么做」。每一条都挂着它的出处——
          说「少硬闯」的时候，旁边写着官禄宫那颗落陷的星；说「先解决住」的时候，写着田宅宫的煞。
          不写必成必败，只写推力在哪、卡在哪、卡住时怎么走。
        </p>
      </header>

      <div className="zw-advice-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14,
      }}>
        {advice.map((a) => (
          <article
            key={a.key}
            style={{
              background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
              boxShadow: SHADOW.card, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{
                fontSize: T.micro, letterSpacing: TRACK.label, color: C.gold,
                border: `1px solid ${mix(C.gold, 45)}`, borderRadius: SHAPE.radiusChip, padding: '2px 9px',
              }}>{a.label}</span>
              {onAsk && (
                <button
                  type="button"
                  onClick={() => onAsk(a)}
                  style={{
                    marginLeft: 'auto', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: T.meta, color: C.ink3,
                    borderBottom: `1px dotted ${C.line}`,
                  }}
                >深挖这一维 →</button>
              )}
            </div>

            <p style={{ margin: '11px 0 0', fontSize: 15.5, lineHeight: 1.95, color: C.ink }}>{a.headline}</p>

            <div style={{ marginTop: 12, display: 'grid', gap: 5 }}>
              {a.basis.map((b, i) => (
                <div key={i} style={{
                  fontSize: 12.5, lineHeight: 1.85, color: C.ink3,
                  background: SURFACE.panel, border: `1px solid ${mix(C.line, 80)}`,
                  borderRadius: 8, padding: '6px 9px',
                }}>{b}</div>
              ))}
            </div>

            <div style={{ marginTop: 13, display: 'grid', gap: 8 }}>
              <div>
                <div style={{ fontSize: T.micro, letterSpacing: TRACK.label, color: GOOD, marginBottom: 5 }}>做</div>
                {a.do.map((x, i) => (
                  <div key={i} style={{ fontSize: 13.5, lineHeight: 1.85, color: C.ink2, paddingLeft: 10, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: GOOD }}>·</span>{x}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: T.micro, letterSpacing: TRACK.label, color: WARN, marginBottom: 5 }}>避</div>
                {a.avoid.map((x, i) => (
                  <div key={i} style={{ fontSize: 13.5, lineHeight: 1.85, color: C.ink2, paddingLeft: 10, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: WARN }}>·</span>{x}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${mix(C.line, 100)}`,
              fontSize: 12.5, lineHeight: 1.85, color: C.ink3,
            }}>
              <span style={{ color: C.ink2 }}>时间窗口：</span>{a.window}
            </div>
          </article>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: '12px 16px', background: TINT.daXian, border: `1px dashed ${mix(C.line, 120)}`,
        borderRadius: SHAPE.radiusCard, fontSize: T.sub, color: C.ink2, lineHeight: 1.9,
      }}>
        建议是「用力方向」，不是判决：命盘讲倾向，选择权在人。身体一维只谈养护方向，具体症状请就医。
        想再细一层，点每张卡右上角「深挖这一维」，会把这一维的事实单独交给模型，只谈这一件事。
      </div>
    </section>
  );
}
