/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
    distDir: 'build',
};

export default nextConfig;
