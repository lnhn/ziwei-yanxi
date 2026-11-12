'use client';

/**
 * /library/import —— 导入自备 TXT 古籍
 *
 * 为什么要有这个页面：
 *   公版书就那么几部，真正陪读者一辈子的是他自己手上的本子——师门传抄的讲义、
 *   自己 OCR 出来的校对稿、某个版本的 txt。这类东西不适合塞进代码库，
 *   所以做成「本机导入 + 本机阅读 + 本机白话」：不联网、不上传、不上库。
 *
 * 交互：
 *   粘贴或选文件 → 自动按「卷/篇/章/回」等标题行分篇 → 预览 → 存本机 → 就地读。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ZenShell from '@/components/study/ZenShell';
import ClassicsReader from '@/components/library/ClassicsReader';
import { PAPER_COLORS as C } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import {
  countChars, listTxtBooks, makeTxtBookId, parseTxt, removeTxtBook, saveTxtBook,
  type TxtBook,
} from '@/lib/classics/txt-import';

const btnStyle = {
  fontSize: T.sub, padding: '8px 16px', borderRadius: SHAPE.radiusBtn, cursor: 'pointer',
  fontFamily: 'inherit', lineHeight: 1.6,
} as const;

export default function ImportTxtPage() {
  const [raw, setRaw] = useState('');
  const [name, setName] = useState('');
  const [books, setBooks] = useState<TxtBook[]>([]);
  const [preview, setPreview] = useState<{ title: string; chapters: TxtBook['chapters'] } | null>(null);
  const [active, setActive] = useState<{ id: string; chapter: number } | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBooks(listTxtBooks());
  }, []);

  const activeBook = useMemo(
    () => (active ? books.find((b) => b.id === active.id) ?? null : null),
    [active, books],
  );

  function readFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setRaw(text);
      if (!name.trim()) setName(f.name.replace(/\.txt$/i, ''));
      setPreview(null);
      setMsg(`已读入 ${f.name}（${text.length} 字）`);
    };
    reader.readAsText(f, 'utf-8');
  }

  function doParse() {
    if (raw.trim().length < 20) { setMsg('内容太短，先贴上正文再解析。'); return; }
    const r = parseTxt(raw, name.trim() || '自备古籍');
    setPreview({ title: name.trim() || r.title, chapters: r.chapters });
    setMsg(`切出 ${r.chapters.length} 篇 · ${countChars(r.chapters)} 字，确认后可保存。`);
  }

  function save() {
    if (!preview) return;
    const book: TxtBook = {
      id: makeTxtBookId(),
      title: preview.title || '自备古籍',
      createdAt: Date.now(),
      chars: countChars(preview.chapters),
      chapters: preview.chapters,
    };
    setBooks(saveTxtBook(book));
    setActive({ id: book.id, chapter: 0 });
    setPreview(null);
    setRaw('');
    setMsg(`已保存《${book.title}》，可在下面直接读。`);
  }

  function drop(id: string) {
    setBooks(removeTxtBook(id));
    if (active?.id === id) setActive(null);
  }

  return (
    <ZenShell activeOverride="/library">
      <div style={{ padding: '32px 26px 60px', maxWidth: 900, margin: '0 auto' }}>
        <nav style={{ fontSize: T.eyebrow, color: C.ink3, marginBottom: 18 }}>
          <Link href="/library" style={{ color: C.ink3, textDecoration: 'none' }}>古籍原典</Link>
          <span style={{ margin: '0 7px' }}>/</span>
          <span style={{ color: C.gold }}>导入 TXT</span>
        </nav>

        <h1 style={{ fontFamily: FONT.display, fontSize: T.h1, fontWeight: 700, letterSpacing: TRACK.title, margin: 0, lineHeight: 1.4 }}>导入自备古籍</h1>
        <p style={{ fontSize: T.body, color: C.ink3, lineHeight: 2, margin: '10px 0 0' }}>
          把你自己手上的本子（师门讲义、校对稿、某版 txt）导进来读：自动按「卷 / 篇 / 章 / 回」分篇，
          存在本机浏览器里，不上传；读的时候同样可以点「AI 通译本章」生成白话。
        </p>

        {/* 输入区 */}
        <div style={{
          marginTop: 20, background: C.card, border: `1px solid ${C.line}`,
          borderRadius: SHAPE.radiusCard, padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="书名（如：师门紫微讲义）"
              style={{
                flex: '1 1 220px', minWidth: 180, padding: '9px 12px', fontSize: T.sub,
                fontFamily: 'inherit', color: C.ink, background: C.paper,
                border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn, outline: 'none',
              }}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
              style={{ display: 'none' }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btnStyle, background: 'transparent', color: C.ink2, border: `1px solid ${C.line}` }}>
              选 .txt 文件
            </button>
          </div>

          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setPreview(null); }}
            placeholder="或直接把正文粘到这里（一行一段，标题单独一行）"
            style={{
              width: '100%', minHeight: 180, padding: '12px 14px', fontSize: T.sub,
              fontFamily: FONT.serif, lineHeight: 2, color: C.ink, background: C.paper,
              border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusBtn, outline: 'none', resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', gap: 9, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={doParse} style={{ ...btnStyle, background: C.navy, color: C.paper, border: `1px solid ${C.navy}` }}>
              解析分篇
            </button>
            {preview && (
              <button type="button" onClick={save} style={{ ...btnStyle, background: C.gold, color: C.paper, border: `1px solid ${C.gold}` }}>
                存进本机（{preview.chapters.length} 篇）
              </button>
            )}
            {msg && <span style={{ fontSize: T.meta, color: C.ink3, lineHeight: 1.8 }}>{msg}</span>}
          </div>

          {preview && (
            <div style={{ marginTop: 14, borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
              <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 8 }}>解析结果 · 确认无误再保存</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                {preview.chapters.map((c, i) => (
                  <div key={i} style={{
                    padding: '8px 11px', borderRadius: SHAPE.radiusBtn,
                    background: C.paper, border: `1px solid ${C.line}`, fontSize: T.meta, color: C.ink2,
                  }}>
                    <span style={{ color: C.gold, fontFamily: FONT.mono, marginRight: 6 }}>{String(i + 1).padStart(2, '0')}</span>
                    {c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title}
                    <span style={{ color: C.ink3 }}> · {c.paragraphs.length} 段</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 已导入 */}
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.eyebrow, marginBottom: 10 }}>MY BOOKS · 已导入（{books.length}）</div>
          {books.length === 0 ? (
            <div style={{ padding: '14px 16px', borderRadius: SHAPE.radiusCard, background: C.card, border: `1px dashed ${C.line}`, fontSize: T.meta, color: C.ink3 }}>
              还没有导入任何本子。
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {books.map((b) => (
                <div key={b.id} style={{
                  background: C.card, border: `1px solid ${active?.id === b.id ? C.gold : C.line}`,
                  borderRadius: SHAPE.radiusCard, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: T.sub, color: C.ink, fontWeight: 600, marginBottom: 6 }}>《{b.title}》</div>
                  <div style={{ fontSize: T.micro, color: C.ink3, marginBottom: 10 }}>
                    {b.chapters.length} 篇 · {b.chars} 字 · {new Date(b.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setActive({ id: b.id, chapter: 0 })} style={{ ...btnStyle, fontSize: T.micro, padding: '5px 11px', background: C.navy, color: C.paper, border: `1px solid ${C.navy}` }}>打开</button>
                    <button type="button" onClick={() => drop(b.id)} style={{ ...btnStyle, fontSize: T.micro, padding: '5px 11px', background: 'transparent', color: C.ink3, border: `1px solid ${C.line}` }}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 阅读区 */}
        {activeBook && active && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: FONT.display, fontSize: T.h2, fontWeight: 700, margin: 0, letterSpacing: TRACK.title }}>
                《{activeBook.title}》· {activeBook.chapters[active.chapter]?.title ?? ''}
              </h2>
              <span style={{ fontSize: T.micro, color: C.ink3 }}>本机文本 · 可点 AI 通译白话</span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {activeBook.chapters.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive({ id: activeBook.id, chapter: i })}
                  style={{
                    fontSize: T.micro, padding: '5px 11px', borderRadius: SHAPE.radiusChip,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: i === active.chapter ? C.gold : C.card,
                    color: i === active.chapter ? C.paper : C.ink2,
                    border: `1px solid ${i === active.chapter ? C.gold : C.line}`,
                  }}
                >
                  {i + 1}. {c.title.length > 14 ? `${c.title.slice(0, 14)}…` : c.title}
                </button>
              ))}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard, padding: '24px 24px' }}>
              <ClassicsReader
                cacheId={`txt-${activeBook.id}-${active.chapter}`}
                paragraphs={(activeBook.chapters[active.chapter]?.paragraphs ?? []).map((text, i) => ({
                  id: `${activeBook.id}-${active.chapter}-${i + 1}`,
                  idx: i + 1,
                  text,
                }))}
                plainNote="白话由本机 AI 生成，不写回你的原文件"
              />
            </div>
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: T.micro, color: C.ink3, lineHeight: 1.9 }}>
          导入内容只存在这台机器的浏览器里（键 <span style={{ fontFamily: FONT.mono }}>zw.txtbooks.v1</span>），
          换设备或清浏览器数据会消失；重要本子请另存一份原文。
          {' '}白话缓存另存于 <span style={{ fontFamily: FONT.mono }}>zw.baihua.v1.*</span>。
        </p>
      </div>
    </ZenShell>
  );
}
