/**
 * Sync Manager
 * Handles automatic syncing of offline queue when connection is restored
 */

import { supabase, uploadFile } from './supabase';
import {
    getOfflineQueue,
    removeFromQueue,
    updateQueueItemStatus,
    isOnline,
    type QueuedContribution
} from './offline-queue';

let isSyncing = false;
let syncListeners: Array<(stats: SyncStats) => void> = [];

export interface SyncStats {
    total: number;
    completed: number;
    failed: number;
    current?: string;
}

/**
 * Start automatic sync when online
 */
export function initAutoSync() {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already online and sync
    if (isOnline()) {
        syncQueue();
    }
}

/**
 * Stop automatic sync
 */
export function stopAutoSync() {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
}

/**
 * Handle online event
 */
function handleOnline() {
    console.log('Connection restored. Starting sync...');
    syncQueue();
}

/**
 * Handle offline event
 */
function handleOffline() {
    console.log('Connection lost. Contributions will be queued.');
}

/**
 * Subscribe to sync progress updates
 */
export function onSyncProgress(callback: (stats: SyncStats) => void) {
    syncListeners.push(callback);
    return () => {
        syncListeners = syncListeners.filter(cb => cb !== callback);
    };
}

/**
 * Notify all listeners of sync progress
 */
function notifySyncProgress(stats: SyncStats) {
    syncListeners.forEach(listener => listener(stats));
}

/**
 * Sync all pending contributions
 */
export async function syncQueue(): Promise<SyncStats> {
    if (isSyncing) {
        console.log('Sync already in progress');
        return { total: 0, completed: 0, failed: 0 };
    }

    if (!isOnline()) {
        console.log('Cannot sync: offline');
        return { total: 0, completed: 0, failed: 0 };
    }

    isSyncing = true;
    const queue = await getOfflineQueue();
    const pendingItems = queue.filter(item =>
        item.status === 'pending' || item.status === 'failed'
    );

    const stats: SyncStats = {
        total: pendingItems.length,
        completed: 0,
        failed: 0
    };

    console.log(`Starting sync of ${pendingItems.length} contributions...`);

    for (const item of pendingItems) {
        try {
            stats.current = item.formData.beachName || 'Unknown location';
            notifySyncProgress(stats);

            await syncSingleContribution(item);
            await removeFromQueue(item.id);
            stats.completed++;

            console.log(`✓ Synced contribution ${item.id}`);
        } catch (error) {
            console.error(`✗ Failed to sync contribution ${item.id}:`, error);
            await updateQueueItemStatus(item.id, 'failed', String(error));
            stats.failed++;
        }

        notifySyncProgress(stats);
    }

    isSyncing = false;
    console.log(`Sync complete: ${stats.completed} succeeded, ${stats.failed} failed`);

    return stats;
}

/**
 * Sync a single contribution
 */
async function syncSingleContribution(item: QueuedContribution): Promise<void> {
    // Update status to uploading
    await updateQueueItemStatus(item.id, 'uploading');

    // Helper to Convert Blob to File
    const getFile = (blob: Blob, name: string) => new File([blob], name, { type: blob.type });

    // Upload images
    const uploadedImages = await Promise.all([
        uploadFile(getFile(item.images.productImage.blob, item.images.productImage.name), 'images'),
        item.images.backsideImage
            ? uploadFile(getFile(item.images.backsideImage.blob, item.images.backsideImage.name), 'images')
            : Promise.resolve(null),
        item.images.recyclingImage
            ? uploadFile(getFile(item.images.recyclingImage.blob, item.images.recyclingImage.name), 'images')
            : Promise.resolve(null),
        item.images.manufacturerImage
            ? uploadFile(getFile(item.images.manufacturerImage.blob, item.images.manufacturerImage.name), 'images')
            : Promise.resolve(null)
    ]);

    // Prepare contribution data
    const contributionData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        product_image_url: uploadedImages[0],
        backside_image_url: uploadedImages[1],
        recycling_image_url: uploadedImages[2],
        manufacturer_image_url: uploadedImages[3],
        latitude: item.formData.location.lat,
        longitude: item.formData.location.lng,
        beach_latitude: item.formData.beachLocation?.lat || null,
        beach_longitude: item.formData.beachLocation?.lng || null,
        beach_name: item.formData.beachName || null,
        brand_suggestion: item.formData.brand,
        plastic_type_suggestion: item.formData.plasticType,
        notes: item.formData.notes || null,
        status: 'pending' as const,
        created_at: new Date(item.timestamp).toISOString()
    };

    // Insert into database
    const { error } = await supabase
        .from('contributions')
        .insert([contributionData]);

    if (error) throw error;

    // Update status to completed
    await updateQueueItemStatus(item.id, 'completed');
}

/**
 * Manually trigger sync
 */
export async function manualSync(): Promise<SyncStats> {
    return syncQueue();
}

/**
 * Check if sync is in progress
 */
export function isSyncInProgress(): boolean {
    return isSyncing;
}
