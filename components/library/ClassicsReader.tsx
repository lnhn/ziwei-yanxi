'use client';

/**
 * ClassicsReader —— 古籍阅读区（原文 + 白话对照）
 *
 * 为什么做成客户端组件：
 *   白话有两个来源——编者在数据里写好的篇级导语（静态即可），和读者按需生成的
 *   逐段 AI 白话（必须本机调用模型、结果存 localStorage）。后者只能在浏览器里跑，
 *   所以整块阅读区交给客户端渲染。
 *
 * 设计取舍：
 *   - 原文永远在，白话永远是可开关的一层，绝不用白话顶替原文；
 *   - AI 白话按「章」一次通译（一次请求译 50~120 段），比逐段点一百次划算；
 *   - 结果按 slug + 章序缓存在本机，第二次打开不用再花钱。
 */

import { useEffect, useMemo, useState } from 'react';
import { chat } from '@/lib/ai/chat';
import { isAiConfigured, loadAiConfig } from '@/lib/study/ai-config';
import { useSettings } from '@/components/study/settings-context';
import { saveBookProgress } from '@/lib/study/book-progress';
import { PAPER_COLORS as C, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';

export interface ReaderParagraph {
  id: string;
  idx: number;
  text: string;
  /** 数据里预置的今译（多数古籍为空） */
  translation?: string;
  niNote?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 把模型返回的 `[01] 白话` 逐行解析成 id → 白话 */
function parseLines(raw: string, paragraphs: ReaderParagraph[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const byNo: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^[\[\【（(]?\s*(\d{1,3})\s*[\]\】）)]?\s*[.、:：]?\s*(.+)$/);
    if (m) byNo[String(parseInt(m[1], 10))] = m[2].replace(/^\*\*|\*\*$/g, '').trim();
  }
  for (const p of paragraphs) {
    const hit = byNo[String(p.idx)] ?? byNo[pad(p.idx)];
    if (hit) map[p.id] = hit;
  }
  // 兜底：模型没给编号时，按段落数对齐
  if (Object.keys(map).length === 0 && lines.length === paragraphs.length) {
    paragraphs.forEach((p, i) => { map[p.id] = lines[i]; });
  }
  return map;
}

export function ClassicsReader({
  cacheId,
  paragraphs,
  plainNote,
  subtitle,
  progress,
}: {
  /** 缓存标识（书 slug + 章序号 / txt id + 章序号），决定白话存哪 */
  cacheId: string;
  /** 阅读进度：进入本章即记一笔，书架与首页据此显示「读到哪」 */
  progress?: { book: string; chapterIdx: number; chapterTitle: string };
  paragraphs: ReaderParagraph[];
  /** 篇级白话导语（编者写） */
  subtitle?: string;
  plainNote?: string;
}) {
  const { open } = useSettings();
  const storageKey = `zw.baihua.v1.${cacheId}`;
  const [aiPlain, setAiPlain] = useState<Record<string, string>>({});
  const [showPlain, setShowPlain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setAiPlain({});
    setShowPlain(false);
    setErr('');
    if (progress) saveBookProgress(progress);
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setAiPlain(JSON.parse(raw) as Record<string, string>);
    } catch { /* 缓存坏了就当没有 */ }
  }, [storageKey, progress?.book, progress?.chapterIdx]);

  const presetCount = paragraphs.filter((p) => p.translation).length;
  const aiCount = Object.keys(aiPlain).length;
  const hasAnyPlain = presetCount > 0 || aiCount > 0;

  async function translate() {
    setErr('');
    const cfg = loadAiConfig();
    if (!isAiConfigured(cfg)) { open('ai'); return; }
    setBusy(true);
    const payload = paragraphs
      .map((p) => `[${pad(p.idx)}] ${p.text}`)
      .join('\n');
    const prompt = [
      '你是古籍整理者。下面是紫微斗数古籍的连续段落，已按 [序号] 编好。',
      `请把每一段译成现代白话，要求：`,
      '1) 逐段对应，输出格式严格为「[序号] 白话」，序号与原文一致，不合并、不遗漏；',
      '2) 星名、宫名、格局名（如紫微、七杀、三方四正、禄逢冲破）保留原词，不要意译成别的说法；',
      '3) 只解释字面与义理，不额外加断语、不加发挥、不加小标题；',
      '4) 每条一句话到三句话，控制在 60 字内。',
      '',
      payload,
    ].join('\n');

    try {
      const r = await chat({ prompt, config: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model } });
      if (!r.ok || !r.text) { setErr(r.error || '模型没有返回内容'); return; }
      const parsed = parseLines(r.text, paragraphs);
      if (Object.keys(parsed).length === 0) {
        setErr('模型返回的格式没对上（缺少 [序号]），可以点「重译」再试一次，或换模型。');
        return;
      }
      setAiPlain(parsed);
      setShowPlain(true);
      try { window.localStorage.setItem(storageKey, JSON.stringify(parsed)); } catch { /* 满了就算了 */ }
      if (Object.keys(parsed).length < paragraphs.length) {
        setToast(`已译 ${Object.keys(parsed).length} / ${paragraphs.length} 段，缺的可重译补齐`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function clearCache() {
    setAiPlain({});
    try { window.localStorage.removeItem(storageKey); } catch { /* 忽略 */ }
  }

  const btn = useMemo(() => ({
    fontSize: T.micro, padding: '6px 13px', borderRadius: SHAPE.radiusBtn, cursor: 'pointer',
    fontFamily: 'inherit', lineHeight: 1.5, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink2,
  } as const), []);

  return (
    <div>
      {subtitle && (
        <div style={{
          marginBottom: 18, padding: '14px 16px', borderRadius: SHAPE.radiusCard,
          background: mix(C.gold, 10), borderLeft: `3px solid ${C.gold}`,
        }}>
          <div style={{ fontSize: T.micro, color: C.gold, letterSpacing: TRACK.label, marginBottom: 7 }}>
            白话导语 · 本篇在讲什么
          </div>
          <div style={{ fontSize: T.body, color: C.ink2, lineHeight: 2, fontFamily: FONT.serif }}>
            {subtitle}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 16, paddingBottom: 14, borderBottom: `1px dashed ${C.line}`,
      }}>
        <button
          type="button"
          onClick={() => setShowPlain((v) => !v)}
          disabled={!hasAnyPlain}
          style={{
            ...btn,
            background: showPlain ? C.ink : 'transparent',
            color: showPlain ? C.paper : (hasAnyPlain ? C.ink2 : C.ink3),
            border: `1px solid ${showPlain ? C.ink : C.line}`,
            opacity: hasAnyPlain ? 1 : 0.5,
          }}
        >{showPlain ? '隐藏白话' : '看白话对照'}{hasAnyPlain ? `（${presetCount + aiCount}/${paragraphs.length}）` : ''}</button>

        <button type="button" onClick={translate} disabled={busy} style={{ ...btn, color: busy ? C.ink3 : C.gold, border: `1px solid ${C.gold}`, opacity: busy ? 0.6 : 1 }}>
          {busy ? '通译中…' : aiCount ? '重译本章' : `AI 通译本章（${paragraphs.length} 段）`}
        </button>

        {aiCount > 0 && (
          <button type="button" onClick={clearCache} style={{ ...btn, color: C.ink3 }}>清掉本章白话</button>
        )}

        {plainNote && <span style={{ fontSize: T.micro, color: C.ink3, lineHeight: 1.8 }}>{plainNote}</span>}
      </div>

      {!hasAnyPlain && showPlain === false && (
        <div style={{
          marginBottom: 16, padding: '11px 14px', borderRadius: SHAPE.radiusBtn,
          background: C.paper, border: `1px solid ${C.line}`,
          fontSize: T.meta, color: C.ink3, lineHeight: 1.9,
        }}>
          本章还没有白话。点「AI 通译本章」用你本机配置的模型一次译完（结果只存本机），
          或先读上面的白话导语——它讲的是这篇在说什么、怎么用。
        </div>
      )}

      {err && (
        <div style={{
          marginBottom: 16, padding: '10px 13px', borderRadius: SHAPE.radiusBtn,
          background: mix(C.cinnabar, 8), border: `1px solid ${mix(C.cinnabar, 35)}`,
          fontSize: T.meta, color: C.cinnabar, lineHeight: 1.85,
        }}>{err}</div>
      )}
      {toast && (
        <div style={{ marginBottom: 16, fontSize: T.meta, color: C.ink3 }}>{toast}</div>
      )}

      {paragraphs.map((p, i) => {
        const plain = p.translation || aiPlain[p.id];
        return (
          <div
            key={p.id}
            id={p.id}
            style={{
              marginBottom: i === paragraphs.length - 1 ? 0 : 22,
              paddingBottom: i === paragraphs.length - 1 ? 0 : 22,
              borderBottom: i === paragraphs.length - 1 ? 'none' : `1px dashed ${C.line}`,
              scrollMarginTop: 80,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: T.micro, color: C.gold, fontWeight: 600, minWidth: 20, fontFamily: FONT.mono }}>
                {pad(p.idx)}
              </span>
              <p className="zw-prose" style={{
                flex: 1, margin: 0, fontSize: T.serif, color: C.ink, lineHeight: 1.85,
                letterSpacing: '0.02em', fontFamily: FONT.serif,
              }}>{p.text}</p>
            </div>

            {showPlain && plain && (
              <div style={{
                marginTop: 10, marginLeft: 32, padding: '10px 13px',
                background: C.paper, borderRadius: SHAPE.radiusBtn,
                fontSize: T.body, color: C.ink2, lineHeight: 2,
              }}>
                <span style={{ fontSize: T.micro, color: C.navy, marginRight: 7, letterSpacing: TRACK.label }}>白话</span>
                {plain}
              </div>
            )}

            {p.niNote && (
              <div style={{
                marginTop: 9, marginLeft: 32, padding: '11px 14px',
                background: mix(C.cinnabar, 10), borderRadius: SHAPE.radiusBtn,
                fontSize: T.body, color: C.ink2, lineHeight: 1.95, fontFamily: FONT.kai,
              }}>
                <span style={{ fontSize: T.micro, color: C.cinnabar, marginRight: 7, letterSpacing: TRACK.label, fontFamily: FONT.sans }}>倪师注</span>
                {p.niNote}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ClassicsReader;
