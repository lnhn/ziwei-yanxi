import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import DensityBoot from '@/components/study/DensityBoot';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: '紫微命盘 · 倪海厦正宗紫微斗数',
  description: '基于倪海厦正宗紫微斗数体系，AI深度解读您的命盘格局、大限流年、感情事业财富健康全方位解析',
  keywords: '紫微斗数, 倪海厦, 紫微斗数全集, 紫微斗数全书, 骨髓赋, 命盘, 命理, 14主星, 12宫位',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '紫微命盘 · 倪海厦正宗紫微斗数',
    description: '基于倪海厦正宗紫微斗数体系，AI深度解读您的命盘格局、大限流年、感情事业财富健康全方位解析',
    url: SITE_URL,
    siteName: '紫微研究',
    locale: 'zh_CN',
    type: 'website',
  },
  // 站长平台验证（拿到 verification code 后填入对应字段，重新部署即可）
  verification: {
    // Google Search Console: 在 https://search.google.com/search-console 添加站点后获取
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    // Bing Webmaster Tools: 在 https://www.bing.com/webmasters 添加站点后获取
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || '808FFC6023A2C359B375DD860FEDA856',
      // 百度站长（等执照下来后）
      'baidu-site-verification': process.env.NEXT_PUBLIC_BAIDU_VERIFICATION || '',
      // 360 站长（等执照下来后）
      '360-site-verification': process.env.NEXT_PUBLIC_360_VERIFICATION || '',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{
var s=localStorage.getItem('zw.skin.v1');
var dark=(s==='xuanmo'||s==='shiqing'||s==='jiangzi'||s==='songyan');
document.documentElement.setAttribute('data-skin',s||'xuanmo');
document.documentElement.setAttribute('data-theme', dark?'dark':'light');
// 字号密度：URL 上的 ?density= 只用于对照截图与分享，优先且不落盘；
// 其次是手动选过的值；都没有就按环境猜（桌面版 + 高 DPI → 舒展）
var q=(location.search.match(/[?&]density=(compact|standard|loose)\b/)||[])[1];
var d=q||localStorage.getItem('zw.density.v1');
if(d!=='compact'&&d!=='standard'&&d!=='loose'){
  var tauri=!!(window.__TAURI_INTERNALS__||window.__TAURI__);
  d=(tauri&&(window.devicePixelRatio||1)>=1.25)?'loose':'standard';
}
document.documentElement.setAttribute('data-density',d);
}catch(e){}})();` }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <DensityBoot />
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
