import createNextIntlPlugin from 'next-intl/plugin';
import workflowNextPlugin from 'workflow/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const { withWorkflow } = workflowNextPlugin;

const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "object-src 'none'",
  'upgrade-insecure-requests'
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  },
  images: {
    remotePatterns: [
      new URL('https://lh3.googleusercontent.com/a/**'),
      new URL('https://*.public.blob.vercel-storage.com/**')
    ]
  }
};

export default withWorkflow(withNextIntl(nextConfig));
