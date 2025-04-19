/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
};

export default nextConfig;
