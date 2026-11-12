'use client';

/**
 * AiAssist —— 挂在内容页上的「就地 AI 助教」
 *
 * 为什么不做成一个独立的 AI 页面：
 *   学习时人是在某一页卡住的（这一段古文、这一集讲义、这一步推法），
 *   让他跳去别处问，回来就丢了上下文。所以 AI 只作为当前页的一个动作存在：
 *   点一下 → 就地展开结果 → 看完收起。
 *
 * 边界：
 *   - 提示词从 lib/study/prompts.ts 的 AI_TASKS 取，用户在设置里可改；
 *   - 结果可缓存本机（cacheKey），同一段内容不必反复花钱重算；
 *   - 不落库、不上传，请求直接打到用户自己配的模型。
 */

import Markdown from '@/components/study/Markdown';
import { useEffect, useMemo, useState } from 'react';
import { buildTaskPrompt, loadAiTasks, type AiTaskId } from '@/lib/study/prompts';
import { isAiConfigured, loadAiConfig } from '@/lib/study/ai-config';
import { chat } from '@/lib/ai/chat';
import { useSettings } from '@/components/study/settings-context';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { FONT } from '@/components/study/type';

export function AiAssist({
  task,
  vars,
  cta,
  note,
  cacheKey,
}: {
  task: AiTaskId;
  vars: Record<string, string | undefined>;
  cta?: string;
  note?: string;
  cacheKey?: string;
}) {
  const { open } = useSettings();
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needConfig, setNeedConfig] = useState(false);

  const storageKey = cacheKey ? `zw.ai.cache.${cacheKey}` : '';

  useEffect(() => {
    if (!storageKey) return;
    try {
      const hit = window.localStorage.getItem(storageKey);
      if (hit) setResult(hit);
    } catch {
      /* 存储不可用就当没缓存 */
    }
  }, [storageKey]);

  const template = useMemo(() => loadAiTasks().find((t) => t.id === task), [task]);
  const label = cta ?? template?.title ?? 'AI 讲解';

  async function run() {
    setError('');
    setNeedConfig(false);
    const cfg = loadAiConfig();
    if (!isAiConfigured(cfg)) {
      setNeedConfig(true);
      return;
    }
    const body = buildTaskPrompt(template?.body ?? '', vars);
    setLoading(true);
    try {
      const r = await chat({ prompt: body, config: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model } });
      if (!r.ok || !r.text) {
        setError(r.error || '模型没有返回内容');
        return;
      }
      setResult(r.text);
      if (storageKey) {
        try { window.localStorage.setItem(storageKey, r.text); } catch { /* 满了就算了 */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(result); } catch { /* 忽略 */ }
  }

  function clear() {
    setResult('');
    setError('');
    if (storageKey) {
      try { window.localStorage.removeItem(storageKey); } catch { /* 忽略 */ }
    }
  }

  const btnBase = {
    fontSize: 12.5, padding: '6px 13px', borderRadius: 6, cursor: 'pointer',
    fontFamily: 'inherit', lineHeight: 1.5,
  } as const;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          style={{
            ...btnBase,
            background: loading ? C.paperDeep : C.navy,
            color: loading ? C.ink3 : '#F7F4EC',
            border: `1px solid ${loading ? C.line : C.navy}`,
            opacity: loading ? 0.7 : 1,
          }}
        >{loading ? '想一想…' : label}</button>

        {result && !loading && (
          <>
            <button type="button" onClick={run} style={{ ...btnBase, background: 'transparent', color: C.ink2, border: `1px solid ${C.line}` }}>重跑</button>
            <button type="button" onClick={copy} style={{ ...btnBase, background: 'transparent', color: C.ink2, border: `1px solid ${C.line}` }}>复制</button>
            <button type="button" onClick={clear} style={{ ...btnBase, background: 'transparent', color: C.ink3, border: `1px solid ${C.line}` }}>收起</button>
          </>
        )}
        {note && <span style={{ fontSize: 11.5, color: C.ink3 }}>{note}</span>}
      </div>

      {needConfig && (
        <div style={{
          marginTop: 9, padding: '10px 12px', borderRadius: 7, fontSize: 12.5, lineHeight: 1.85,
          background: 'rgba(166,67,43,0.06)', border: '1px solid rgba(166,67,43,0.22)', color: C.cinnabar,
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span>还没配模型密钥。</span>
          <button
            type="button"
            onClick={() => open('ai')}
            style={{ ...btnBase, background: C.cinnabar, color: '#fff', border: `1px solid ${C.cinnabar}` }}
          >去设置</button>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 9, padding: '10px 12px', borderRadius: 7, fontSize: 12.5, lineHeight: 1.85,
          background: 'rgba(166,67,43,0.06)', border: '1px solid rgba(166,67,43,0.22)', color: C.cinnabar,
        }}>{error}</div>
      )}

      {result && (
        <div style={{
          marginTop: 10, padding: '15px 17px', borderRadius: 10,
          background: C.card, border: `1px solid ${C.line}`,
        }}>
          <div style={{
            fontSize: 11.5, color: C.ink3, letterSpacing: '0.16em', marginBottom: 9,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 3, height: 11, background: C.gold, borderRadius: 2 }} />
            AI · {label}
          </div>
          <div style={{
            fontSize: 14, color: C.ink, lineHeight: 1.95, whiteSpace: 'pre-wrap',
            fontFamily: FONT.serif,
          }}>{result}</div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── 推法批改（练习页：写过程让 AI 判） ────────────────────────── */

export function ReasonBox({ step, question, truth }: { step: string; question: string; truth: string }) {
  const { open } = useSettings();
  const [reason, setReason] = useState('');
  const [res, setRes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function grade() {
    if (reason.trim().length < 6) { setErr('把推法写出来再判：至少说清你先算什么、再算什么。'); return; }
    const cfg = loadAiConfig();
    if (!isAiConfigured(cfg)) { open('ai'); return; }
    setBusy(true); setErr('');
    const body = buildTaskPrompt(
      loadAiTasks().find((t) => t.id === 'grade')?.body ?? '',
      { step, question, truth, answer: reason.trim() },
    );
    try {
      const r = await chat({ prompt: body, config: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model } });
      if (!r.ok || !r.text) { setErr(r.error || '模型没有返回内容'); return; }
      setRes(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${C.line}` }}>
      <div style={{ fontSize: 12, color: C.ink3, letterSpacing: '0.14em', marginBottom: 8 }}>
        不只对答案 · 把推法写出来，让 AI 看你哪一步想歪了
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="例：先由公历年查万年历得农历月日；再由生月宫起子时逆数到生时定命宫；由命宫与生年干起五行局……"
        style={{
          width: '100%', minHeight: 84, padding: '10px 12px', fontFamily: 'inherit',
          fontSize: 13.5, lineHeight: 1.9, color: C.ink, background: C.paper,
          border: `1px solid ${C.line}`, borderRadius: 8, outline: 'none', resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={grade}
          disabled={busy}
          style={{
            padding: '8px 15px', borderRadius: 7, fontSize: 13.5, fontFamily: 'inherit',
            cursor: busy ? 'not-allowed' : 'pointer',
            background: C.ink, color: C.paper, border: `1px solid ${C.ink}`, opacity: busy ? 0.6 : 1,
          }}
        >{busy ? '批改中…' : '让 AI 批改推法'}</button>
        {res && (
          <button
            type="button"
            onClick={() => { setRes(''); setReason(''); }}
            style={{ padding: '8px 13px', borderRadius: 7, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', background: 'transparent', color: C.ink3, border: `1px solid ${C.line}` }}
          >清空重写</button>
        )}
      </div>
      {err && <div style={{ marginTop: 9, fontSize: 12.5, color: C.cinnabar, lineHeight: 1.8 }}>{err}</div>}
      {res && (
        <div style={{
          marginTop: 10, padding: '14px 16px', borderRadius: 9, background: C.card,
          border: `1px solid ${C.line}`,
        }}><Markdown text={res} size={15} serif /></div>
      )}
    </div>
  );
}

/* ────────────────────────── 追问框（解盘结果之上继续问） ────────────────────────── */

export function FollowUpBox({ context }: { context: string }) {
  const { open } = useSettings();
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function ask() {
    if (!q.trim()) return;
    const cfg = loadAiConfig();
    if (!isAiConfigured(cfg)) { open('ai'); return; }
    setBusy(true); setErr('');
    const body = buildTaskPrompt(
      loadAiTasks().find((t) => t.id === 'followup')?.body ?? '{{text}}\n\n{{question}}',
      { text: context, question: q.trim() },
    );
    try {
      const r2 = await chat({ prompt: body, config: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model } });
      if (!r2.ok || !r2.text) { setErr(r2.error || '模型没有返回内容'); return; }
      setA(r2.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.line}` }}>
      <div style={{ fontSize: 12, color: C.ink3, letterSpacing: '0.14em', marginBottom: 8 }}>追问 · 就着这段结论继续</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例：为什么化忌落夫妻就说多波折？我这盘具体卡在哪一年？"
          style={{
            flex: 1, minWidth: 220, minHeight: 62, padding: '10px 12px', fontFamily: 'inherit',
            fontSize: 13.5, lineHeight: 1.85, color: C.ink, background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 8, outline: 'none', resize: 'vertical',
          }}
        />
        <button
          type="button"
          onClick={ask}
          disabled={busy}
          style={{
            alignSelf: 'flex-start', padding: '9px 16px', borderRadius: 7, fontSize: 13.5,
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            background: C.ink, color: C.paper, border: `1px solid ${C.ink}`, opacity: busy ? 0.6 : 1,
          }}
        >{busy ? '想想…' : '问'}</button>
      </div>
      {err && <div style={{ marginTop: 9, fontSize: 12.5, color: C.cinnabar, lineHeight: 1.8 }}>{err}</div>}
      {a && (
        <div style={{
          marginTop: 10, padding: '14px 16px', borderRadius: 9, background: C.paper,
          border: `1px solid ${C.line}`,
        }}><Markdown text={a} size={15.5} serif /></div>
      )}
    </div>
  );
}


export default AiAssist;
