'use client';

/**
 * 命盘板 —— /chart 专用
 *
 * 版式仍是传统的 4×4 外环十二宫、中心放基本信息 —— 这张盘的结构不能动，
 * 动了就不是紫微斗数的盘了。改的只有「皮与光」：
 *   · 外框做成装裱：金线双框 + 四角钉线 + 一层极淡星野，让盘像搁在观星台上；
 *   · 宫位不靠投影分层，靠明度与极淡的染色：命宫金、三方青、空宫压暗、煞聚带赤；
 *   · 悬停只提亮、选中只加金环与呼吸光，不做位移 —— 盘面一抖，读盘的人就断线；
 *   · 字全部放大一档：主星 27px 宋体、宫名 20px、辅星 15px；小字在这里就是受罪。
 * 颜色不写死，全部走 --zw-* 变量，亮底皮肤下自动变成「纸上的金线」。
 * 只读 chart 数据，不做任何算法 —— 安星、四化、大限全部来自引擎。
 */

import type { ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { FONT } from '@/components/study/type';
import { PAPER_COLORS as C, SURFACE, SIHUA_COLORS, TINT, mix } from './paper';

const BRANCH_GRID_POS: Record<number, [number, number]> = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1], 9: [2, 4],
  3: [3, 1], 10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
};

const numeral = { fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: '"tnum"' };

/** 四角钉线：只画角，不画整框 —— 装裱感来自「不闭合的线」 */
function Corner({ pos, size = 22, inset = 8 }: { pos: 'tl' | 'tr' | 'bl' | 'br'; size?: number; inset?: number }) {
  const base: React.CSSProperties = {
    position: 'absolute', width: size, height: size, pointerEvents: 'none',
    borderColor: mix(C.gold, 55), borderStyle: 'solid', borderWidth: 0,
  };
  if (pos === 'tl') Object.assign(base, { top: inset, left: inset, borderTopWidth: 1, borderLeftWidth: 1 });
  if (pos === 'tr') Object.assign(base, { top: inset, right: inset, borderTopWidth: 1, borderRightWidth: 1 });
  if (pos === 'bl') Object.assign(base, { bottom: inset, left: inset, borderBottomWidth: 1, borderLeftWidth: 1 });
  if (pos === 'br') Object.assign(base, { bottom: inset, right: inset, borderBottomWidth: 1, borderRightWidth: 1 });
  return <div style={base} />;
}

/** 菱形分隔：一颗小金钉，比横线安静 */
function Diamond({ size = 5 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      background: C.gold, transform: 'rotate(45deg)', opacity: 0.75,
    }} />
  );
}

