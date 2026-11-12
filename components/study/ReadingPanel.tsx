'use client';

/**
 * ReadingPanel —— 解盘主体（六层判据 + 七问 + AI 区）
 *
 * 为什么把它抽成组件：
 *   排盘和解盘本来是同一件事的两个半场。用户在 /chart 起完盘，就该在同一张盘上往下读，
 *   而不是跳到另一个页面、再把生辰填一遍（填两遍既啰嗦，还容易前后不一致）。
 *   所以这一整块「怎么读」的界面放在这里，/chart 就地展开用它，/study/interpret 也用它，
 *   两边共用同一份判据，不会出现「两个页面判语不一样」。
 *
 * 判据全部由 lib/ziwei/reading.ts 在本地从盘面取数生成，不经过模型；
 * 模型只在最后一段被调用，而且只许引用这些事实。
 */

import Markdown from '@/components/study/Markdown';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BRANCHES } from '@/lib/ziwei/constants';
import type { ZiweiChart } from '@/lib/ziwei/types';
import {
  buildAskPrompt,
  buildQuestions,
  buildReading,
  groupReading,
  type ReadingPoint,
  type ReadingQuestion,
} from '@/lib/ziwei/reading';
import { birthText, chartSummary, daxianText, lunarText, palaceText } from '@/lib/study/serialize';
import { buildAdvice, buildAdvicePrompt, type Advice } from '@/lib/ziwei/advice';
import AdvicePanel from '@/components/study/AdvicePanel';
import { buildPrompt, loadPrompts, type PromptTemplate } from '@/lib/study/prompts';
import { isAiConfigured, loadAiConfig } from '@/lib/study/ai-config';
import { chat } from '@/lib/ai/chat';
import { PAPER_COLORS as C, SIHUA_COLORS, SURFACE, SHADOW, TINT, mix } from '@/components/study/paper';
import { FONT, T, TRACK, SHAPE } from '@/components/study/type';
import { Btn, Card } from '@/components/study/ui';
import { useSettings } from '@/components/study/settings-context';
import { FollowUpBox } from '@/components/study/AiAssist';

const VERDICT_COLOR = {
  good: SIHUA_COLORS.禄,
  caution: SIHUA_COLORS.忌,
  neutral: 'var(--zw-gold)',
} as const;

