'use client';

/**
 * SettingsPanel —— 设置面板（模型 + 提示词）
 *
 * 为什么把「提示词工坊」和「AI 配置」合成一个面板并做成弹窗：
 *   解盘的成败一半在提示词、一半在模型。原来提示词是一整页、模型藏在 .env 里，
 *   调一次口径就要离开当前盘面 —— 而调口径恰恰是最需要「对着盘面调」的动作。
 *   收进弹窗后，盘面留在背后，改完保存、关掉，继续用。
 *
 * 这个组件既用于弹窗，也用于 /study/prompts 独立页（embedded），避免两套 UI 分叉。
 */

import { useEffect, useMemo, useState } from 'react';
import { BUILTIN_PROMPTS, buildPrompt, loadPrompts, resetPromptBody, savePromptBody, type PromptTemplate } from '@/lib/study/prompts';
import { AI_TASKS, loadAiTasks, resetAiTaskBody, saveAiTaskBody, type AiTask } from '@/lib/study/prompts';
import { generateChart } from '@/lib/ziwei/algorithm';
import { chat } from '@/lib/ai/chat';
import { birthText, chartSummary, daxianText, lunarText, palaceText } from '@/lib/study/serialize';
import {
  AI_PRESETS, AI_PROVIDER_ORDER, clearAiConfig, defaultAiConfig, isAiConfigured, loadAiConfig, saveAiConfig,
  type AiConfig, type AiProviderId,
} from '@/lib/study/ai-config';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { FONT, T, TRACK } from '@/components/study/type';
import { DENSITIES, clearSavedDensity, readSavedDensity, resolveDensity, saveDensity, type DensityId } from '@/components/study/density';
import { SKINS } from '@/components/study/themes';
import { useSkin } from '@/components/study/skin-context';
import {
  SCHOOL_DEFAULT_CONFIG, SCHOOL_LABELS, SCHOOL_OPTIONS, loadSchoolConfig, resetSchoolConfig, saveSchoolConfig,
  type SchoolConfig,
} from '@/lib/ziwei/school-config';

const SAMPLE_CHART = generateChart({ year: 1990, month: 1, day: 1, hour: 6, gender: 'male' });

const VARS: { key: string; desc: string }[] = [
  { key: '{{chart}}', desc: '全盘摘要：十二宫星曜、四化、空宫借星、大限' },
  { key: '{{lunar}}', desc: '农历日期与四柱' },
  { key: '{{birth}}', desc: '公历、时辰、性别、出生地' },
  { key: '{{palace}}', desc: '单宫细解时选中的宫位' },
  { key: '{{daxian}}', desc: '当前大限（宫位、宫干、四化）' },
];

export type SettingsTab = 'ai' | 'prompts' | 'appearance' | 'rules';
type Tab = SettingsTab;

