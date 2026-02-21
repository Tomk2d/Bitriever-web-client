import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navigation from "@/shared/components/layout/Navigation";
import Footer from "@/shared/components/layout/Footer";
import RightSidebar from "@/shared/components/layout/RightSidebar";
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/react-query';
import { prefetchInitialData } from '@/lib/prefetch';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bitriever",
  description: "암호화폐 투자 지원 플랫폼",
  icons: {
    icon: '/data/logo.png',
    shortcut: '/data/logo.png',
    apple: '/data/logo.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = getQueryClient();
  await prefetchInitialData(queryClient);
  const dehydratedState = dehydrate(queryClient);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Providers>
          <HydrationBoundary state={dehydratedState}>
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
          <RightSidebar />
          </HydrationBoundary>
        </Providers>
      </body>
    </html>
  );
}
