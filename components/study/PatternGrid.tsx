'use client';

/**
 * 一组格局判据的网格 —— 一次只展开一张卡
 *
 * 为什么一次只展开一张：49 条里同时开五六张，页面立刻变成一堵字墙，
 * 反而看不出哪条是哪条。点新的自动收起旧的，阅读动线干净。
 */

import { useState } from 'react';
import PatternCard, { type PatternRow } from './PatternCard';

export default function PatternGrid({
  rows,
  setKey,
}: {
  rows: PatternRow[];
  setKey: 'gui' | 'fu' | 'pin' | 'za';
}) {
  const [openNo, setOpenNo] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, alignItems: 'start' }}>
      {rows.map((g) => (
        <PatternCard
          key={g.no}
          row={g}
          setKey={setKey}
          open={openNo === g.no}
          onToggle={() => setOpenNo(openNo === g.no ? null : g.no)}
        />
      ))}
    </div>
  );
}