export default function SettingsPanel({ embedded = false, initialTab = 'ai' }: { embedded?: boolean; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [toast, setToast] = useState('');

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1900);
  }

  return (
    <div>
      {/* 分栏切换 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([['ai', '解盘模型'], ['prompts', '提示词'], ['appearance', '外观'], ['rules', '排盘规则']] as [Tab, string][]).map(([id, label]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                padding: '8px 16px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 14, letterSpacing: '0.08em',
                background: on ? C.ink : 'transparent', color: on ? C.paper : C.ink2,
                border: `1px solid ${on ? C.ink : C.line}`,
              }}
            >{label}</button>
          );
        })}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12.5, color: C.ink3, letterSpacing: '0.04em' }}>
          {embedded ? '设置会立刻作用于「解盘分析」' : '改完保存，关闭弹窗即可继续用盘面'}
        </span>
      </div>

      {tab === 'ai' && <AiSection onSaved={flash} />}
      {tab === 'prompts' && <PromptsSection onSaved={flash} />}
      {tab === 'appearance' && <AppearanceSection />}
      {tab === 'rules' && <RulesSection onSaved={flash} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 34, left: '50%', transform: 'translateX(-50%)',
          background: C.ink, color: C.paper, fontSize: 13.5, letterSpacing: '0.1em',
          padding: '10px 20px', borderRadius: 8, zIndex: 90, pointerEvents: 'none',
        }}>{toast}</div>
      )}
    </div>
  );
}

/* ────────────────────────── 模型配置 ────────────────────────── */

function AiSection({ onSaved }: { onSaved: (msg: string) => void }) {
  const [cfg, setCfg] = useState<AiConfig>(defaultAiConfig);
  const [mounted, setMounted] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setCfg(loadAiConfig());
    setMounted(true);
  }, []);

  const configured = isAiConfigured(cfg);

  function pickProvider(id: AiProviderId) {
    const p = AI_PRESETS[id];
    setCfg({ ...cfg, provider: id, baseUrl: p.baseUrl, model: p.model });
    setProbe(null);
  }

  function save() {
    saveAiConfig(cfg);
    onSaved('模型配置已保存到本机');
  }

  async function test() {
    if (!configured) {
      setProbe({ ok: false, text: '先填 API Key 再测' });
      return;
    }
    setTesting(true);
    setProbe(null);
    try {
      const r = await chat({ prompt: '连通性测试：只回复两个字「收到」即可。', probe: true, config: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model } });
      if (r.ok) {
        setProbe({ ok: true, text: `连通正常，模型 ${cfg.model} 已响应` });
      } else {
        setProbe({ ok: false, text: r.error || '模型没有响应' });
      }
    } catch (err) {
      setProbe({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  function reset() {
    clearAiConfig();
    setCfg(defaultAiConfig());
    setProbe(null);
    onSaved('已清空本机密钥与配置');
  }

  return (
    <div>
      {/* 状态条 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '12px 14px', borderRadius: 8, marginBottom: 18,
        background: C.paper, border: `1px solid ${C.line}`,
      }}>
        <span style={{
          fontSize: 12, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 3,
          color: configured ? '#4C8C5A' : C.ink3,
          border: `1px solid ${configured ? 'rgba(76,140,90,0.35)' : C.line}`,
        }}>{configured ? '已配置' : '未配置'}</span>
        <span style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7 }}>
          {configured
            ? '解盘按钮会直接调用你填的模型'
            : '未填密钥时，「解盘」只生成提示词，可复制到任意 AI 工具用'}
        </span>
      </div>

      {/* 服务商 */}
      <Label text="服务商" hint="选预设会自动带出地址与模型，可再手改" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        {AI_PROVIDER_ORDER.map((id) => {
          const on = cfg.provider === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => pickProvider(id)}
              style={{
                padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
                background: on ? C.navy : C.paper, color: on ? '#F7F4EC' : C.ink2,
                border: `1px solid ${on ? C.navy : C.line}`,
              }}
            >{AI_PRESETS[id].label}</button>
          );
        })}
      </div>
      <Hint text={AI_PRESETS[cfg.provider].hint} />

      <div style={{ height: 16 }} />

      {/* 地址 + 模型 */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
        <div>
          <Label text="接口地址（Base URL）" />
          <TextInput
            value={cfg.baseUrl}
            onChange={(v) => { setCfg({ ...cfg, baseUrl: v }); setProbe(null); }}
            placeholder="https://api.deepseek.com/v1"
          />
        </div>
        <div>
          <Label text="模型名" />
          <TextInput
            value={cfg.model}
            onChange={(v) => { setCfg({ ...cfg, model: v }); setProbe(null); }}
            placeholder="deepseek-chat"
          />
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* 密钥 */}
      <Label text="API Key" hint="只存在本机浏览器，服务端不落盘" />
      <div style={{ display: 'flex', gap: 8 }}>
        <TextInput
          value={cfg.apiKey}
          onChange={(v) => { setCfg({ ...cfg, apiKey: v }); setProbe(null); }}
          placeholder="sk-..."
          type={showKey ? 'text' : 'password'}
        />
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          style={{
            padding: '0 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            background: C.paper, color: C.ink2, border: `1px solid ${C.line}`, whiteSpace: 'nowrap',
          }}
        >{showKey ? '隐藏' : '显示'}</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <PrimaryBtn onClick={save}>保存配置</PrimaryBtn>
        <GhostBtn onClick={test} disabled={testing}>{testing ? '测试中…' : '测试连接'}</GhostBtn>
        <GhostBtn onClick={reset}>清空重填</GhostBtn>
      </div>

      {probe && (
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 7, fontSize: 13, lineHeight: 1.8,
          background: probe.ok ? 'rgba(76,140,90,0.08)' : 'rgba(166,67,43,0.07)',
          border: `1px solid ${probe.ok ? 'rgba(76,140,90,0.28)' : 'rgba(166,67,43,0.24)'}`,
          color: probe.ok ? '#3E7449' : C.cinnabar,
        }}>{probe.text}</div>
      )}

      {!mounted && <div style={{ height: 0 }} />}

      <p style={{ marginTop: 20, fontSize: 12.5, color: C.ink3, lineHeight: 1.95 }}>
        密钥只存在本机，换浏览器或清缓存后需要重填。共用部署时不要在这填，改服务端环境变量。
      </p>
    </div>
  );
}

