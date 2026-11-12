'use client';

/**
 * /study/practice —— 手工推演练习（七步判分）
 *
 * 为什么分步而不判整盘：
 *   手工排盘是一串程序性技能，错在第②步（定命宫）和错在第④步（安紫微），
 *   对学习者是完全不同的信息。所以每步单独核对，答对才推进，答错立刻给出推法。
 *
 * 答案来源：全部由引擎 generateChart() 的输出现算，不写死；
 * 四化用 getSiHuaByStem(年干) 取，与盘面一致。
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { generateChart } from '@/lib/ziwei/algorithm';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { getSiHuaByStem } from '@/lib/ziwei/sihua';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { Card, PageHead, Btn, Chip, Select } from '@/components/study/ui';
import { saveRun, loadProgress, weakestStep } from '@/lib/study/progress';
import { ReasonBox, AiAssist } from '@/components/study/AiAssist';
import PracticeManual from '@/components/study/PracticeManual';
import { chartSummary } from '@/lib/study/serialize';
import { T, TRACK, SHAPE, FONT } from '@/components/study/type';

const JU_OPTIONS = [
  { name: '水二局', n: 2 },
  { name: '木三局', n: 3 },
  { name: '金四局', n: 4 },
  { name: '土五局', n: 5 },
  { name: '火六局', n: 6 },
];

/** 随机生辰：日期限制在 1–28 日，规避闰月与月末边界，聚焦推盘规则本身 */
function randomBirth(): BirthInfo {
  const year = 1955 + Math.floor(Math.random() * 51);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const hour = Math.floor(Math.random() * 12);
  const gender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
  return { year, month, day, hour, gender };
}

/** 天府与紫微以寅申为轴对称；优先从盘面反查，查不到再用公式兜底 */
function tianfuPosOf(chart: ZiweiChart): number {
  for (const p of chart.palaces) {
    if (p.stars.some((s) => s.name === '天府')) return p.branch;
  }
  return (((4 - chart.ziweiPos) % 12) + 12) % 12;
}

interface StepDef {
  title: string;
  hint: string;
  kind: 'monthday' | 'branch' | 'ju' | 'star';
  /** 对应知识条目：答完之后从这里回去看口径 */
  kb: { href: string; label: string };
}

const STEPS: StepDef[] = [
  { title: '农历换算', kind: 'monthday', hint: '公历转农历，注意闰月与子时换日（23:00 后按次日子时起）。', kb: { href: '/terms', label: '历法术语' } },
  { title: '定命宫', kind: 'branch', hint: '寅起正月，顺数至生月；再从生月宫起子时，逆数至生时，所落之宫即命宫。', kb: { href: '/knowledge/palace/ming', label: '命宫详解' } },
  { title: '定五行局', kind: 'ju', hint: '以命宫干支的纳音五行定局：水二、木三、金四、土五、火六。', kb: { href: '/knowledge/ziwei/overview', label: '紫微总览' } },
  { title: '安紫微', kind: 'branch', hint: '以五行局数与生日推紫微：局数作除数，商定宫位、余数调整，得紫微落宫。', kb: { href: '/knowledge/ziwei/overview', label: '紫微总览' } },
  { title: '安天府', kind: 'branch', hint: '紫微与天府以寅申为轴对称：紫微在寅则天府同宫，在卯则天府退一位，依此类推。', kb: { href: '/knowledge/tianfu/overview', label: '天府总览' } },
  { title: '定身宫', kind: 'branch', hint: '从生月宫起子时，顺数至生时，所落之宫即身宫（与命宫逆数相反）。', kb: { href: '/knowledge/palace/shen', label: '身宫详解' } },
  { title: '起四化', kind: 'star', hint: '依生年天干定四化：甲廉破武阳、乙机梁紫阴、丙同机昌廉、丁阴同机巨、戊贪阴右机、己武贪梁曲、庚阳武阴同、辛巨阳曲昌、壬梁紫辅武、癸破巨阴贪。', kb: { href: '/knowledge/ziwei/overview', label: '四化口径' } },
];

