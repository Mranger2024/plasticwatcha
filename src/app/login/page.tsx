'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                // Check if user has admin role
                const role = data.user.user_metadata?.role || data.user.app_metadata?.role;

                if (role !== 'admin') {
                    await supabase.auth.signOut();
                    setError('Access denied. Admin privileges required.');
                    return;
                }

                // Capture user ID before async operations
                const userId = data.user.id;
                const userAgent = navigator.userAgent;

                // Track Login Activity
                console.log('Tracking login for user:', userId);

                // Simple version without location API first to test
                supabase.from('admin_access_logs')
                    .insert({
                        admin_id: userId,
                        ip_address: 'Unknown',
                        location: 'Unknown Location',
                        user_agent: userAgent,
                        device_info: { browser: 'Chrome', os: 'Windows' }
                    })
                    .then(({ data: insertData, error: insertError }) => {
                        if (insertError) {
                            console.error('Insert Error:', insertError);
                        } else {
                            console.log('✅ Login tracked successfully!', insertData);
                        }
                    });


                router.push('/dashboard');
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-blue-700 flex items-center justify-center text-white shadow-xl shadow-blue-900/20 ring-4 ring-white mb-6">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Portal</h1>
                    <p className="text-muted-foreground mt-2">Sign in to access the PlasticWatch management console</p>
                </div>

                <Card className="border-0 shadow-xl ring-1 ring-slate-100">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-xl">Authentication</CardTitle>
                        <CardDescription>Enter your credentials to continue</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@plasticwatch.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="bg-slate-50 border-0 ring-1 ring-slate-200 focus:bg-white focus:ring-primary/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="bg-slate-50 border-0 ring-1 ring-slate-200 focus:bg-white focus:ring-primary/20"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-blue-700 shadow-lg shadow-blue-900/20 h-11 transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    Protected System • Authorized Personnel Only
                </p>
            </div>
        </div>
    );
}