/* ────────────────────────── 提示词 ────────────────────────── */

function PromptsSection({ onSaved }: { onSaved: (msg: string) => void }) {
  // 两组模板：解盘（盘面变量）+ 教辅（文本变量）。同在一个编辑器里改，但存两处，互不覆盖。
  const [items, setItems] = useState<PromptTemplate[]>(BUILTIN_PROMPTS);
  const [tasks, setTasks] = useState<AiTask[]>(AI_TASKS);
  const [activeId, setActiveId] = useState<string>(BUILTIN_PROMPTS[0].id);
  const [draft, setDraft] = useState<string>(BUILTIN_PROMPTS[0].body);
  const [showPreview, setShowPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const l = loadPrompts();
    setItems(l);
    setTasks(loadAiTasks());
    setDraft(l[0].body);
    setLoaded(true);
  }, []);

  const all = useMemo(
    () => [
      ...items.map((t) => ({ ...t, group: 'prompt' as const, vars: VARS.map((v) => v.key) })),
      ...tasks.map((t) => ({ id: t.id, title: t.title, desc: t.desc, body: t.body, group: 'task' as const, vars: t.vars })),
    ],
    [items, tasks],
  );

  const active = useMemo(() => all.find((x) => x.id === activeId) ?? all[0], [all, activeId]);
  const isEdited = draft !== active.body;
  const builtinBody =
    BUILTIN_PROMPTS.find((b) => b.id === activeId)?.body ?? AI_TASKS.find((b) => b.id === activeId)?.body ?? '';

  function select(id: string) {
    const t = all.find((x) => x.id === id);
    if (!t) return;
    setActiveId(id);
    setDraft(t.body);
    setShowPreview(false);
  }

  function save() {
    if (active.group === 'prompt') {
      savePromptBody(activeId, draft);
      setItems((prev) => prev.map((x) => (x.id === activeId ? { ...x, body: draft } : x)));
    } else {
      saveAiTaskBody(activeId, draft);
      setTasks((prev) => prev.map((x) => (x.id === activeId ? { ...x, body: draft } : x)));
    }
    onSaved('模板已保存到本机');
  }

  function reset() {
    if (active.group === 'prompt') {
      resetPromptBody(activeId);
      setItems((prev) => prev.map((x) => (x.id === activeId ? { ...x, body: builtinBody } : x)));
    } else {
      resetAiTaskBody(activeId);
      setTasks((prev) => prev.map((x) => (x.id === activeId ? { ...x, body: builtinBody } : x)));
    }
    setDraft(builtinBody);
    onSaved('已恢复内置版本');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      onSaved('正文已复制');
    } catch {
      onSaved('复制失败，请手动全选');
    }
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify({ prompts: items, tasks }, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ziwei-prompts.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const preview = useMemo(() => (active.group === 'prompt'
    ? buildPrompt(draft, {
      chart: chartSummary(SAMPLE_CHART),
      lunar: lunarText(SAMPLE_CHART),
      birth: birthText(SAMPLE_CHART),
      palace: palaceText(SAMPLE_CHART, SAMPLE_CHART.mingGongBranch),
      daxian: daxianText(SAMPLE_CHART),
    })
    : draft), [draft, active.group]);

  const groups = [
    { label: '解盘模板', hint: '变量是盘面；用于 /study/interpret 的「解盘」按钮', rows: all.filter((x) => x.group === 'prompt') },
    { label: '教辅任务', hint: '变量是文本；用于古籍页、讲义页、练习页的就地 AI 按钮', rows: all.filter((x) => x.group === 'task') },
  ];

  return (
    <div>
      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, letterSpacing: '0.14em', color: C.ink2 }}>{g.label}</span>
            <span style={{ fontSize: 11.5, color: C.ink3 }}>{g.hint}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8 }}>
            {g.rows.map((t) => {
              const on = t.id === activeId;
              const edited = t.body !== (BUILTIN_PROMPTS.find((b) => b.id === t.id)?.body ?? AI_TASKS.find((b) => b.id === t.id)?.body ?? t.body);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t.id)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    background: on ? C.card : 'transparent',
                    border: `1px solid ${on ? C.gold : C.line}`,
                    borderLeft: `3px solid ${on ? C.gold : C.line}`,
                    borderRadius: 9, padding: '11px 13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: FONT.serif, fontSize: 15, letterSpacing: '0.06em', color: C.ink }}>{t.title}</span>
                    {edited && (
                      <span style={{ fontSize: 11, color: C.cinnabar, border: '1px solid rgba(166,67,43,0.3)', padding: '1px 5px', borderRadius: 3 }}>
                        已修改
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.ink3, lineHeight: 1.7, marginTop: 5 }}>{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 编辑器 */}
      <div style={{
        background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontFamily: FONT.serif, fontSize: 16, letterSpacing: '0.08em', color: C.ink }}>{active.title}</div>
            <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 4 }}>
              可用变量：{active.vars.join('　')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostBtn onClick={() => setShowPreview((v) => !v)}>{showPreview ? '看编辑框' : '看渲染效果'}</GhostBtn>
            <GhostBtn onClick={copy}>复制</GhostBtn>
          </div>
        </div>

        {showPreview ? (
          <pre style={{
            marginTop: 12, padding: '14px 16px', background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 8, fontSize: 13.5, lineHeight: 2, color: C.ink2, whiteSpace: 'pre-wrap',
            maxHeight: 380, overflowY: 'auto', fontFamily: FONT.serif,
          }}>{preview}</pre>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            style={{
              marginTop: 12, width: '100%', minHeight: 340, padding: '14px 16px',
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 8,
              fontSize: 13.5, lineHeight: 1.95, color: C.ink, fontFamily: FONT.sans,
              resize: 'vertical', outline: 'none',
            }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <PrimaryBtn onClick={save} disabled={!loaded || !isEdited}>保存修改</PrimaryBtn>
          <GhostBtn onClick={reset}>恢复内置</GhostBtn>
          <GhostBtn onClick={exportAll}>导出全部</GhostBtn>
          <span style={{ fontSize: 12.5, color: C.ink3, marginLeft: 'auto' }}>
            {draft.length} 字 · 存本机不上传
          </span>
        </div>
      </div>

      {/* 变量对照 */}
      {active.group === 'prompt' ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12.5, letterSpacing: '0.14em', color: C.ink2, marginBottom: 8 }}>变量对照</div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 6 }}>
            {VARS.map((v) => (
              <div key={v.key} style={{
                display: 'flex', gap: 10, alignItems: 'baseline',
                background: C.paper, border: `1px solid ${C.line}`, borderRadius: 7, padding: '8px 10px',
              }}>
                <code style={{ fontSize: 12.5, color: C.gold, fontFamily: FONT.mono, whiteSpace: 'nowrap' }}>{v.key}</code>
                <span style={{ fontSize: 12, color: C.ink3, lineHeight: 1.65 }}>{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16, fontSize: 12.5, color: C.ink3, lineHeight: 1.9 }}>
          <div style={{ letterSpacing: '0.14em', color: C.ink2, marginBottom: 6 }}>变量对照</div>
          本任务可用：{active.vars.map((v) => <code key={v} style={{ color: C.gold, fontFamily: FONT.mono, marginRight: 10 }}>{v}</code>)}
          —— 页面在调用时自动填入原文，你不需要手写这些变量名，改了名字会变成「缺少 xxx」。
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12.5, color: C.ink3, lineHeight: 1.9 }}>
        改口径一次只改一处（比如把「不预测事件」改成「只讲趋势」），否则下一次解盘变好了也说不清是哪句起的作用。
      </p>
    </div>
  );
}