export default function ChartBoardDark({
  chart,
  selectedBranch,
  onSelect,
}: {
  chart: ZiweiChart;
  selectedBranch: number | null;
  onSelect: (branch: number) => void;
}) {
  const sanFang = selectedBranch !== null
    ? new Set([selectedBranch, (selectedBranch + 6) % 12, (selectedBranch + 4) % 12, (selectedBranch + 8) % 12])
    : null;

  const keyFacts: { label: string; value: string }[] = [
    { label: '命宫', value: BRANCHES[chart.mingGongBranch] },
    { label: '身宫', value: BRANCHES[chart.shenGongBranch] },
    { label: '五行局', value: chart.wuxingJuName },
    { label: '紫微', value: `落 ${BRANCHES[chart.ziweiPos]}` },
    { label: '命主', value: chart.mingZhu ?? '—' },
    { label: '身主', value: chart.shenZhu ?? '—' },
  ];

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      padding: 14,
      background: `radial-gradient(120% 120% at 50% -14%, ${mix(C.gold, 11)}, transparent 58%), ${SURFACE.panelAlt}`,
      border: `1px solid ${mix(C.gold, 30)}`,
      boxShadow: 'var(--zw-shadow-float)',
      overflow: 'hidden',
    }}>

      {/* 内衬金线：外框是装裱，这条是纸边 */}
      <div aria-hidden style={{
        position: 'absolute', inset: 8, borderRadius: 18,
        border: `1px solid ${mix(C.gold, 12)}`, pointerEvents: 'none',
      }} />
      <Corner pos="tl" inset={14} /><Corner pos="tr" inset={14} /><Corner pos="bl" inset={14} /><Corner pos="br" inset={14} />

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(178px, 1fr))',
          gridTemplateRows: 'repeat(4, minmax(196px, auto))',
          gap: 1,
          background: mix(C.line, 90),
          border: `1px solid ${mix(C.gold, 20)}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {chart.palaces.map((p) => {
          const [row, col] = BRANCH_GRID_POS[p.branch];
          const selected = selectedBranch === p.branch;
          const inSanFang = sanFang?.has(p.branch) ?? false;
          const majors = p.stars.filter((s) => s.type === 'major');
          const minors = p.stars.filter((s) => s.type !== 'major');
          const shaCount = p.stars.filter((s) => s.type === 'sha').length;

          // 染色判据：选中 > 命宫 > 三方四正 > 煞聚 > 空宫 > 本底
          let tint: string = 'transparent';
          if (p.isMingGong) tint = TINT.ming;
          if (shaCount >= 2) tint = TINT.sha;
          if (inSanFang && !selected) tint = TINT.sanfang;
          if (selected) tint = TINT.ming;
          if (p.isEmpty && !selected) tint = TINT.kong;
          // 宫格底必须是「纸」本身再叠染色：只写染色会透出外框底，
          // 亮皮上就成了白格与米格混排（暗皮不明显，但同样不干净）。
          const bg = selected
            ? `linear-gradient(160deg, ${mix(C.gold, 12)}, transparent), linear-gradient(${tint}, ${tint}), ${SURFACE.panel}`
            : `linear-gradient(${tint}, ${tint}), ${SURFACE.panel}`;

          return (
            <button
              key={p.branch}
              type="button"
              onClick={() => onSelect(p.branch)}
              className={`zw-palace${selected ? ' zw-palace-active' : ''}`}
              style={{
                gridRow: row,
                gridColumn: col,
                position: 'relative',
                zIndex: selected ? 2 : 1,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '17px 17px 14px',
                background: bg,
                border: selected ? `1.5px solid ${C.gold}` : '1px solid transparent',
                outline: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 0,
                transition: 'background .2s ease, border-color .2s ease, filter .2s ease',
              }}
            >
              {/* 宫名 + 干支 */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    fontFamily: FONT.serif,
                    fontSize: p.isMingGong ? 17 : 16,
                    letterSpacing: '0.14em',
                    color: p.isMingGong ? C.gold : C.ink2,
                    fontWeight: p.isMingGong ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </span>
                  {p.isMingGong && (
                    <span style={{
                      fontFamily: FONT.serif, fontSize: 11, lineHeight: 1,
                      padding: '3px 5px', borderRadius: 2,
                      background: mix(C.gold, 18), color: C.gold,
                      border: `1px solid ${mix(C.gold, 45)}`,
                      letterSpacing: '0.1em',
                    }}>命</span>
                  )}
                  {p.isShenGong && (
                    <span style={{
                      fontFamily: FONT.serif, fontSize: 11, lineHeight: 1,
                      padding: '3px 5px', borderRadius: 2,
                      border: `1px solid ${mix(C.navy, 45)}`, color: C.navy, letterSpacing: '0.1em',
                    }}>身</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: C.ink3, letterSpacing: '0.1em', ...numeral }}>
                  {STEMS[p.stem]}{BRANCHES[p.branch]}
                </span>
              </div>

              {/* 主星 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px' }}>
                {majors.length === 0 ? (
                  <span style={{ fontSize: 13, color: C.ink3, letterSpacing: '0.05em', fontStyle: 'italic' }}>
                    空宫{p.borrowedFromName ? ` · 借${p.borrowedFromName}` : ''}
                  </span>
                ) : majors.map((s) => (
                  <span key={s.name} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{
                      fontFamily: FONT.serif, fontSize: 22, color: C.ink,
                      fontWeight: 600, letterSpacing: '0.1em', lineHeight: 1.25,
                    }}>
                      {s.name}
                    </span>
                    {s.brightnessRaw && (
                      <span style={{ fontSize: 11.5, color: C.ink3, fontWeight: 400, letterSpacing: '0.04em' }}>
                        {s.brightnessRaw}
                      </span>
                    )}
                    {s.siHua && (
                      <span style={{
                        fontSize: 11.5, padding: '1px 5px', borderRadius: 2,
                        color: SIHUA_COLORS[s.siHua] ?? C.gold,
                        border: `1px solid ${mix(SIHUA_COLORS[s.siHua] ?? C.gold, 38)}`,
                        background: mix(SIHUA_COLORS[s.siHua] ?? C.gold, 8),
                        lineHeight: 1.35, letterSpacing: '0.04em',
                      }}>{s.siHua}</span>
                    )}
                  </span>
                ))}
              </div>

              {/* 辅星 / 煞星 */}
              {minors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 11px' }}>
                  {minors.map((s) => (
                    <span key={s.name} style={{
                      fontSize: 13,
                      color: s.type === 'sha' ? mix(SURFACE.seal, 82) : C.ink2,
                      letterSpacing: '0.03em',
                      opacity: s.type === 'sha' ? 0.95 : 0.72,
                    }}>
                      {s.name}{s.siHua ? `·${s.siHua}` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* 大限 */}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 9 }}>
                {p.daXianAge && (
                  <span style={{
                    fontSize: 12,
                    color: p.isCurrentDaXian ? C.gold : C.ink3,
                    letterSpacing: '0.08em',
                    ...numeral,
                  }}>
                    {p.daXianAge[0]}–{p.daXianAge[1]}
                  </span>
                )}
                {p.isCurrentDaXian && (
                  <span style={{
                    fontSize: 11, color: C.gold, border: `1px solid ${mix(C.gold, 32)}`,
                    borderRadius: 2, padding: '1px 5px', letterSpacing: '0.08em',
                  }}>当前大限</span>
                )}
              </div>
            </button>
          );
        })}

        {/* 中心信息区（跨 2×2） */}
        <div style={{
          gridRow: '2 / 4', gridColumn: '2 / 4',
          background: `radial-gradient(120% 100% at 50% 0%, ${mix(C.gold, 9)}, transparent 62%), ${SURFACE.panelAlt}`,
          padding: '32px 34px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
        }}>

          <div style={{
            position: 'absolute', inset: 13,
            border: `1px solid ${mix(C.gold, 18)}`, borderRadius: 8,
            pointerEvents: 'none',
          }} />


          <div style={{
            fontFamily: FONT.display, fontSize: 22, letterSpacing: '0.12em',
            fontWeight: 600, lineHeight: 1.45,
            backgroundImage: `linear-gradient(180deg, ${C.ink} 30%, ${mix(C.gold, 92)} 130%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>
            {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}紫微斗数命盘
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 64, height: 1, background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
            <span style={{ fontSize: 11, color: C.ink3, letterSpacing: '0.28em' }}>十二宫 · 十四主星</span>
          </div>

          {/* 盘眼：六个关键位，两行三列 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px 18px', marginTop: 2,
          }}>
            {keyFacts.map((f) => (
              <div key={f.label}>
                <div style={{ fontSize: 10.5, color: C.ink3, letterSpacing: '0.22em', marginBottom: 3 }}>{f.label}</div>
                <div style={{
                  fontFamily: FONT.serif, fontSize: 16, color: C.ink, letterSpacing: '0.08em',
                  lineHeight: 1.35, ...numeral,
                }}>{f.value}</div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 15, paddingTop: 12, marginTop: 4,
            borderTop: `1px dashed ${mix(C.gold, 20)}`, fontSize: 12.5, color: C.ink3, letterSpacing: '0.1em',
          }}>
            {(['禄', '权', '科', '忌'] as const).map((k) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: SIHUA_COLORS[k], boxShadow: `0 0 8px ${mix(SIHUA_COLORS[k], 55)}` }} />
                <span style={{ color: SIHUA_COLORS[k] }}>化{k}</span>
              </span>
            ))}
            <span style={{ marginLeft: 'auto', opacity: 0.8 }}>四化标注</span>
          </div>
        </div>
      </div>
    </div>
  );
}
