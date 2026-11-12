/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  // 桌面版（Tauri）只能装静态产物：NEXT_OUTPUT=export 时切成静态导出。
  // 网页版保持原样，两条腿并存，互不影响。
  ...(isExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        // 静态导出里不能有 POST 路由处理器（/api/interpret）与 sitemap/robots 这类
        // .ts 路由。本项目所有页面都是 .tsx，把扩展名收到只剩 tsx，
        // 这些 .ts 路由就不会进入构建 —— 桌面包不需要它们（AI 调用改走 Rust）。
        pageExtensions: ['tsx'],
      }
    : {}),
};

module.exports = nextConfig;