export default function PracticePage() {
  // 首帧必须服务端/客户端一致：先用固定盘占位，挂载后再换成随机盘。
  // 否则 useState 初始化里跑 Math.random() 会导致 SSR 与客户端拿到不同的盘，触发 React #418。
  const [chart, setChart] = useState<ZiweiChart>(() => generateChart({ year: 1990, month: 1, day: 1, hour: 6, gender: 'male' }));
  const [mounted, setMounted] = useState(false);  const [seed, setSeed] = useState(0);
  const [step, setStep] = useState(0);
  /** null=未答，true/false=已判 */
  const [results, setResults] = useState<(boolean | null)[]>(Array(7).fill(null));
  /** 每步用户答案，用于回显 */
  const [answers, setAnswers] = useState<(string | null)[]>(Array(7).fill(null));
  const [done, setDone] = useState(false);

  useEffect(() => {
    setChart(generateChart(randomBirth()));
    setMounted(true);
  }, []);

  // 当前步的输入暂存
  const [inMonth, setInMonth] = useState('');
  const [inDay, setInDay] = useState('');
  const [inBranch, setInBranch] = useState('');
  const [inJu, setInJu] = useState('');
  const [inLu, setInLu] = useState('');
  const [inJi, setInJi] = useState('');

  const b = chart.birthInfo;

  // ─── 标准答案（全部来自引擎输出）───
  const truth = useMemo(() => {
    const sihua = getSiHuaByStem(chart.lunarInfo.yearStem);
    return {
      lunarMonth: Math.abs(chart.lunarInfo.lunarMonth),
      lunarDay: chart.lunarInfo.lunarDay,
      isLeap: chart.lunarInfo.isLeapMonth,
      ming: chart.mingGongBranch,
      ju: chart.wuxingJu,
      ziwei: chart.ziweiPos,
      tianfu: tianfuPosOf(chart),
      shen: chart.shenGongBranch,
      lu: sihua['禄'],
      ji: sihua['忌'],
    };
  }, [chart]);

  const fourHuaStars = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < 10; i += 1) {
      const m = getSiHuaByStem(i);
      set.add(m['禄']); set.add(m['权']); set.add(m['科']); set.add(m['忌']);
    }
    return Array.from(set);
  }, []);

  function nextChart() {
    setChart(generateChart(randomBirth()));
    setStep(0);
    setResults(Array(7).fill(null));
    setAnswers(Array(7).fill(null));
    setDone(false);
    setInMonth(''); setInDay(''); setInBranch(''); setInJu(''); setInLu(''); setInJi('');
    setSeed((s) => s + 1);
  }

  function judge(): { ok: boolean; given: string; correct: string } | null {
    const def = STEPS[step];
    let ok = false;
    let given = '';
    let correct = '';
    if (def.kind === 'monthday') {
      ok = Number(inMonth) === truth.lunarMonth && Number(inDay) === truth.lunarDay;
      given = `${inMonth || '?'} 月 ${inDay || '?'} 日`;
      correct = `${truth.isLeap ? '闰' : ''}${truth.lunarMonth} 月 ${truth.lunarDay} 日`;
    } else if (def.kind === 'branch') {
      const branchIdx = BRANCHES.indexOf(inBranch);
      const target = step === 1 ? truth.ming : step === 3 ? truth.ziwei : step === 4 ? truth.tianfu : truth.shen;
      ok = branchIdx === target;
      given = inBranch || '（未选）';
      correct = `${BRANCHES[target]}宫`;
    } else if (def.kind === 'ju') {
      const juN = JU_OPTIONS.find((j) => j.name === inJu)?.n;
      ok = juN === truth.ju;
      given = inJu || '（未选）';
      correct = `${chart.wuxingJuName}（${truth.ju} 局）`;
    } else {
      ok = inLu === truth.lu && inJi === truth.ji;
      given = `禄：${inLu || '?'}／忌：${inJi || '?'}`;
      correct = `禄：${truth.lu}／忌：${truth.ji}`;
    }
    return { ok, given, correct };
  }

  function submit() {
    const r = judge();
    if (!r) return;
    const nextR = [...results];
    nextR[step] = r.ok;
    setResults(nextR);
    const nextA = [...answers];
    nextA[step] = r.given;
    setAnswers(nextA);
    if (r.ok) {
      if (step === 6) {
        const allOk = nextR.every(Boolean);
        saveRun(nextR.map((x) => Boolean(x)));
        setDone(true);
      }
    }
  }

  function goNext() {
    if (step < 6) {
      setStep(step + 1);
      setInBranch('');
    }
  }

  const canSubmit = (() => {
    const def = STEPS[step];
    if (def.kind === 'monthday') return !!inMonth && !!inDay;
    if (def.kind === 'branch') return !!inBranch;
    if (def.kind === 'ju') return !!inJu;
    return !!inLu && !!inJi;
  })();

  const currentAnswer = results[step];
  const score = results.filter(Boolean).length;

  // ─── 完成页 ───
  if (done) {
    const prog = loadProgress();
    const weak = weakestStep(prog);
    return (
      <div style={{ padding: '32px 24px 60px', maxWidth: 860, margin: '0 auto' }}>
        <Card>
          <div style={{ fontSize: T.sub, letterSpacing: TRACK.eyebrow, color: C.ink3 }}>本盘完成</div>
          <h1 style={{ fontSize: T.hero, fontWeight: 700, letterSpacing: TRACK.title, margin: '10px 0 6px' }}>
            {score} <span style={{ fontSize: T.h3, color: C.ink3, letterSpacing: TRACK.title }}>/ 7 步</span>
          </h1>
          <p style={{ fontSize: T.body, color: C.ink2, lineHeight: 1.9 }}>
            {b.year}.{b.month}.{b.day} · {BRANCHES[b.hour]}时 · {b.gender === 'male' ? '男' : '女'}
          </p>

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} style={{
                textAlign: 'center', padding: '8px 4px', borderRadius: SHAPE.radiusBtn, fontSize: T.eyebrow,
                border: `1px solid ${results[i] ? `${mix(SIHUA_COLORS.禄, 40)}` : `${mix(C.cinnabar, 40)}`}`,
                background: results[i] ? `${mix(SIHUA_COLORS.禄, 8)}` : `${mix(C.cinnabar, 6)}`,
                color: results[i] ? SIHUA_COLORS.禄 : C.cinnabar,
              }}>
                {i + 1}. {s.title}
              </div>
            ))}
          </div>

          {score < 7 && (
            <div style={{ marginTop: 18, fontSize: T.body, color: C.ink2, lineHeight: 1.9 }}>
              本盘卡在：<strong style={{ color: C.cinnabar }}>{STEPS[results.findIndex((r) => !r)].title}</strong>
              （{STEPS[results.findIndex((r) => !r)].hint}）
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: T.sub, color: C.ink3, lineHeight: 1.9 }}>
            累计练盘 {prog.runs} 张，错项 {prog.wrongTotal} 条
            {weak ? `；目前最薄弱的一步是「${weak.label}」（正确率 ${Math.round(weak.rate * 100)}%）` : ''}
          </div>

          {/* 按弱项出题：只在这一步需要额外练的时候出现 */}
          <AiAssist
            task="quiz"
            cta={weak ? `围绕「${weak.label}」再出三道题` : '再出三道题巩固'}
            note="带答案与推法，答案在末尾"
            cacheKey={`quiz-${seed}`}
            vars={{
              step: weak ? weak.label : STEPS[results.findIndex((r) => !r)]?.title ?? '七步全程',
              chart: chartSummary(chart),
            }}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <Btn primary onClick={nextChart}>再来一盘</Btn>
            <a href="/study" style={{ textDecoration: 'none' }}>
              <Btn>返回研习首页</Btn>
            </a>
          </div>
        </Card>
      </div>
    );
  }

  // ─── 分步作答 ───
  return (
    <div style={{ padding: '32px 24px 60px', maxWidth: 860, margin: '0 auto' }}>
      <PageHead
        title="手工推演"
        desc="按七步推一张盘，每步单独核对 —— 错在哪一步，才是要补的地方。"
      />

      {/* 不会推的先看手册：手册在页面下半部，这里给一个入口，免得新人一上来就懵 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        margin: '-6px 0 14px', padding: '10px 14px', borderRadius: SHAPE.radiusBtn,
        background: C.card, border: `1px solid ${C.line}`, borderLeft: `2px solid ${C.gold}`,
        fontSize: T.sub, color: C.ink2, lineHeight: 1.85,
      }}>
        <span style={{ color: C.gold, letterSpacing: '0.16em', fontSize: T.micro }}>新手先看</span>
        <span>七步怎么算、每一步的常见错与自检，都在下面的「手工推盘手册」里。</span>
        <a href="#manual" style={{ color: C.gold, textDecoration: 'none', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          去看手册 ↓
        </a>
      </div>

      {/* 题面：只给公历，不给农历（那是第①步的答案） */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: T.eyebrow, letterSpacing: TRACK.eyebrow, color: C.ink3 }}>第 {seed + 1} 盘 · 题面</div>
            <div style={{ fontSize: T.h2, marginTop: 8, letterSpacing: TRACK.title }}>
              公历 {b.year} 年 {b.month} 月 {b.day} 日 · {BRANCHES[b.hour]}时 · {b.gender === 'male' ? '男' : '女'}
            </div>
          </div>
          <Btn onClick={nextChart} disabled={!mounted}>换一盘</Btn>
        </div>
      </Card>

      {/* 步骤条 */}
      <div style={{ display: 'flex', gap: 6, margin: '18px 0' }}>
        {STEPS.map((s, i) => (
          <div key={s.title} style={{
            flex: 1, height: 4, borderRadius: 4,
            background: results[i] === true ? SIHUA_COLORS.禄 : results[i] === false ? C.cinnabar : (i === step ? C.gold : C.line),
          }} />
        ))}
      </div>

      {/* 已完成步骤回显 */}
      {STEPS.map((s, i) => {
        if (results[i] === null) return null;
        const ok = results[i] === true;
        return (
          <div key={s.title} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6,
            background: C.card, border: `1px solid ${C.line}`, borderLeft: `3px solid ${ok ? SIHUA_COLORS.禄 : C.cinnabar}`,
            borderRadius: SHAPE.radiusBtn, fontSize: T.body,
          }}>
            <span style={{ color: ok ? SIHUA_COLORS.禄 : C.cinnabar, fontWeight: 700 }}>{ok ? '✓' : '✕'}</span>
            <span style={{ color: C.ink2 }}>{i + 1}. {s.title}</span>
            <span style={{ color: C.ink3, marginLeft: 'auto' }}>你答：{answers[i]}</span>
          </div>
        );
      })}

      {/* 当前步 */}
      {results[step] === null && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', background: `${mix(C.gold, 12)}`,
              color: C.gold, fontSize: T.body, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            }}>{step + 1}</span>
            <div style={{ fontSize: T.h3, letterSpacing: TRACK.title }}>{STEPS[step].title}</div>
            <span style={{ marginLeft: 'auto', fontSize: T.micro, color: C.ink3, fontFamily: FONT.mono }}>
              第 {step + 1} 步 / 共 {STEPS.length} 步
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: T.sub, color: C.ink3, lineHeight: 1.9, background: C.paper, padding: '10px 12px', borderRadius: SHAPE.radiusBtn }}>
            推法：{STEPS[step].hint}
          </div>

          {/* 输入区 */}
          <div style={{ marginTop: 18 }}>
            {STEPS[step].kind === 'monthday' && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Select value={inMonth} onChange={setInMonth} placeholder="农历月" options={Array.from({ length: 12 }, (_, i) => i + 1)} />
                <Select value={inDay} onChange={setInDay} placeholder="农历日" options={Array.from({ length: 30 }, (_, i) => i + 1)} />
              </div>
            )}
            {STEPS[step].kind === 'branch' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {BRANCHES.map((br) => (
                  <Chip key={br} active={inBranch === br} onClick={() => setInBranch(br)}>{br}</Chip>
                ))}
              </div>
            )}
            {STEPS[step].kind === 'ju' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {JU_OPTIONS.map((j) => (
                  <Chip key={j.name} active={inJu === j.name} onClick={() => setInJu(j.name)}>{j.name}</Chip>
                ))}
              </div>
            )}
            {STEPS[step].kind === 'star' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[{ label: '化禄星', v: inLu, set: setInLu }, { label: '化忌星', v: inJi, set: setInJi }].map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: T.sub, color: C.ink2, width: 56 }}>{f.label}</span>
                    {fourHuaStars.map((s) => (
                      <Chip key={s} active={f.v === s} onClick={() => f.set(s)}>{s}</Chip>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn primary onClick={submit} disabled={!canSubmit}>核对这一步</Btn>
          </div>
        </Card>
      )}

      {/* 判分结果 */}
      {results[step] !== null && !done && (
        <Card>
          <div style={{ fontSize: T.body, letterSpacing: TRACK.eyebrow, color: currentAnswer ? SIHUA_COLORS.禄 : C.cinnabar }}>
            {currentAnswer ? '这一步对了' : '这一步不对'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: T.body }}>
            <div><span style={{ color: C.ink3 }}>你的答案：</span>{answers[step]}</div>
            <div><span style={{ color: C.ink3 }}>正解：</span>
              <strong style={{ color: C.ink }}>
                {step === 0 && `${truth.isLeap ? '闰' : ''}${truth.lunarMonth} 月 ${truth.lunarDay} 日`}
                {step === 1 && `${BRANCHES[truth.ming]}宫`}
                {step === 2 && `${chart.wuxingJuName}`}
                {step === 3 && `${BRANCHES[truth.ziwei]}宫`}
                {step === 4 && `${BRANCHES[truth.tianfu]}宫`}
                {step === 5 && `${BRANCHES[truth.shen]}宫`}
                {step === 6 && `禄 ${truth.lu}／忌 ${truth.ji}`}
              </strong>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: T.sub, color: C.ink3, lineHeight: 1.9 }}>{STEPS[step].hint}</div>
          <div style={{ marginTop: 8, fontSize: T.sub }}>
            <span style={{ color: C.ink3 }}>这一步的口径在：</span>
            <Link href={STEPS[step].kb.href} style={{ color: C.gold, textDecoration: 'none' }}>
              {STEPS[step].kb.label} →
            </Link>
          </div>
          <ReasonBox
            step={STEPS[step].title}
            question={`第 ${seed + 1} 盘：公历 ${b.year}.${b.month}.${b.day} ${BRANCHES[b.hour]}时 ${b.gender === 'male' ? '男' : '女'}，求「${STEPS[step].title}」`}
            truth={
              step === 0 ? `${truth.isLeap ? '闰' : ''}${truth.lunarMonth} 月 ${truth.lunarDay} 日`
                : step === 1 ? `${BRANCHES[truth.ming]}宫`
                  : step === 2 ? `${chart.wuxingJuName}`
                    : step === 3 ? `${BRANCHES[truth.ziwei]}宫`
                      : step === 4 ? `${BRANCHES[truth.tianfu]}宫`
                        : step === 5 ? `${BRANCHES[truth.shen]}宫`
                          : `化禄 ${truth.lu}／化忌 ${truth.ji}`
            }
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {step < 6
              ? <Btn primary onClick={goNext}>{currentAnswer ? '下一步' : '继续往下（记下这一步）'}</Btn>
              : <Btn primary onClick={() => { if (results[6] === true) { saveRun(results.map((x) => Boolean(x))); setDone(true); } }}>完成本盘</Btn>}
          </div>
        </Card>
      )}

      <PracticeManual />
    </div>
  );
}
