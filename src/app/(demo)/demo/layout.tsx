import type {Metadata} from "next";
import localFont from "next/font/local";
import "../../globals.css";
import {Analytics} from "@vercel/analytics/next";
import {SpeedInsights} from "@vercel/speed-insights/next";
import {FC} from "react";
import {Providers} from "@/shared/Providers";

const geistSans = localFont({
    src: "./../../fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./../../fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "Demo zone - vershkov.com",
    description: "Demo zone",
};

type DemoLayoutType = Readonly<{
    children: React.ReactNode;
}>

const DemoLayout: FC<DemoLayoutType> = ({children}) => {
    return (
        <html lang="ru">
        <Providers>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                style={{margin: 0, padding: 0, overflow: 'hidden'}}
            >
            <main>
                {children}
            </main>
            <Analytics/>
            <SpeedInsights/>
            </body>
        </Providers>
        </html>
    );
}

export default DemoLayout;