'use client';

/**
 * /study/notes —— 研习手记
 *
 * 只落在本机 localStorage（键 zw.notes.v1）：
 * 记的是自己推盘时的疑点与心得，不是给别人看的内容，所以不上传、不做同步。
 *
 * 版式：上方是编辑区（写完给真实保存状态），下方是列表（时间 + 正文 + 删除），
 * 删除用轻量按钮而不是裸链接，避免误点。
 */

import { useEffect, useState } from 'react';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { Btn, Card, PageHead, Empty, Section } from '@/components/study/ui';
import { T, TRACK, SHAPE, FONT, NUMERIC } from '@/components/study/type';

const KEY = 'zw.notes.v1';

interface Note {
  id: string;
  at: string;
  text: string;
}

function readNotes(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  /** 保存反馈：'ok' | 'fail' | '' */
  const [status, setStatus] = useState<'' | 'ok' | 'fail'>('');

  useEffect(() => { setNotes(readNotes()); }, []);

  function persist(next: Note[]) {
    setNotes(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      setStatus('ok');
    } catch {
      // 存储不可用（隐私模式 / 配额满）：明说，不假装已存
      setStatus('fail');
    }
    window.setTimeout(() => setStatus(''), 1800);
  }

  function add() {
    if (!draft.trim()) return;
    const note: Note = { id: String(Date.now()), at: new Date().toISOString(), text: draft.trim() };
    persist([note, ...notes]);
    setDraft('');
  }

  function remove(id: string) {
    persist(notes.filter((n) => n.id !== id));
  }

  return (
    <div style={{ padding: '30px 28px 64px', maxWidth: 860, margin: '0 auto' }}>
      <PageHead
        tight
        crumbs={[{ href: '/study', label: '研习' }, { label: '研习手记' }]}
        title="研习手记"
        desc="推盘时卡住的地方、自己想不明白的疑点，记下来比记住更重要。"
      />

      <Card style={{ marginBottom: 18 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add(); }}
          placeholder="例：紫微在午，天府在戌，为何命宫三方仍是空宫？"
          aria-label="写一条手记"
          style={{
            width: '100%', minHeight: 120, padding: 14, background: C.paper, border: `1px solid ${C.line}`,
            borderRadius: SHAPE.radiusBtn, fontSize: T.body, lineHeight: 1.9, color: C.ink,
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
          }}
        />
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: T.sub, color: C.ink3 }}>
            {notes.length} 条手记 · 仅存本机 · <span style={{ fontFamily: FONT.mono }}>Ctrl/⌘ + Enter</span> 保存
          </span>
          {status && (
            <span style={{
              fontSize: T.sub, marginLeft: 'auto',
              color: status === 'ok' ? C.gold : C.cinnabar,
            }}>
              {status === 'ok' ? '已保存' : '保存失败：本机存储不可用'}
            </span>
          )}
          <Btn primary onClick={add} disabled={!draft.trim()} style={{ marginLeft: status ? 0 : 'auto' }}>记下来</Btn>
        </div>
      </Card>

      <Section title="全部手记" index="01" hint={notes.length ? `${notes.length} 条` : undefined} style={{ marginTop: 4 }}>
        {notes.length === 0 ? (
          <Empty title="还没有手记" desc="今天推一盘，把错的那一步写下来。" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notes.map((n) => (
              <div key={n.id} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
                padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, fontFamily: FONT.mono, ...NUMERIC,
                  }}>
                    {new Date(n.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: T.body, color: C.ink, lineHeight: 1.95, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                    {n.text}
                  </div>
                </div>
                <Btn quiet size="sm" onClick={() => remove(n.id)}>删除</Btn>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
