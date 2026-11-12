'use client';

/**
 * /study/interpret —— 单独一页的解盘（明盘）
 *
 * 与 /chart 的关系：
 *   排盘与解盘是同一件事的两半。/chart 起完盘已经能就地解盘，这一页存在是为了两种场合：
 *   ① 想一个人慢慢读、把结果存成文档；② 手上只有生辰、直接来解。
 *   所以这里不再「先填表再点起盘」——只要地址里带着这张盘的成因（?y=&m=&d=&h=&g=），
 *   进页即自动出盘；没有参数时退一步用上次起过的盘，实在没有才露出表单。
 *
 * 判据、七问、提示词的逻辑全在 components/study/ReadingPanel.tsx，两个入口共用一份，
 * 不会出现「两个页面判语不一样」。
 */

import { useEffect, useMemo, useState } from 'react';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import { chartQuery, readChartQuery } from '@/lib/study/chart-link';
import { loadLastBirth, saveLastBirth } from '@/lib/study/last-chart';
import { PAPER_COLORS as C, SURFACE, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { Btn, Card, PageHead } from '@/components/study/ui';
import { useSettings } from '@/components/study/settings-context';
import ReadingPanel from '@/components/study/ReadingPanel';

const HOUR_LABELS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export default function InterpretPage() {
  const { open } = useSettings();

  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [birth, setBirth] = useState<BirthInfo | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  /** 这张盘是从哪来的：地址参数 / 上次起过的盘 / 手填 */
  const [origin, setOrigin] = useState<'query' | 'last' | 'form' | null>(null);

  const [year, setYear] = useState('1990');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');
  const [hour, setHour] = useState('6');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [city, setCity] = useState('');

  function apply(info: BirthInfo, from: 'query' | 'last' | 'form') {
    try {
      const c = generateChart(info);
      setChart(c);
      setBirth(info);
      setOrigin(from);
      setError('');
      saveLastBirth(info);
      setYear(String(info.year));
      setMonth(String(info.month));
      setDay(String(info.day));
      setHour(String(info.hour));
      setGender(info.gender);
      setCity(info.city ?? '');
      setFormOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '起盘失败，请检查日期');
      setFormOpen(true);
    }
  }

  // 进页第一件事：先把「这张盘是哪来的」定下来，绝不让用户为了看一眼解盘再填一遍生辰
  useEffect(() => {
    const q = readChartQuery(window.location.search);
    if (q) {
      apply(q, 'query');
      return;
    }
    const last = loadLastBirth();
    if (last) {
      apply(last, 'last');
      return;
    }
    // 既没参数也没历史：不凭空造一张盘，直接让人填
    setChart(null);
    setOrigin(null);
    setFormOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitForm() {
    const info: BirthInfo = {
      year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), gender,
      ...(city.trim() ? { city: city.trim() } : {}),
    };
    apply(info, 'form');
  }

  const originText = useMemo(() => {
    if (!birth) return '';
    const base = `公历 ${birth.year}-${birth.month}-${birth.day} ${HOUR_LABELS[birth.hour]}时 · ${birth.gender === 'male' ? '男' : '女'}${birth.city ? ` · ${birth.city}` : ''}`;
    if (origin === 'query') return `${base}　（从起盘页接过来的同一张盘，没有重填生辰）`;
    if (origin === 'last') return `${base}　（沿用你上次起的盘，可随时改）`;
    return base;
  }, [birth, origin]);

  return (
    <div style={{ padding: '34px 26px 60px', maxWidth: 1240, margin: '0 auto' }}>
      <PageHead
        title="解盘分析"
        kicker="明盘 · 解盘"
        desc="解盘不是让 AI 猜，是按顺序读：先核对这张盘像不像你，再看命宫底色、三方四正、生年四化，最后落到当下大限。判据由盘面取数生成，每条都写清「从哪颗星来」，模型只许引用，不许自由发挥。"
      />

      {/* ── 当前这张盘：一行成因 + 换盘，不占版面 ── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: T.micro, letterSpacing: TRACK.label, color: C.ink3 }}>正在解的盘</div>
            <div style={{ fontSize: T.body, color: C.ink, marginTop: 4 }}>{originText || '—'}</div>
          </div>
          <Btn onClick={() => setFormOpen((v) => !v)}>{formOpen ? '收起' : '改生辰 / 另一张盘'}</Btn>
          <Btn onClick={() => open('prompts')}>设置 · 提示词</Btn>
        </div>

        {formOpen && (
          <div style={{
            marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${mix(C.line, 110)}`,
            display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
          }}>
            <Field label="公历年"><NumInput value={year} onChange={setYear} width={86} /></Field>
            <Field label="月"><NumInput value={month} onChange={setMonth} width={58} /></Field>
            <Field label="日"><NumInput value={day} onChange={setDay} width={58} /></Field>
            <Field label="时辰">
              <select value={hour} onChange={(e) => setHour(e.target.value)} style={selectStyle}>
                {HOUR_LABELS.map((h, i) => <option key={h} value={String(i)}>{`${h}时（${i}）`}</option>)}
              </select>
            </Field>
            <Field label="性别">
              <div style={{ display: 'flex', gap: 6 }}>
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    style={{
                      padding: '9px 16px', borderRadius: SHAPE.radiusBtn, fontSize: T.body, cursor: 'pointer', fontFamily: 'inherit',
                      background: gender === g ? C.ink : SURFACE.panel,
                      color: gender === g ? C.paper : C.ink2,
                      border: `1px solid ${gender === g ? C.ink : C.line}`,
                    }}
                  >{g === 'male' ? '男' : '女'}</button>
                ))}
              </div>
            </Field>
            <Field label="出生地（可空）"><TextInput value={city} onChange={setCity} width={116} placeholder="如 太原" /></Field>
            <Btn primary onClick={submitForm}>用这张盘解</Btn>
          </div>
        )}
        {error && <div style={{ marginTop: 10, fontSize: T.sub, color: C.cinnabar }}>{error}</div>}
      </Card>

      {chart && (
        <ReadingPanel
          chart={chart}
          title=""
          kicker="六层判据 · 解盘七问"
          intro=""
          palaceHref={(branch) => {
            if (!birth) return `/chart?branch=${branch}`;
            const q = new URLSearchParams(chartQuery(birth));
            q.set('branch', String(branch));
            return `/chart?${q.toString()}`;
          }}
        />
      )}
    </div>
  );
}

/* ───────────────── 表单小组件 ───────────────── */

const selectStyle: React.CSSProperties = {
  padding: '9px 11px', fontSize: T.body, fontFamily: 'inherit', borderRadius: SHAPE.radiusBtn,
  border: `1px solid ${C.line}`, background: C.card, color: C.ink, outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, width }: { value: string; onChange: (v: string) => void; width: number }) {
  return (
    <input
      value={value}
      inputMode="numeric"
      onChange={(e) => onChange(e.target.value)}
      style={{
        width, padding: '9px 11px', fontSize: T.body, fontFamily: 'inherit', borderRadius: SHAPE.radiusBtn,
        border: `1px solid ${C.line}`, background: C.card, color: C.ink, outline: 'none',
      }}
    />
  );
}

function TextInput({ value, onChange, width, placeholder }: { value: string; onChange: (v: string) => void; width: number; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width, padding: '9px 11px', fontSize: T.body, fontFamily: 'inherit', borderRadius: SHAPE.radiusBtn,
        border: `1px solid ${C.line}`, background: C.card, color: C.ink, outline: 'none',
      }}
    />
  );
}
