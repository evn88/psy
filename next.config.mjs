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
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "object-src 'none'",
  ...(isDevelopment ? [] : ['upgrade-insecure-requests'])
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
    value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()'
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

const privatePageHeaders = [
  {
    key: 'Cache-Control',
    value: 'private, no-store, max-age=0, must-revalidate'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    position: 'bottom-right'
  },
  output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      },
      {
        source: '/my/:path*',
        headers: privatePageHeaders
      },
      {
        source: '/admin/:path*',
        headers: privatePageHeaders
      },
      {
        source: '/app/:path*',
        headers: privatePageHeaders
      },
      {
        source: '/:locale(ru|en|sr)/my/:path*',
        headers: privatePageHeaders
      },
      {
        source: '/:locale(ru|en|sr)/admin/:path*',
        headers: privatePageHeaders
      },
      {
        source: '/:locale(ru|en|sr)/app/:path*',
        headers: privatePageHeaders
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