export default function ReadingPanel({
  chart,
  onLocatePalace,
  palaceHref,
  title = '解盘',
  kicker = '明盘 · 六层读法',
  intro,
}: {
  chart: ZiweiChart;
  /** 有它就在盘面页内跳宫；没有就按 palaceHref / 默认链接跳过去 */
  onLocatePalace?: (branch: number) => void;
  palaceHref?: (branch: number) => string;
  title?: string;
  kicker?: string;
  intro?: string;
}) {
  const { open } = useSettings();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [tplId, setTplId] = useState('overview');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aiName, setAiName] = useState('');
  const [toast, setToast] = useState('');
  const [askLabel, setAskLabel] = useState('');

  const aiRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = loadPrompts();
    setTemplates(t);
    setTplId(t[0]?.id ?? 'overview');
    const cfg = loadAiConfig();
    setAiName(isAiConfigured(cfg) ? cfg.model : '');
  }, []);

  const tpl = useMemo(() => templates.find((t) => t.id === tplId), [templates, tplId]);
  const points = useMemo<ReadingPoint[]>(() => buildReading(chart), [chart]);
  const groups = useMemo(() => groupReading(points), [points]);
  const questions = useMemo<ReadingQuestion[]>(() => buildQuestions(chart), [chart]);

  // 起盘一变，模板提示词跟着重渲染（判据与盘面同步，不留上一张盘的旧文本）
  useEffect(() => {
    if (!templates.length) return;
    setPrompt(renderTemplate(chart, tpl));
    setAnswer('');
    setAskLabel('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, tpl, templates.length]);

  function renderTemplate(c: ZiweiChart | null, template: PromptTemplate | undefined) {
    if (!c || !template) return '';
    return buildPrompt(template.body, {
      chart: chartSummary(c),
      lunar: lunarText(c),
      birth: birthText(c),
      palace: palaceText(c, c.mingGongBranch),
      daxian: daxianText(c),
    });
  }

  function askAbout(kind: 'point' | 'question', item: ReadingPoint | ReadingQuestion) {
    const p = buildAskPrompt(chart, {
      summary: chartSummary(chart),
      ...(kind === 'point' ? { point: item as ReadingPoint } : { question: item as ReadingQuestion }),
    });
    setPrompt(p);
    setAskLabel(
      kind === 'point'
        ? `就「${(item as ReadingPoint).title}」解盘`
        : `就第 ${questions.indexOf(item as ReadingQuestion) + 1} 问解盘`,
    );
    setAnswer('');
    setError('');
    aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void runAi(p);
  }

  /** 点建议卡上的「深挖这一维」：只谈这一件事，事实仍由本地取好 */
  function askAdvice(a: Advice) {
    const p = buildAdvicePrompt(chart, a, chartSummary(chart));
    setPrompt(p);
    setAskLabel(`就「${a.label}」这一维出方案`);
    setAnswer('');
    setError('');
    aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void runAi(p);
  }

  async function runAi(text?: string) {
    const body = text ?? prompt;
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    setAnswer('');
    const cfg = loadAiConfig();
    if (!isAiConfigured(cfg)) {
      setBusy(false);
      open('ai');
      return;
    }
    try {
      const r = await chat({
        prompt: body,
        config: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model },
      });
      if (!r.ok) setError(r.error || '调用失败');
      else {
        setAnswer(r.text);
        setAiName(cfg.model);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setBusy(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setToast('提示词已复制');
    } catch {
      setToast('复制失败，请手动全选');
    }
    window.setTimeout(() => setToast(''), 1800);
  }

  function downloadMd() {
    const parts = [
      '# 紫微命盘解盘',
      '',
      '## 出生信息',
      birthText(chart),
      '',
      '## 农历与四柱',
      lunarText(chart),
      '',
      '## 盘面',
      '```',
      chartSummary(chart),
      '```',
      '',
      '## 六层判据（本地取数，不含模型解读）',
      ...points.map(
        (p) => `### ${p.title}\n- 盘上事实：${p.fact}\n- 读法：${p.rule}\n- 判语：${p.reading}\n- 前提：${p.caveat ?? '—'}\n- 出处：${p.source}`,
      ),
      '',
      '## 六维建议（本地取数）',
      ...buildAdvice(chart).flatMap((a) => [
        `### ${a.label}｜${a.headline}`,
        ...a.basis.map((b) => `- 依据：${b}`),
        ...a.do.map((d) => `- 做：${d}`),
        ...a.avoid.map((d) => `- 避：${d}`),
        `- 时间窗口：${a.window}`,
      ]),
      '',
      '## AI 解读',
      answer || '（未调用）',
    ];
    const blob = new Blob([parts.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ziwei-interpret.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  const curDaXian = chart.daXians.find((d) => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge);
  const mingPalace = chart.palaces.find((p) => p.branch === chart.mingGongBranch);
  const shenPalace = chart.palaces.find((p) => p.branch === chart.shenGongBranch);

  return (
    <div>
      {(title || intro) && (
        <header style={{ marginBottom: 18 }}>
          {kicker && (
            <div style={{ fontSize: T.eyebrow, letterSpacing: TRACK.eyebrow, color: C.gold, marginBottom: 10 }}>
              {kicker}
            </div>
          )}
          {title && (
            <h2 style={{
              margin: 0, fontFamily: FONT.display, fontSize: T.h1, fontWeight: 700,
              letterSpacing: TRACK.title, color: C.ink,
            }}>{title}</h2>
          )}
          {intro && (
            <p style={{ margin: '10px 0 0', fontSize: T.body, color: C.ink2, lineHeight: 1.95, maxWidth: 780 }}>
              {intro}
            </p>
          )}
        </header>
      )}

      {/* ── 盘面速读条 ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 26,
      }}>
        {[
          {
            k: '命宫',
            v: `${BRANCHES[chart.mingGongBranch]} · ${mingPalace?.name ?? '—'}`,
            d: mingPalace?.stars.filter((s) => s.type === 'major').map((s) => s.name).join('、') || '空宫',
          },
          {
            k: '身宫',
            v: chart.shenGongBranch === chart.mingGongBranch
              ? '与命宫同宫'
              : `${BRANCHES[chart.shenGongBranch]} · ${shenPalace?.name ?? '—'}`,
            d: chart.shenGongBranch === chart.mingGongBranch ? '身命同宫：性格即命运' : '后半生着力处',
          },
          { k: '五行局', v: chart.wuxingJuName, d: `命主 ${chart.mingZhu ?? '—'}／身主 ${chart.shenZhu ?? '—'}` },
          {
            k: '当下大限',
            v: curDaXian ? `${curDaXian.startAge}–${curDaXian.endAge} 岁` : '—',
            d: curDaXian ? (curDaXian.palaceName.endsWith('宫') ? curDaXian.palaceName : `${curDaXian.palaceName}宫`) : '—',
          },
        ].map((x) => (
          <div key={x.k} style={{
            background: SURFACE.panel, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
            padding: '13px 16px 14px',
          }}>
            <div style={{ fontSize: T.micro, letterSpacing: TRACK.label, color: C.ink3 }}>{x.k}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 18, color: C.ink, marginTop: 5, letterSpacing: '0.02em' }}>{x.v}</div>
            <div style={{ fontSize: T.meta, color: C.ink3, marginTop: 3 }}>{x.d}</div>
          </div>
        ))}
      </div>

      {/* ── 主体：左判据，右七问 ── */}
      <div className="zw-reading-grid" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 352px', gap: 22, alignItems: 'start',
      }}>
        <div>
          {groups.map((g, gi) => (
            <section key={g.meta.id} style={{ marginBottom: gi === groups.length - 1 ? 0 : 34 }}>
              <SectionHead ordinal={g.meta.ordinal} name={g.meta.name} question={g.meta.question} method={g.meta.method} />
              <div style={{ display: 'grid', gap: 12 }}>
                {g.points.map((p) => (
                  <PointCard
                    key={p.id}
                    point={p}
                    onAsk={() => askAbout('point', p)}
                    onLocate={onLocatePalace}
                    palaceHref={palaceHref}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside style={{ position: 'sticky', top: 24, display: 'grid', gap: 12 }}>
          <div style={{
            background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
            boxShadow: SHADOW.card, padding: '18px 18px 16px',
          }}>
            <div style={{ fontSize: T.h2, fontFamily: FONT.display, color: C.ink, letterSpacing: TRACK.title }}>解盘七问</div>
            <div style={{ fontSize: T.sub, color: C.ink3, lineHeight: 1.85, marginTop: 6 }}>
              一次只问一件事。每一问都把该看的宫位先摆出来，模型只好在这一格上讲，不容易滑成通稿。
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
              {questions.map((q, i) => (
                <QuestionCard key={q.id} index={i + 1} q={q} onAsk={() => askAbout('question', q)} />
              ))}
            </div>
          </div>

          <div style={{
            background: SURFACE.panel, border: `1px dashed ${mix(C.line, 130)}`, borderRadius: SHAPE.radiusCard,
            padding: '14px 16px', fontSize: T.sub, color: C.ink2, lineHeight: 1.9,
          }}>
            <strong style={{ color: C.ink, fontWeight: 600 }}>三条读盘纪律</strong>
            <div style={{ marginTop: 6 }}>
              一、别拿一条判语当判决 —— 宫与宫联动，看的是结构，不是单颗星。<br />
              二、先看「顺」再看「卡」 —— 生年禄是入口，忌是课题，入口没找对，谈忌没意义。<br />
              三、十年看大限，一年看流年 —— 用错时间尺度，容易把大运当成偶然。
            </div>
          </div>
        </aside>
      </div>

      {/* ── 六维建议：判据讲「是什么」，这里讲「怎么做」 ── */}
      <AdvicePanel chart={chart} onAsk={askAdvice} />

      {/* ── AI 区 ── */}
      <div ref={aiRef} style={{ marginTop: 40 }}>
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ fontSize: T.h2, fontFamily: FONT.display, color: C.ink, letterSpacing: TRACK.title }}>
              交给模型：只许引用，不许发挥
            </div>
            <select
              value={tplId}
              onChange={(e) => {
                setTplId(e.target.value);
                setPrompt(renderTemplate(chart, templates.find((x) => x.id === e.target.value)));
                setAskLabel('');
              }}
              style={selectStyle}
            >
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <span style={{ fontSize: T.meta, color: C.ink3 }}>{askLabel || '当前：整体解盘（模板）'}</span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%', minHeight: 260, padding: 16, background: SURFACE.panel,
              border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn,
              fontSize: 13.5, lineHeight: 1.95, color: C.ink, fontFamily: FONT.sans,
              resize: 'vertical', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn primary onClick={() => runAi()} disabled={busy}>
              {busy ? '解盘中…' : aiName ? `用 ${aiName} 解盘` : '解盘（先配模型）'}
            </Btn>
            <Btn onClick={copyPrompt}>复制提示词</Btn>
            <Btn onClick={downloadMd} disabled={!answer}>导出 .md（含六层判据）</Btn>
            <Btn onClick={() => open('prompts')}>改提示词</Btn>
            <Btn onClick={() => open('ai')}>模型设置</Btn>
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 13.5, color: C.cinnabar, lineHeight: 1.9 }}>{error}</div>}
        </Card>

        {answer && (
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontSize: T.h2, fontFamily: FONT.display, color: C.ink, letterSpacing: TRACK.title, marginBottom: 12 }}>
              解盘结果
            </div>
            <Markdown text={answer} size={15.5} />
            <FollowUpBox context={answer} />
            <div style={{
              marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.line}`,
              fontSize: T.meta, color: C.ink3, lineHeight: 1.9,
            }}>
              命盘只讲倾向，选择权在人。身体的事请就医，本页不构成诊断；文中的「宜」「忌」是用力方向，不是吉凶判决。
            </div>
          </Card>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: C.ink, color: C.paper, fontSize: 13.5, letterSpacing: '0.1em',
          padding: '10px 20px', borderRadius: SHAPE.radiusBtn, zIndex: 50,
        }}>{toast}</div>
      )}
    </div>
  );
}

/* ───────────────── 子组件 ───────────────── */

function SectionHead({ ordinal, name, question, method }: { ordinal: string; name: string; question: string; method: string }) {
  return (
    <header style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{
          width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.gold}`, color: C.gold, fontFamily: FONT.display, fontSize: 16, flexShrink: 0,
          transform: 'translateY(2px)',
        }}>{ordinal}</span>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: T.h1, fontWeight: 700, color: C.ink, letterSpacing: TRACK.title }}>
          {name}
        </h2>
        <span style={{ fontSize: T.bodyLg, color: C.ink2 }}>{question}</span>
      </div>
      <p style={{ margin: '10px 0 0 42px', fontSize: T.sub, color: C.ink3, lineHeight: 1.95, maxWidth: 720 }}>{method}</p>
    </header>
  );
}

function PointCard({
  point,
  onAsk,
  onLocate,
  palaceHref,
}: {
  point: ReadingPoint;
  onAsk: () => void;
  onLocate?: (branch: number) => void;
  palaceHref?: (branch: number) => string;
}) {
  const accent = VERDICT_COLOR[point.verdict];
  return (
    <article style={{
      position: 'relative', background: C.card, border: `1px solid ${C.line}`,
      borderRadius: SHAPE.radiusCard, boxShadow: SHADOW.card,
      padding: '18px 20px 16px', overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent, opacity: 0.9 }} />
      <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 600, color: C.ink, letterSpacing: '0.01em' }}>{point.title}</h3>

      <div style={{
        marginTop: 10, padding: '10px 12px', background: C.paper, border: `1px solid ${mix(C.line, 90)}`,
        borderRadius: 8, fontFamily: FONT.mono, fontSize: 12.5, lineHeight: 1.85, color: C.ink2, whiteSpace: 'pre-wrap',
      }}>{point.fact}</div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: T.micro, letterSpacing: TRACK.label, color: C.ink3 }}>怎么读</div>
        <div style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.9, marginTop: 3 }}>{point.rule}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: T.micro, letterSpacing: TRACK.label, color: C.gold }}>判语</div>
        <div style={{ fontSize: 15.5, color: C.ink, lineHeight: 2, marginTop: 4, whiteSpace: 'pre-wrap' }}>{point.reading}</div>
      </div>

      {point.caveat && (
        <div style={{ marginTop: 12, fontSize: T.sub, color: C.ink3, lineHeight: 1.9 }}>
          <span style={{ color: C.ink2 }}>前提：</span>{point.caveat}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 10,
        borderTop: `1px solid ${mix(C.line, 70)}`, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: T.meta, color: C.ink3, flex: 1, minWidth: 200 }}>出处 · {point.source}</span>
        {point.palaceBranch !== undefined && (
          onLocate ? (
            <button
              type="button"
              onClick={() => onLocate(point.palaceBranch as number)}
              style={{
                fontSize: T.meta, color: C.ink2, background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `1px dotted ${C.line}`, padding: 0, fontFamily: 'inherit',
              }}
            >在盘上看这一宫</button>
          ) : (
            <a
              href={palaceHref ? palaceHref(point.palaceBranch as number) : `/chart?branch=${point.palaceBranch}`}
              style={{ fontSize: T.meta, color: C.ink2, textDecoration: 'none', borderBottom: `1px dotted ${C.line}` }}
            >去盘上看这一宫</a>
          )
        )}
        <button
          type="button"
          onClick={onAsk}
          style={{
            padding: '6px 14px', borderRadius: SHAPE.radiusChip, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: T.sub, background: TINT.ming, color: C.ink,
            border: `1px solid ${mix(C.gold, 55)}`,
          }}
        >就这条问 AI</button>
      </div>
    </article>
  );
}

function QuestionCard({ index, q, onAsk }: { index: number; q: ReadingQuestion; onAsk: () => void }) {
  return (
    <button
      type="button"
      onClick={onAsk}
      style={{
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%',
        background: SURFACE.panel, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn,
        padding: '11px 13px', transition: 'border-color .15s ease, background .15s ease',
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.gold, flexShrink: 0 }}>{String(index).padStart(2, '0')}</span>
        <span style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.75 }}>{q.text}</span>
      </div>
      <div style={{ fontSize: T.meta, color: C.ink3, lineHeight: 1.8, marginTop: 5, paddingLeft: 27 }}>{q.why}</div>
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '9px 11px', fontSize: 15, fontFamily: 'inherit', borderRadius: SHAPE.radiusBtn,
  border: `1px solid ${C.line}`, background: C.card, color: C.ink, outline: 'none',
};
