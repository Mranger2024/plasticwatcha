'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';

// Validation schemas
const classificationSchema = z.object({
    brand: z.string().min(1, 'Brand is required'),
    manufacturer: z.string().min(1, 'Manufacturer is required'),
    productType: z.string().min(1, 'Product type is required'),
    plasticType: z.string().optional(),
    recyclabilityIndicator: z.enum(['high', 'medium', 'low']).optional(),
    beachName: z.string().optional(),
    notes: z.string().optional(),
    reviewerFeedback: z.string().optional(),
});

type ClassificationData = z.infer<typeof classificationSchema>;

/**
 * Classify a contribution (approve)
 */
export async function classifyContribution(
    contributionId: string,
    data: ClassificationData
) {
    try {
        // 1. Verify admin role
        const admin = await requireAdmin();

        // 2. Validate input
        const validated = classificationSchema.parse(data);

        // 3. Get server client
        const supabase = await createServerClient();

        // 4. Update contribution with all new fields
        const { error: updateError } = await (supabase as any)
            .from('contributions')
            .update({
                brand: validated.brand,
                manufacturer: validated.manufacturer,
                product_type: validated.productType,
                plastic_type: validated.plasticType || null,
                recyclability_indicator: validated.recyclabilityIndicator || null,
                beach_name: validated.beachName || null,
                reviewer_feedback: validated.reviewerFeedback || null,
                status: 'classified',
                classified_at: new Date().toISOString(),
                classified_by: admin.id,
            })
            .eq('id', contributionId);

        if (updateError) {
            console.error('Classification update error:', updateError);
            throw new Error('Failed to classify contribution');
        }

        // 5. Revalidate admin dashboard and user dashboard
        revalidatePath('/admin');
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error) {
        console.error('Server action error:', error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: 'Invalid data: ' + error.issues.map((e) => e.message).join(', ')
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Reject a contribution
 */
export async function rejectContribution(
    contributionId: string,
    reason?: string
) {
    try {
        // 1. Verify admin role
        const admin = await requireAdmin();

        // 2. Get server client
        const supabase = await createServerClient();

        // 3. Call database function for atomic operation
        const { data: result, error } = await (supabase as any).rpc('reject_contribution', {
            p_contribution_id: contributionId,
            p_admin_id: admin.id,
            p_reason: reason || null
        });

        if (error) {
            console.error('Rejection RPC error:', error);
            throw new Error('Failed to reject contribution');
        }

        // Check if the function returned success
        if (result && typeof result === 'object' && 'success' in result) {
            if (!(result as any).success) {
                throw new Error((result as any).error || 'Rejection failed');
            }
        }

        // 4. Revalidate admin dashboard
        revalidatePath('/admin');

        return { success: true };
    } catch (error) {
        console.error('Server action error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Get contribution for review (with admin check)
 */
export async function getContributionForReview(contributionId: string) {
    try {
        // 1. Verify admin role
        await requireAdmin();

        // 2. Get server client
        const supabase = await createServerClient();

        // 3. Fetch contribution
        const { data, error } = await supabase
            .from('contributions')
            .select('*')
            .eq('id', contributionId)
            .single();

        if (error) {
            throw new Error('Contribution not found');
        }

        return { success: true, data };
    } catch (error) {
        console.error('Fetch error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