/* ────────────────────────── 小件 ────────────────────────── */

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, letterSpacing: '0.12em', color: C.ink2 }}>{text}</span>
      {hint && <span style={{ fontSize: 11.5, color: C.ink3 }}>{hint}</span>}
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: C.ink3, marginTop: 7, lineHeight: 1.7 }}>{text}</div>;
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      style={{
        flex: 1, width: '100%', minWidth: 0, padding: '9px 12px', fontSize: 13.5,
        fontFamily: FONT.sans, color: C.ink, background: C.card,
        border: `1px solid ${C.line}`, borderRadius: 7, outline: 'none',
      }}
    />
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 18px', borderRadius: 7, fontSize: 13.5, letterSpacing: '0.08em',
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        background: C.ink, color: C.paper, border: `1px solid ${C.ink}`,
        opacity: disabled ? 0.45 : 1,
      }}
    >{children}</button>
  );
}

function GhostBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 16px', borderRadius: 7, fontSize: 13.5, letterSpacing: '0.06em',
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        background: 'transparent', color: C.ink2, border: `1px solid ${C.line}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  );
}

/** 供弹窗外壳复用：面板标题字号 */
export const SETTINGS_TITLE_SIZE = T.h2;

/* ────────────────────────── 外观 ────────────────────────── */

/**
 * 外观分栏：六套皮肤。
 * 两亮四暗不是凑数 —— 纸宣/绢沙是白天读盘，玄墨/石青/绛紫/松烟是夜里读盘；
 * 换的不只是深浅，更是纸与墨的底色倾向：墨底偏青、偏紫、偏绿，久看的着力点不一样。
 */
function AppearanceSection() {
  const { skinId, setSkinId } = useSkin();
  const [density, setDensity] = useState<DensityId>('standard');
  const [auto, setAuto] = useState(true);

  // 首帧之后同步：读手动值 / 按环境猜（桌面版高 DPI 走「舒展」）
  useEffect(() => {
    setDensity(resolveDensity());
    setAuto(readSavedDensity() === null);
  }, []);

  function pickDensity(id: DensityId) {
    setDensity(id);
    saveDensity(id);
    setAuto(false);
  }

  function followAuto() {
    setDensity(clearSavedDensity());
    setAuto(true);
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.ink3, lineHeight: 1.9, marginBottom: 16, letterSpacing: '0.02em' }}>
        选一套纸墨。切换立即生效，记在本地，下次打开还是它 —— 古籍页、讲义页、星曜卡一并跟着换。
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(212px, 1fr))', gap: 12 }}>
        {SKINS.map((s) => {
          const on = s.id === skinId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSkinId(s.id)}
              style={{
                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                padding: 0, borderRadius: 12, overflow: 'hidden',
                background: C.card,
                border: `1px solid ${on ? C.gold : C.line}`,
                boxShadow: on ? `0 0 0 3px color-mix(in srgb, ${C.gold} 16%, transparent)` : 'none',
                transition: 'border-color .15s ease, box-shadow .15s ease',
              }}
            >
              {/* 色卡：一张小纸样 —— 底色、一道宫格线、一枚点睛色块 */}
              <span style={{
                display: 'block', height: 66,
                background: s.swatch[0],
                borderBottom: `1px solid ${s.swatch[1]}`,
                position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 12, right: 12, top: 24, height: 1, background: s.swatch[1] }} />
                <span style={{ position: 'absolute', right: 12, bottom: 12, width: 22, height: 22, borderRadius: 4, background: s.swatch[2] }} />
                <span style={{
                  position: 'absolute', left: 14, bottom: 14,
                  fontFamily: FONT.display, fontSize: 15, letterSpacing: '0.16em',
                  color: s.mode === 'dark' ? '#E9E2D2' : '#241C15',
                }}>{s.label}</span>
              </span>
              <span style={{ display: 'block', padding: '10px 13px 12px' }}>
                <span style={{ display: 'block', fontSize: 13, color: C.ink2, letterSpacing: '0.03em', fontFamily: FONT.sans }}>
                  {s.note}
                </span>
                <span style={{
                  display: 'block', marginTop: 6, fontSize: 11.5, letterSpacing: '0.18em',
                  color: on ? C.gold : C.ink3,
                }}>
                  {s.mode === 'dark' ? '暗 · 夜读' : '亮 · 日读'}{on ? ' · 当前' : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 11, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT.display, fontSize: T.h3, color: C.ink, letterSpacing: TRACK.title }}>字号密度</span>
          <span style={{ fontSize: T.micro, color: C.ink3, letterSpacing: '0.02em' }}>
            只改字号与行高，版式宽度不动 —— 换档不会让宫格重排
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {DENSITIES.map((d) => {
            const on = d.id === density;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => pickDensity(d.id)}
                style={{
                  textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  padding: '11px 13px 12px', borderRadius: 8,
                  background: on ? C.card : 'transparent',
                  border: `1px solid ${on ? C.gold : C.line}`,
                  boxShadow: on ? `0 0 0 3px color-mix(in srgb, ${C.gold} 14%, transparent)` : 'none',
                  transition: 'border-color .15s ease, box-shadow .15s ease',
                }}
              >
                <span style={{
                  display: 'block', fontFamily: FONT.sans, fontSize: T.nav, color: on ? C.ink : C.ink2,
                  letterSpacing: '0.04em',
                }}>{d.label}{on ? ' · 当前' : ''}</span>
                <span style={{ display: 'block', marginTop: 5, fontSize: T.meta, color: C.ink3, lineHeight: 1.7 }}>
                  {d.note}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={followAuto}
            className="zw-btn"
            style={{
              fontFamily: 'inherit', cursor: 'pointer', padding: '6px 12px', borderRadius: 8,
              background: 'transparent', color: auto ? C.ink : C.ink2,
              border: `1px solid ${auto ? C.gold : C.line}`, fontSize: T.micro, letterSpacing: '0.02em',
            }}
          >跟随系统缩放{auto ? ' · 当前' : ''}</button>
          <span style={{ fontSize: T.micro, color: C.ink3 }}>
            桌面版在 125% 以上缩放默认「舒展」，网页版默认「标准」；手动选过就一直用它。
          </span>
        </div>
      </div>

      <div style={{
        marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${C.line}`,
        fontSize: 12, color: C.ink3, lineHeight: 1.9,
      }}>
        颜色的来路：底取「墨」，不用纯黑；字取「宣」，暖米白，久看不刺眼；金只做线与点，不做面 —— 金色一大片就俗。
        四化四色（禄青、权赭、科靛、忌朱）是全站唯一允许饱和的地方。
      </div>
    </div>
  );
}

