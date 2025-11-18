/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', //создает папку со всеми необходимыми файлами, включая урезанные node_modules
    images: {
        remotePatterns: [
            new URL('https://lh3.googleusercontent.com/a/**'),
            new URL('https://www.amcharts.com/wp-content/themes/amcharts4/css/img/*')
        ],
    },
    experimental: {
        reactCompiler: true, // Включаем компилятор который мемоизирует автоматически все что нужно
    },
};

export default nextConfig;
