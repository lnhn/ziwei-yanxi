/**
 * 古籍原典查询库 — 类型定义
 *
 * 设计：所有古籍以 JSON 静态数据打包到代码（公版无版权风险）
 * Next.js 启动时一次性加载到内存，零 DB 依赖
 */

export interface Paragraph {
  /** 段落唯一 id（用于锚点跳转） */
  id: string;
  /** 段落序号（章节内） */
  idx: number;
  /** 段落原文（古文） */
  text: string;
  /** 现代翻译（可选，未来填充） */
  translation?: string;
  /** 倪师注解（可选，标注来源） */
  niNote?: string;
}

export interface Chapter {
  /** 章节标题（如"卷一"、"总论篇"）*/
  title: string;
  /** 章节副标题/简介（可选）*/
  subtitle?: string;
  paragraphs: Paragraph[];
}

/** 影印本信息：扫描件没有文字层，只能按页翻阅，不做全文检索 */
export interface ScanInfo {
  /** public 下的 PDF 路径（如 /books/xxx.pdf） */
  pdf: string;
  /** 总页数 */
  pageCount: number;
  /** 版式说明 */
  note: string;
  /** 目次摘录（篇名 + 原书页码） */
  toc: { title: string; page: string }[];
}

export interface Book {
  /** 书名 */
  title: string;
  /** 书 slug（URL 用，如 'guisuifu'）*/
  slug: string;
  /** 朝代 */
  dynasty: string;
  /** 作者（多人或不详时填"不详"或多人）*/
  author: string;
  /** 简介 */
  intro: string;
  /** 总字数（粗略）*/
  wordCount: number;
  chapters: Chapter[];
  /** 影印本（无文字层时用它，chapters 为空） */
  scan?: ScanInfo;
}

export interface SearchHit {
  bookSlug: string;
  bookTitle: string;
  chapterTitle: string;
  paragraphId: string;
  /** 高亮片段（含 <mark> 标签） */
  snippet: string;
  /** 原文 */
  text: string;
}