/* ────────────────────────── 排盘规则 ────────────────────────── */

/**
 * 只有「闰月口径」这一项真正接进了引擎（generateChart 的 leapMonth 参数），
 * 所以它做成可改；其余九项照 SCHOOL_DEFAULT_CONFIG 显示当前值并注明「本版固定」，
 * 不摆点不动的开关 —— 能改就明说能改，不能改就明说不能改。
 */
const RULE_NOTES: Record<keyof SchoolConfig, string> = {
  leapMonth: '只影响「闰月生人」：非闰月生盘完全不动。切口径后重起一次盘即可对照。',
  brightnessSchool: '影响主星「庙旺平陷」标签，不改星曜落宫。',
  gengYearSihua: '只影响庚年生人的四化配对（阳武阴同 / 阳武同阴等）。',
  tianmaSchool: '影响天马落宫：年支起还是月支起，跨宫位结果会整体移位。',
  tiankongSchool: '影响天空落宫，只牵动一格。',
  jiekongSchool: '影响截空、旬空是否正副双星并用。',
  kuiyueSchool: '只影响庚辛壬癸年生人的魁钺落宫。',
  tianshiTianshang: '影响天使、天伤两星，只牵动两格。',
  changshengSchool: '影响长生十二神起点，土五局盘差异最明显。',
  lateZishi: '只影响「23:00–23:59」出生者的日柱归日。',
};

