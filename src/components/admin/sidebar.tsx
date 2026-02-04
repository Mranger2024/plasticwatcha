'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';

type NavItem = {
    title: string;
    href: string;
    icon: keyof typeof Icons;
    disabled?: boolean;
};

const navItems: NavItem[] = [
    {
        title: 'Home',
        href: '/dashboard',
        icon: 'dashboard',
    },
    {
        title: 'Contributions',
        href: '/contributions',
        icon: 'fileText',
    },
    {
        title: 'Blog',
        href: '/blog',
        icon: 'fileText',
    },
    {
        title: 'Analytics',
        href: '/stats',
        icon: 'barChart',
    },
    {
        title: 'GPS Collector',
        href: '/gps-collector',
        icon: 'mapPin',
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
    },
];

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

// ... existing imports ...

export function Sidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
        };
        getUser();
    }, [supabase]);

    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Admin User';
    const email = user?.email || 'admin@plasticwatch.com';
    const initials = displayName
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'AD';

    return (
        <div className="w-64 bg-white flex flex-col shadow-xl">
            {/* Branding Area */}
            <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-slate-50">
                <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-xl shadow-blue-900/30 ring-2 ring-blue-100">
                        PW
                    </div>
                    <div>
                        <h1 className="font-bold text-xl leading-tight tracking-tight text-foreground">
                            PlasticWatch
                        </h1>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 bg-blue-50 px-2 py-0.5 rounded-md">
                            Admin Panel
                        </span>
                    </div>
                </div>

                {/* User Profile - Compact */}
                <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 shadow-sm border-0 hover:shadow-md transition-shadow duration-200">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate" title={displayName}>{displayName}</p>
                            <p className="text-[10px] text-muted-foreground truncate" title={email}>{email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4">
                <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest font-mono opacity-70">
                    Platform
                </div>
                <nav className="space-y-1 mb-8">
                    {navItems.slice(0, 4).map((item) => {
                        const Icon = Icons[item.icon];
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.disabled ? '#' : item.href}
                                className={cn(
                                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out',
                                    isActive
                                        ? 'bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                    item.disabled && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <Icon className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                                )} />
                                {item.title}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest font-mono opacity-70">
                    Tools
                </div>
                <nav className="space-y-1">
                    {navItems.slice(4).map((item) => {
                        const Icon = Icons[item.icon];
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.disabled ? '#' : item.href}
                                className={cn(
                                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out',
                                    isActive
                                        ? 'bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                    item.disabled && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <Icon className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                                )} />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Footer / Search Area */}
            <div className="p-4 bg-slate-50/50">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Quick search..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm font-mono placeholder:font-sans border-0"
                    />
                    <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <kbd className="hidden sm:inline-flex h-4 items-center gap-1 rounded border bg-slate-100 px-1 font-mono text-[10px] font-medium text-slate-500">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}
