import { Suspense } from 'react';
import { BlogHeader } from './_components/BlogHeader';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <BlogHeader />
      </Suspense>
      {children}
      <SpeedInsights />
    </>
  );
}