function RulesSection({ onSaved }: { onSaved: (msg: string) => void }) {
  const [cfg, setCfg] = useState<SchoolConfig>(SCHOOL_DEFAULT_CONFIG);

  useEffect(() => { setCfg(loadSchoolConfig()); }, []);

  function setLeap(v: string) {
    const next = { ...cfg, leapMonth: v as SchoolConfig['leapMonth'] };
    setCfg(next);
    saveSchoolConfig(next);
    onSaved('闰月口径已保存，重新起盘即生效');
  }

  function restore() {
    resetSchoolConfig();
    setCfg(loadSchoolConfig());
    onSaved('排盘规则已恢复默认');
  }

  const leapOptions = SCHOOL_OPTIONS.leapMonth;
  const rest = (Object.keys(cfg) as (keyof SchoolConfig)[]).filter((k) => k !== 'leapMonth');

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.ink3, lineHeight: 1.9, marginBottom: 16 }}>
        这里显示本机正在用的排盘口径。改完存本机，下次起盘沿用；同一生辰换口径重排，能直接看出差异在哪一格。
      </div>

      {/* 可改：闰月口径 */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: FONT.display, fontSize: 15, color: C.ink, letterSpacing: '0.1em' }}>
            {SCHOOL_LABELS.leapMonth}
          </div>
          <span style={{ fontSize: 12, color: C.gold }}>可改 · 已接入引擎</span>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {leapOptions.map((o) => {
            const on = cfg.leapMonth === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setLeap(o.value)}
                style={{
                  textAlign: 'left', padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                  background: on ? C.card : 'transparent',
                  border: `1px solid ${on ? C.gold : C.line}`,
                  color: on ? C.ink : C.ink2,
                }}
              >
                <span style={{ marginRight: 8, color: on ? C.gold : C.ink3 }}>{on ? '●' : '○'}</span>
                {o.label}
                <span style={{ marginLeft: 8, color: C.ink3, fontSize: 12 }}>{o.desc}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.ink3, lineHeight: 1.85 }}>{RULE_NOTES.leapMonth}</div>
      </div>

      {/* 只读：其余九项 */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: FONT.display, fontSize: 15, color: C.ink, letterSpacing: '0.1em' }}>其余口径</div>
          <span style={{ fontSize: 12, color: C.ink3 }}>本版固定在主流默认，未开放改动</span>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rest.map((k) => {
            const opts = (SCHOOL_OPTIONS as Record<string, readonly { value: string; label: string }[]>)[k] ?? [];
            const cur = opts.find((o) => o.value === (cfg[k] as string));
            return (
              <div key={k} style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 13 }}>
                  <span style={{ color: C.ink2, minWidth: 96 }}>{SCHOOL_LABELS[k]}</span>
                  <span style={{ color: C.ink }}>{cur?.label ?? String(cfg[k])}</span>
                </div>
                <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.8, marginTop: 3 }}>{RULE_NOTES[k]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <GhostBtn onClick={restore}>恢复默认口径</GhostBtn>
      </div>
    </div>
  );
}