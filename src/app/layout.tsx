'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from '@/components/admin/sidebar';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
    display: 'swap',
});

import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
                <head>
                    <title>Admin Panel - PlasticWatch</title>
                </head>
                <body className="font-sans">
                    <div className="flex h-screen items-center justify-center bg-slate-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                </body>
            </html>
        );
    }

    return (
        <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
            <head>
                <title>Admin Panel - PlasticWatch</title>
                <meta name="robots" content="noindex, nofollow" />
            </head>
            <body className="bg-slate-50 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    disableTransitionOnChange
                >
                    {isLoginPage ? (
                        <div className="min-h-screen bg-slate-50">
                            {children}
                        </div>
                    ) : (
                        <div className="flex h-screen overflow-hidden bg-slate-50">
                            <Sidebar />
                            <main className="flex-1 overflow-y-auto">
                                <div className="p-8">
                                    {children}
                                </div>
                            </main>
                        </div>
                    )}
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
