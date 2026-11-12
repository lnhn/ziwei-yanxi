'use client';

/**
 * 浅色生辰表（替代原站暗色 BirthForm）
 *
 * 只做一件事：把输入收成 BirthInfo。
 * 关键是不能丢内核能力 —— 真太阳时校正必须保留，所以这里仍走
 * lib/ziwei/share 的 calcTrueSolarBranch / formToBirthInfo，与老表单同口径。
 */

import { useMemo, useState } from 'react';
import { PROVINCES } from '@/lib/ziwei/cities';
import { formToBirthInfo, calcTrueSolarBranch } from '@/lib/ziwei/share';
import type { BirthFormState } from '@/components/BirthForm';
import type { BirthInfo } from '@/lib/ziwei/types';
import { BRANCHES } from '@/lib/ziwei/constants';
import { PAPER_COLORS as PAPER } from '@/components/study/paper';

/** 表单配色：默认宣纸；排盘页走暗色时由外面传进来，避免这一块在暗底上白得刺眼 */
type FormColors = {
  card: string;
  paper: string;
  line: string;
  ink: string;
  ink2: string;
  ink3: string;
  accent: string;
};

export default function LightBirthForm({
  onSubmit,
  tone,
}: {
  onSubmit: (info: BirthInfo) => void;
  tone?: FormColors;
}) {
  const C = tone
    ? { card: tone.card, paper: tone.paper, line: tone.line, ink: tone.ink, ink2: tone.ink2, ink3: tone.ink3, navy: tone.accent }
    : { card: PAPER.card, paper: PAPER.paper, line: PAPER.line, ink: PAPER.ink, ink2: PAPER.ink2, ink3: PAPER.ink3, navy: PAPER.navy };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 15, fontFamily: 'inherit', borderRadius: 7,
    border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.ink, outline: 'none',
    letterSpacing: '0.04em',
  };
  const [form, setForm] = useState<BirthFormState>({
    name: '',
    year: '1990',
    month: '1',
    day: '1',
    clockHour: '12',
    clockMinute: '0',
    unknownTime: false,
    province: '山西省',
    city: '太原',
    longitude: 112.55,
    gender: 'male',
  });

  const cities = useMemo(() => PROVINCES.find((p) => p.name === form.province)?.cities ?? [], [form.province]);

  const trueBranch = useMemo(
    () => calcTrueSolarBranch(Number(form.clockHour) || 0, Number(form.clockMinute) || 0, form.longitude),
    [form.clockHour, form.clockMinute, form.longitude],
  );
  const offsetMin = Math.round((form.longitude - 120) * 4);

  function set<K extends keyof BirthFormState>(key: K, value: BirthFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function submit() {
    onSubmit(formToBirthInfo(form));
  }

  // 放在组件内，才能拿到外面传进来的配色（原来是模块级常量，颜色锁死）
  function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <div style={{ fontSize: 11.5, color: C.ink3, letterSpacing: '0.16em', marginBottom: 7 }}>{label}</div>
        {children}
      </div>
    );
  }

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '22px 24px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
        fontSize: 11.5, letterSpacing: '0.22em', color: C.ink3,
      }}>
        <span style={{ display: 'inline-block', width: 4, height: 4, background: 'var(--zw-gold)', transform: 'rotate(45deg)' }} />
        出生信息
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.line}, transparent)` }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        <Labeled label="公历年">
          <input value={form.year} onChange={(e) => set('year', e.target.value)} className="zw-field" style={inputStyle} />
        </Labeled>
        <Labeled label="月">
          <input value={form.month} onChange={(e) => set('month', e.target.value)} className="zw-field" style={inputStyle} />
        </Labeled>
        <Labeled label="日">
          <input value={form.day} onChange={(e) => set('day', e.target.value)} className="zw-field" style={inputStyle} />
        </Labeled>
        <Labeled label="时（0–23）">
          <input value={form.clockHour} onChange={(e) => set('clockHour', e.target.value)} className="zw-field" style={inputStyle} />
        </Labeled>
        <Labeled label="分">
          <input value={form.clockMinute} onChange={(e) => set('clockMinute', e.target.value)} className="zw-field" style={inputStyle} />
        </Labeled>
        <Labeled label="性别">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set('gender', g)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  letterSpacing: '0.1em',
                  background: form.gender === g
                    ? `linear-gradient(180deg, var(--zw-gold), color-mix(in srgb, var(--zw-gold) 74%, transparent))`
                    : 'transparent',
                  color: form.gender === g ? '#1C1810' : C.ink2,
                  border: `1px solid ${form.gender === g ? 'var(--zw-gold)' : C.line}`,
                }}
              >{g === 'male' ? '男' : '女'}</button>
            ))}
          </div>
        </Labeled>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Labeled label="出生省">
          <select
            value={form.province}
            onChange={(e) => {
              const p = PROVINCES.find((x) => x.name === e.target.value);
              setForm((f) => ({
                ...f,
                province: e.target.value,
                city: p?.cities[0]?.name ?? '',
                longitude: p?.cities[0]?.longitude ?? 120,
              }));
            }}
            className="zw-field zw-select" style={inputStyle}
          >
            {PROVINCES.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </Labeled>
        <Labeled label="出生市（用于真太阳时校正）">
          <select
            value={form.city}
            onChange={(e) => {
              const c = cities.find((x) => x.name === e.target.value);
              setForm((f) => ({ ...f, city: e.target.value, longitude: c?.longitude ?? f.longitude }));
            }}
            className="zw-field zw-select" style={inputStyle}
          >
            {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </Labeled>
      </div>

      {/* 真太阳时提示：这张盘按哪个时辰起，必须让人看得见 */}
      <div style={{
        marginTop: 16, padding: '11px 14px', background: 'color-mix(in srgb, var(--zw-gold) 6%, transparent)',
        borderLeft: '2px solid var(--zw-gold)',
        borderTop: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`,
        borderRadius: 4, fontSize: 13, color: C.ink2, lineHeight: 1.85, letterSpacing: '0.03em',
      }}>
        真太阳时 → <strong style={{ color: 'var(--zw-gold)', letterSpacing: '0.08em' }}>{BRANCHES[trueBranch]}时</strong>
        <span style={{ color: C.ink3, marginLeft: 12 }}>
          {form.city || '未选城市'} · 经度 {form.longitude.toFixed(1)}°E · 时差 {offsetMin > 0 ? '+' : ''}{offsetMin} 分钟
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
        <button
          type="button"
          onClick={submit}
          className="zw-gold-btn"
          style={{
            padding: '12px 30px', borderRadius: 9, fontSize: 15.5, letterSpacing: '0.18em', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
            backgroundImage: 'linear-gradient(180deg, var(--zw-gold), color-mix(in srgb, var(--zw-gold) 70%, transparent))',
            color: '#1C1810', border: '1px solid var(--zw-gold)',
          }}
        >起 盘</button>
        <span style={{ fontSize: 12.5, color: C.ink3, letterSpacing: '0.04em' }}>倪师批命用真太阳时，出生地必填才能校正时辰。</span>
      </div>
    </div>
  );
}
