import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '우리집 가계부 | Macro Money Manager',
  description: '입력은 뭉뚱그려서, 계산은 정교하게',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f3f6fb" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0d1324" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('theme');var system=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=saved?saved==='dark':system;document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-gray-900 focus:px-3 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          본문으로 바로가기
        </a>
        {children}
      </body>
    </html>
  );
}
