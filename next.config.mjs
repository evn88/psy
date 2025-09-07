/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
    images: {
        remotePatterns: [new URL('https://lh3.googleusercontent.com/a/**')],
    },
};

export default nextConfig;
