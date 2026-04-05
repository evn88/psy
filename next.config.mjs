import createNextIntlPlugin from 'next-intl/plugin';
import workflowNextPlugin from 'workflow/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const { withWorkflow } = workflowNextPlugin;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
  images: {
    remotePatterns: [
      new URL('https://lh3.googleusercontent.com/a/**'),
      new URL('https://*.public.blob.vercel-storage.com/**')
    ]
  }
};

export default withWorkflow(withNextIntl(nextConfig));
