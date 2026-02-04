/**
 * Offline Queue Manager
 * Stores contributions locally when offline and syncs when connection is restored
 */

export interface QueuedContribution {
    id: string;
    timestamp: number;
    formData: {
        brand: string;
        plasticType: string;
        beachName?: string;
        notes?: string;
        location: { lat: number; lng: number };
        beachLocation?: { lat: number; lng: number; name: string };
    };
    images: {
        productImage: { blob: Blob; name: string };
        backsideImage?: { blob: Blob; name: string };
        recyclingImage?: { blob: Blob; name: string };
        manufacturerImage?: { blob: Blob; name: string };
    };
    status: 'pending' | 'uploading' | 'failed' | 'completed';
    retryCount: number;
    error?: string;
}

const QUEUE_STORAGE_KEY = 'plasticwatch_offline_queue';
const MAX_RETRY_COUNT = 3;

/**
 * Save a contribution to the offline queue
 */
export async function saveToOfflineQueue(
    formData: QueuedContribution['formData'],
    images: QueuedContribution['images']
): Promise<string> {
    const contribution: QueuedContribution = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        formData,
        images,
        status: 'pending',
        retryCount: 0
    };

    // Get existing queue
    const queue = await getOfflineQueue();
    queue.push(contribution);

    // Save to IndexedDB (better for large files than localStorage)
    await saveQueueToIndexedDB(queue);

    return contribution.id;
}

/**
 * Get all queued contributions
 */
export async function getOfflineQueue(): Promise<QueuedContribution[]> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(['contributions'], 'readonly');
        const store = transaction.objectStore('contributions');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting offline queue:', error);
        return [];
    }
}

/**
 * Save queue to IndexedDB
 */
async function saveQueueToIndexedDB(queue: QueuedContribution[]): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction(['contributions'], 'readwrite');
    const store = transaction.objectStore('contributions');

    // Clear existing and add new
    await store.clear();
    for (const item of queue) {
        await store.add(item);
    }
}

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PlasticWatchDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('contributions')) {
                db.createObjectStore('contributions', { keyPath: 'id' });
            }
        };
    });
}

/**
 * Remove a contribution from the queue
 */
export async function removeFromQueue(id: string): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction(['contributions'], 'readwrite');
    const store = transaction.objectStore('contributions');
    await store.delete(id);
}

/**
 * Update contribution status
 */
export async function updateQueueItemStatus(
    id: string,
    status: QueuedContribution['status'],
    error?: string
): Promise<void> {
    const queue = await getOfflineQueue();
    const item = queue.find(q => q.id === id);

    if (item) {
        item.status = status;
        if (error) item.error = error;
        if (status === 'failed') item.retryCount++;

        await saveQueueToIndexedDB(queue);
    }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const queue = await getOfflineQueue();
    return {
        total: queue.length,
        pending: queue.filter(q => q.status === 'pending').length,
        uploading: queue.filter(q => q.status === 'uploading').length,
        failed: queue.filter(q => q.status === 'failed').length,
        completed: queue.filter(q => q.status === 'completed').length,
        oldestTimestamp: queue.length > 0 ? Math.min(...queue.map(q => q.timestamp)) : null
    };
}

/**
 * Check if online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Estimate total queue size in MB
 */
export async function getQueueSize(): Promise<number> {
    const queue = await getOfflineQueue();
    let totalSize = 0;

    for (const item of queue) {
        if (item.images.productImage) totalSize += item.images.productImage.blob.size;
        if (item.images.backsideImage) totalSize += item.images.backsideImage.blob.size;
        if (item.images.recyclingImage) totalSize += item.images.recyclingImage.blob.size;
        if (item.images.manufacturerImage) totalSize += item.images.manufacturerImage.blob.size;
    }

    return totalSize / (1024 * 1024); // Convert to MB
}
