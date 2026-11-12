'use client';

/**
 * 浅色命盘（替代原站暗色 ChartBoard）
 *
 * 版式照传统：4×4 外环十二宫、中心放基本信息。
 * 只读 chart 数据，不做任何算法 —— 安星、四化、大限全部来自引擎。
 */

import type { ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { FONT } from '@/components/study/type';

const BRANCH_GRID_POS: Record<number, [number, number]> = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1], 9: [2, 4],
  3: [3, 1], 10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
};

const SIHUA_COLOR: Record<string, string> = {
  禄: '#4C8C5A',
  权: '#A6761D',
  科: '#22455C',
  忌: '#A6432B',
};

export default function ChartBoardLight({
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

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, minmax(120px, auto))',
          gap: 1,
          background: C.line,
          border: `1px solid ${C.line}`,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {chart.palaces.map((p) => {
          const [row, col] = BRANCH_GRID_POS[p.branch];
          const selected = selectedBranch === p.branch;
          const inSanFang = sanFang?.has(p.branch) ?? false;
          const majors = p.stars.filter((s) => s.type === 'major');
          const minors = p.stars.filter((s) => s.type !== 'major');

          return (
            <button
              key={p.branch}
              type="button"
              onClick={() => onSelect(p.branch)}
              style={{
                gridRow: row,
                gridColumn: col,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '8px 9px',
                background: selected ? '#FFFFFF' : inSanFang ? '#FBF6E4' : C.card,
                border: selected ? `2px solid ${C.gold}` : '1px solid transparent',
                outline: 'none',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minHeight: 0,
              }}
            >
              {/* 宫名 + 干支 */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: FONT.serif, fontSize: 12.5, color: p.isMingGong ? C.cinnabar : C.ink2, letterSpacing: '0.08em', fontWeight: p.isMingGong ? 600 : 400 }}>
                  {p.name}
                  {p.isMingGong && <span style={{ fontSize: 9.5, marginLeft: 3, color: C.cinnabar }}>命</span>}
                  {p.isShenGong && <span style={{ fontSize: 9.5, marginLeft: 3, color: C.navy }}>身</span>}
                </span>
                <span style={{ fontSize: 10.5, color: C.ink3, letterSpacing: '0.05em' }}>
                  {STEMS[p.stem]}{BRANCHES[p.branch]}
                </span>
              </div>

              {/* 主星 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px' }}>
                {majors.length === 0 ? (
                  <span style={{ fontSize: 11, color: C.ink3 }}>
                    空宫{p.borrowedFromName ? `·借${p.borrowedFromName}` : ''}
                  </span>
                ) : majors.map((s) => (
                  <span key={s.name} style={{ fontFamily: FONT.serif, fontSize: 13.5, color: C.ink, fontWeight: 600, letterSpacing: '0.06em' }}>
                    {s.name}
                    {s.brightnessRaw && (
                      <span style={{ fontSize: 9.5, color: C.ink3, fontWeight: 400, marginLeft: 2 }}>{s.brightnessRaw}</span>
                    )}
                    {s.siHua && (
                      <span style={{
                        fontSize: 9.5, marginLeft: 2, color: SIHUA_COLOR[s.siHua] ?? C.gold,
                        border: `1px solid ${SIHUA_COLOR[s.siHua] ?? C.gold}`,
                        borderRadius: 2, padding: '0 2px', fontWeight: 400,
                      }}>{s.siHua}</span>
                    )}
                  </span>
                ))}
              </div>

              {/* 辅星 / 煞星 */}
              {minors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px 5px' }}>
                  {minors.map((s) => (
                    <span key={s.name} style={{
                      fontSize: 11, color: s.type === 'sha' ? C.cinnabar : C.ink3, letterSpacing: '0.02em',
                    }}>
                      {s.name}{s.siHua ? `(${s.siHua})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* 大限 */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10.5, color: p.isCurrentDaXian ? C.gold : C.ink3 }}>
                  {p.daXianAge ? `${p.daXianAge[0]}–${p.daXianAge[1]}` : ''}{p.isCurrentDaXian ? ' 限' : ''}
                </span>
              </div>
            </button>
          );
        })}

        {/* 中心信息区（跨 2×2） */}
        <div style={{
          gridRow: '2 / 4', gridColumn: '2 / 4', background: C.paper, padding: '16px 18px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.34em', color: C.ink3 }}>ZI WEI DOU SHU</div>
          <div style={{ fontFamily: FONT.display, fontSize: 16.5, letterSpacing: '0.12em', color: C.ink, fontWeight: 600 }}>
            {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}紫微斗数命盘
          </div>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 2 }}>
            命宫 <strong>{BRANCHES[chart.mingGongBranch]}</strong>　身宫 <strong>{BRANCHES[chart.shenGongBranch]}</strong><br />
            {chart.wuxingJuName}　紫微落 {BRANCHES[chart.ziweiPos]}<br />
            命主 {chart.mingZhu ?? '—'}　身主 {chart.shenZhu ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.9, borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>
            {(['禄', '权', '科', '忌'] as const).map((k) => (
              <span key={k} style={{ marginRight: 8 }}>
                <span style={{ color: SIHUA_COLOR[k] }}>{k}</span>
              </span>
            ))}
            <span style={{ marginLeft: 4 }}>四化标注</span>
          </div>
        </div>
      </div>
    </div>
  );
}
