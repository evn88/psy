import { Suspense } from 'react';
import { BlogHeader } from './_components/blog-header';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <BlogHeader />
      </Suspense>
      {children}
    </>
  );
}
