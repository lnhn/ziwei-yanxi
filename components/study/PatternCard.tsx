'use client';

/**
 * 格局判据卡（可点开）
 *
 * 原来的问题：49 条判据是一张张死卡，只有四字格目 + 一句短注，点不动也看不懂。
 * 现在：卡片本身可点，展开后依次给出 白话（这格在说什么）、用途（拿来判什么/什么时候看）、
 * 判定说明（可判 / 安星上不成立 / 注文有歧义），原文短注始终留在卡面上。
 */

import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { getPatternPlain } from '@/lib/ziwei/patterns-plain';

export interface PatternRow {
  no: number;
  name: string;
  note: string;
  status: string;
  why?: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  derivable: { text: '可判', color: SIHUA_COLORS.禄 },
  unreachable: { text: '安星上不成立', color: C.ink3 },
  disputed: { text: '注文有歧义', color: C.gold },
};

export default function PatternCard({
  row,
  setKey,
  open,
  onToggle,
}: {
  row: PatternRow;
  setKey: 'gui' | 'fu' | 'pin' | 'za';
  open: boolean;
  onToggle: () => void;
}) {
  const st = STATUS_LABEL[row.status] ?? STATUS_LABEL.unreachable;
  const plain = getPatternPlain(setKey, row.no);

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        cursor: 'pointer',
        background: open ? C.paperDeep : C.card,
        border: `1px solid ${open ? mix(st.color, 45) : C.line}`,
        borderRadius: SHAPE.radiusCard,
        padding: '13px 15px',
        borderLeft: `3px solid ${st.color}`,
        transition: 'background .16s ease, border-color .16s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: T.micro, color: C.gold, letterSpacing: TRACK.title }}>{String(row.no).padStart(2, '0')}</span>
        <span style={{ fontFamily: FONT.serif, fontSize: T.body, color: C.ink, letterSpacing: TRACK.title, fontWeight: 600 }}>{row.name}</span>
        <span style={{
          fontSize: T.micro, color: st.color, border: `1px solid ${mix(st.color, 35)}`,
          borderRadius: 3, padding: '1px 5px', marginLeft: 'auto',
        }}>{st.text}</span>
      </div>

      <div style={{ fontSize: T.meta, color: C.ink2, lineHeight: 1.85, marginTop: 6 }}>{row.note}</div>

      {/* 折叠态：只给一句引导，不抢信息 */}
      {!open && (
        <div style={{ fontSize: T.micro, color: C.ink3, marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: C.gold }}>▾</span>
          {plain ? '点开看白话与用途' : '点开看判定说明'}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plain && (
            <>
              <div style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn,
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: T.micro, color: C.cinnabar, letterSpacing: TRACK.label, marginBottom: 4 }}>
                  白话 · 这格在说什么
                </div>
                <div style={{ fontSize: T.sub, color: C.ink, lineHeight: 1.95 }}>{plain.plain}</div>
              </div>

              <div style={{
                background: mix(C.navy, 8), border: `1px solid ${mix(C.navy, 26)}`, borderRadius: SHAPE.radiusBtn,
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: T.micro, color: C.navy, letterSpacing: TRACK.label, marginBottom: 4 }}>
                  用途 · 拿来判什么
                </div>
                <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 1.95 }}>{plain.use}</div>
              </div>
            </>
          )}

          {row.why && (
            <div style={{
              background: mix(st.color, 7), border: `1px dashed ${mix(st.color, 30)}`, borderRadius: SHAPE.radiusBtn,
              padding: '9px 12px',
            }}>
              <div style={{ fontSize: T.micro, color: st.color, letterSpacing: TRACK.label, marginBottom: 3 }}>判定说明</div>
              <div style={{ fontSize: T.micro, color: C.ink2, lineHeight: 1.9 }}>{row.why}</div>
            </div>
          )}

          <div style={{ fontSize: T.micro, color: C.ink3, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: C.gold }}>▴</span>收起
          </div>
        </div>
      )}
    </div>
  );
}
