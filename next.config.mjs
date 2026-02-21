import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
  images: {
    remotePatterns: [
      new URL('https://lh3.googleusercontent.com/a/**'),
      new URL('https://www.amcharts.com/wp-content/themes/amcharts4/css/img/*')
    ]
  },
  eslint: {
    // Это разрешит сборку даже при ошибках линтера
    ignoreDuringBuilds: true
  }
};

export default withNextIntl(nextConfig);
