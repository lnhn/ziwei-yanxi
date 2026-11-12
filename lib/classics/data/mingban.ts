/**
 * 《紫微斗数全书》（明版今注）· 南北山人校注 · 影印本
 *
 * 这个 PDF 是扫描影印件，没有文字层（PyMuPDF 逐页抽文本为空），
 * 所以不收进全文检索库，改为按页翻阅：
 *   - PDF 原样放在 public/books/ 下，页面里用浏览器原生阅读器打开；
 *   - toc 是照原书「目录」页（PDF 第 7–10 页）摘录的篇名与页码，供定位用；
 *   - 未做 OCR，不做逐字检索，页面上明说。
 */

import type { Book } from '../types';

export const ziWeiQuanShuMingBan: Book = {
  title: '紫微斗数全书（明版今注）',
  slug: 'mingban',
  dynasty: '明刊本 · 今注',
  author: '陈希夷 著 · 南北山人 校注',
  intro:
    '明刊本《紫微斗数全书》的影印件，附南北山人今注。全书二百二十五页（PDF 页数），' +
    '含自序、八卦图、安星步骤与法则、诸星问答论、骨髓赋、太微赋、定贵定富定品定杂诸局、' +
    '大限小限流年专论等，是研究三合派判语最直接的一手文本。',
  wordCount: 0,
  chapters: [],
  scan: {
    pdf: '/books/ziwei-quanshu-mingban-jinzhu.pdf',
    pageCount: 225,
    note: '扫描影印件，无文字层，故不参与全文检索；可逐页翻阅，或用原书目录页码对照。',
    toc: [
      { title: '自序', page: '七' },
      { title: '八卦图', page: '十八' },
      { title: '命盘及诸星布立之步骤与法则', page: '十九' },
      { title: '起例歌诀总括', page: '六二' },
      { title: '南北斗星表', page: '六五' },
      { title: '北南二斗正助星五行所属及位居审视', page: '六六' },
      { title: '中天十九吉星', page: '六八' },
      { title: '中天十四凶星', page: '六九' },
      { title: '干支配阴阳五行生克制化方位对冲', page: '七〇' },
      { title: '限行得失', page: '七四' },
      { title: '流年恶煞', page: '七五' },
      { title: '三方详解', page: '七七' },
      { title: '四正详解', page: '七八' },
      { title: '安命身十二宫', page: '一九' },
      { title: '诸星问答论', page: '一一八' },
      { title: '注解骨髓赋', page: '一二七' },
      { title: '注解太微赋', page: '一四一' },
      { title: '玄微赋', page: '一四四' },
      { title: '斗数指南', page: '一四四' },
      { title: '定富贵贫贱十等论', page: '一四九' },
      { title: '十二宫诸星得地合格诀', page: '一五〇' },
      { title: '十二宫诸星失陷破格诀', page: '一五一' },
      { title: '十二宫诸星得地富贵论', page: '一五二' },
      { title: '十二宫诸星失陷贫贱论', page: '一五三' },
      { title: '定贵局 · 定富局 · 定贫局 · 定杂局', page: '一五三' },
      { title: '诸星在命身宫吉凶所主', page: '二八九' },
      { title: '大限专论', page: '三〇五' },
      { title: '小限专论', page: '三〇六' },
      { title: '流年太岁专论', page: '三〇八' },
      { title: '斗君专论', page: '三〇九' },
      { title: '补遗 · 观命经验谈', page: '四四七' },
    ],
  },
};
