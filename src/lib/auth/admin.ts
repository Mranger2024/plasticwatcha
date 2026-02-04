import { createServerClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

/**
 * Check if a user has admin role
 */
export function isAdmin(user: User | null): boolean {
    if (!user) return false;
    return user.user_metadata?.role === 'admin';
}

/**
 * Get the current admin user or throw error
 */
export async function requireAdmin(): Promise<User> {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('Authentication required');
    }

    if (!isAdmin(user)) {
        throw new Error('Admin access required');
    }

    return user;
}

/**
 * Get the current admin user or return null
 */
export async function getAdminUser(): Promise<User | null> {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user && isAdmin(user)) {
            return user;
        }

        return null;
    } catch (error) {
        return null;
    }
}
