'use client';

/**
 * 解盘历史 —— 研究库列表页
 *
 * 这一页取代了原来的侧栏「解盘分析」：那个入口点进去还要重填生辰、再起一次盘，与
 * 「起盘后同页就地解盘」重复。现在这里只做三件事：
 *   1. 看：每次起盘展开解盘，记录自动落库（同生辰累计次数），按时间倒序列出；
 *   2. 回：点「回到这张盘」按记录的成因现算重建，回到 /chart 继续同页解盘；
 *       点「就地看判据」在本页直接展开六层读法，不必跳走；
 *   3. 出：导出 JSON / CSV，拿去统计（命宫主星分布、六维强弱对照等）。
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PAPER_COLORS as C, SIHUA_COLORS, mix } from '@/components/study/paper';
import { T, TRACK, FONT, SHAPE } from '@/components/study/type';
import { PageHead, Card, Btn } from '@/components/study/ui';
import ReadingPanel from '@/components/study/ReadingPanel';
import ZenShell from '@/components/study/ZenShell';
import { chartQuery } from '@/lib/study/chart-link';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { ZiweiChart } from '@/lib/ziwei/types';
import {
  listRecords, deleteRecord, clearRecords, updateNote, exportAsJson, exportAsCsv,
  type ReadingRecord,
} from '@/lib/study/reading-history';

const ADVICE_TONE: Record<string, string> = {
  strong: SIHUA_COLORS.禄,
  weak: SIHUA_COLORS.忌,
};

export default function HistoryPage() {
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setRecords(listRecords());
    setLoaded(true);
  }, []);

  const filtered = useMemo(() => {
    const key = q.trim();
    if (!key) return records;
    return records.filter((r) =>
      `${r.meta.lunar} ${r.meta.mingStars.join('')} ${r.meta.ju} ${r.birth.city ?? ''} ${r.digest.headline} ${r.note}`
        .includes(key));
  }, [records, q]);

  const chartOf = (r: ReadingRecord): ZiweiChart | null => {
    try {
      return generateChart(r.birth);
    } catch {
      return null;
    }
  };

  function download(name: string, text: string, type: string) {
    const blob = new Blob([type === 'csv' ? '\ufeff' + text : text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <ZenShell activeOverride="/history">
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '34px 24px 80px' }}>
      <PageHead
        kicker="记录 · 研究库"
        title="解盘历史"
        desc="每次起盘并展开解盘，这张盘与推演摘要自动落库。同一生辰重推只累次数，不重复占位 —— 便于观察「同一张盘在不同时间读出的差异」。"
      />

      {/* 工具条 */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        margin: '18px 0 4px', padding: '12px 14px', background: C.card,
        border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
      }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜：农历、主星、五行局、城市、备注"
          style={{
            flex: '1 1 260px', minWidth: 200, padding: '8px 12px', fontSize: T.sub,
            background: C.paper, color: C.ink, border: `1px solid ${C.line}`,
            borderRadius: SHAPE.radiusBtn, outline: 'none',
          }}
        />
        <span style={{ fontSize: T.micro, color: C.ink3 }}>共 {records.length} 张 · 显示 {filtered.length}</span>
        <Btn onClick={() => download(`解盘历史-${Date.now()}.json`, exportAsJson(), 'application/json')}>导出 JSON</Btn>
        <Btn onClick={() => download(`解盘历史-${Date.now()}.csv`, exportAsCsv(), 'text/csv')}>导出 CSV</Btn>
        {records.length > 0 && (
          <Btn onClick={() => {
            if (!window.confirm('清空全部解盘历史？此操作不可撤销。')) return;
            clearRecords();
            setRecords([]);
            setToast('已清空');
          }}>清空</Btn>
        )}
      </div>
      {toast && <div style={{ fontSize: T.micro, color: C.cinnabar, marginTop: 8 }}>{toast}</div>}

      {loaded && records.length === 0 && (
        <Card style={{ marginTop: 18 }}>
          <div style={{ fontFamily: FONT.display, fontSize: T.h3, color: C.ink, letterSpacing: TRACK.label }}>
            还没有记录
          </div>
          <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 2, marginTop: 8 }}>
            去「起盘排盘」填一次生辰、点「解这张盘」，这一页就会出现第一张盘。
            记录存的是生辰与推演摘要；盘面每次现算，所以内核更新后旧记录也不会失真。
          </div>
          <div style={{ marginTop: 14 }}>
            <Link href="/chart" style={{
              fontSize: T.sub, padding: '9px 18px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
              background: C.ink, color: C.paper,
            }}>去起盘 →</Link>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {filtered.map((r) => {
          const open = openId === r.id;
          const chart = open ? chartOf(r) : null;
          const solar = `${r.birth.year}-${String(r.birth.month).padStart(2, '0')}-${String(r.birth.day).padStart(2, '0')} ${['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][r.birth.hour] ?? ''}时`;
          return (
            <div key={r.id} style={{
              background: C.card, border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusCard,
              padding: '16px 18px', borderLeft: `3px solid ${mix(C.gold, 55)}`,
            }}>
              {/* 头行：时间 + 次数 + 生辰 */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: T.micro, color: C.ink3 }}>
                  {new Date(r.savedAt).toLocaleString('zh-CN', { hour12: false })}
                </span>
                {r.hits > 1 && (
                  <span style={{
                    fontSize: T.micro, color: C.gold, border: `1px solid ${mix(C.gold, 35)}`,
                    borderRadius: 3, padding: '0 5px',
                  }}>复盘 {r.hits} 次</span>
                )}
                <span style={{ fontFamily: FONT.serif, fontSize: T.body, color: C.ink, letterSpacing: TRACK.title }}>
                  {r.birth.gender === 'female' ? '坤' : '乾'} · {solar}
                </span>
                <span style={{ fontSize: T.micro, color: C.ink3 }}>{r.meta.lunar} · {r.meta.ju}</span>
              </div>

              {/* 盘面速记 */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
                {[
                  `命宫 ${r.meta.mingBranch}`,
                  `主星 ${r.meta.mingStars.join('、')}`,
                  `命主 ${r.meta.mingZhu}`,
                  `身主 ${r.meta.shenZhu}`,
                  `判据 ${r.digest.pointCount} 条`,
                ].map((t) => (
                  <span key={t} style={{
                    fontSize: T.micro, color: C.ink2, background: C.paper,
                    border: `1px solid ${C.line}`, borderRadius: SHAPE.radiusChip, padding: '3px 10px',
                  }}>{t}</span>
                ))}
              </div>

              {/* 一句定调 */}
              <div style={{ fontSize: T.sub, color: C.ink, lineHeight: 1.95, marginTop: 10 }}>
                {r.digest.headline}
              </div>

              {/* 六维强弱 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {r.digest.advice.map((a) => {
                  const tone = ADVICE_TONE[a.headline.includes('强') ? 'strong' : a.headline.includes('弱') ? 'weak' : ''] ?? C.ink3;
                  return (
                    <span key={a.key} title={a.headline} style={{
                      fontSize: T.micro, color: tone, border: `1px solid ${mix(tone, 30)}`,
                      borderRadius: 3, padding: '2px 7px',
                    }}>{a.label}</span>
                  );
                })}
              </div>

              {r.note && (
                <div style={{
                  marginTop: 10, padding: '8px 11px', background: mix(C.navy, 8),
                  border: `1px solid ${mix(C.navy, 24)}`, borderRadius: SHAPE.radiusBtn,
                  fontSize: T.micro, color: C.ink2, lineHeight: 1.85,
                }}>备注 · {r.note}</div>
              )}

              {/* 操作行 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Link href={`/chart?${chartQuery(r.birth)}`} style={{
                  fontSize: T.micro, padding: '6px 13px', borderRadius: SHAPE.radiusBtn, textDecoration: 'none',
                  background: C.ink, color: C.paper,
                }}>回到这张盘 →</Link>
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  style={{
                    fontSize: T.micro, padding: '6px 13px', borderRadius: SHAPE.radiusBtn, cursor: 'pointer',
                    background: C.paper, color: C.ink2, border: `1px solid ${C.line}`,
                  }}>{open ? '▴ 收起判据' : '▾ 就地看判据'}</button>
                <button
                  onClick={() => { setNoteId(r.id); setNoteDraft(r.note); }}
                  style={{
                    fontSize: T.micro, padding: '6px 13px', borderRadius: SHAPE.radiusBtn, cursor: 'pointer',
                    background: C.paper, color: C.ink2, border: `1px solid ${C.line}`,
                  }}>写备注</button>
                <button
                  onClick={() => {
                    if (!window.confirm('删除这条记录？')) return;
                    setRecords(deleteRecord(r.id));
                    setToast('已删除一条');
                  }}
                  style={{
                    fontSize: T.micro, padding: '6px 13px', borderRadius: SHAPE.radiusBtn, cursor: 'pointer',
                    background: 'transparent', color: C.ink3, border: `1px solid ${C.line}`, marginLeft: 'auto',
                  }}>删除</button>
              </div>

              {/* 备注编辑 */}
              {noteId === r.id && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="写下这次读盘的判断与后验：哪一条判准了、哪一条读偏了"
                    style={{
                      width: '100%', padding: '9px 11px', fontSize: T.sub, lineHeight: 1.8,
                      background: C.paper, color: C.ink, border: `1px solid ${C.line}`,
                      borderRadius: SHAPE.radiusBtn, outline: 'none', resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Btn primary onClick={() => {
                      setRecords(updateNote(r.id, noteDraft.trim()));
                      setNoteId(null);
                      setToast('备注已存');
                    }}>存备注</Btn>
                    <Btn onClick={() => setNoteId(null)}>取消</Btn>
                  </div>
                </div>
              )}

              {/* 就地展开：直接基于记录的成因现算一张盘，完整六层读法 */}
              {open && (
                chart ? (
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px dashed ${C.line}` }}>
                    <ReadingPanel
                      chart={chart}
                      title="这张盘的六层读法"
                      kicker={`研究库 · ${r.meta.ju}`}
                      intro="下面是按这条记录的生成因现算出来的盘：判据全部从盘上现取，可逐条核对。"
                      />
                  </div>
                ) : (
                  <div style={{ marginTop: 12, fontSize: T.micro, color: C.cinnabar }}>
                    这条记录的生辰无法重算（可能已越界），请用「回到这张盘」手工核对。
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* 研究提示 */}
      {records.length > 0 && (
        <div style={{
          marginTop: 26, padding: '16px 18px', borderRadius: SHAPE.radiusCard,
          background: C.paper, border: `1px dashed ${C.line}`,
        }}>
          <div style={{ fontSize: T.micro, color: C.ink3, letterSpacing: TRACK.label, marginBottom: 6 }}>拿来干什么</div>
          <div style={{ fontSize: T.sub, color: C.ink2, lineHeight: 2 }}>
            导出的 CSV 每一行是一张盘：命宫主星、五行局、六维总判断都在列里，可以直接做分布统计
            —— 比如同一主星在不同五行局下的强弱差异，或用备注列做「判准 / 判偏」的后验记录。
            库是浏览器本地存储（桌面版同一台机器共用），换机器请先导出 JSON。
          </div>
        </div>
      )}
      </div>
    </ZenShell>
  );
}
