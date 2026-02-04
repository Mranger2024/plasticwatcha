/**
 * Geocoding utilities using OpenStreetMap Nominatim API
 * Fetches location details including beach names and coordinates
 */

export interface LocationDetails {
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    type: string;
    placeType: string;
    address?: {
        beach?: string;
        coast?: string;
        water?: string;
        city?: string;
        state?: string;
        country?: string;
    };
}

// Rate limiting: Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

/**
 * Wait to respect rate limiting
 */
async function waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
}

/**
 * Calculate distance between two coordinates in kilometers
 * Using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Reverse geocode coordinates to get location details
 * Uses OpenStreetMap Nominatim API
 * Prioritizes natural features like beaches over buildings
 */
export async function reverseGeocode(
    lat: number,
    lng: number
): Promise<LocationDetails | null> {
    try {
        // Respect rate limiting
        await waitForRateLimit();

        // First, try to find natural features (beaches, coastlines) in the area
        // Use a search query to find beaches near the coordinates
        const searchUrl = `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=beach&` +
            `lat=${lat}&` +
            `lon=${lng}&` +
            `limit=5&` +
            `addressdetails=1`;

        let searchResponse;
        try {
            searchResponse = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'PlasticWatch/1.0 (Beach Pollution Tracking App)',
                },
            });
        } catch (fetchError) {
            console.warn('Network error fetching beach search:', fetchError);
            // Don't throw, just fall through to fallback
            searchResponse = { ok: false };
        }

        if (searchResponse.ok) {
            const searchData = await (searchResponse as any).json();

            // Filter for actual beaches (natural=beach or leisure=beach_resort with beach in name)
            const beaches = searchData.filter((item: any) =>
                item.type === 'beach' ||
                item.class === 'natural' ||
                (item.name && item.name.toLowerCase().includes('beach'))
            );

            if (beaches.length > 0) {
                // Find the closest beach
                let closestBeach = beaches[0];
                let minDistance = calculateDistance(lat, lng, parseFloat(beaches[0].lat), parseFloat(beaches[0].lon));

                for (const beach of beaches) {
                    const distance = calculateDistance(lat, lng, parseFloat(beach.lat), parseFloat(beach.lon));
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestBeach = beach;
                    }
                }

                // If beach is within 2km, use it
                if (minDistance < 2) {
                    return {
                        name: closestBeach.name || closestBeach.display_name.split(',')[0],
                        displayName: closestBeach.display_name,
                        latitude: parseFloat(closestBeach.lat),
                        longitude: parseFloat(closestBeach.lon),
                        type: closestBeach.type,
                        placeType: closestBeach.class,
                        address: {
                            beach: closestBeach.name,
                            coast: closestBeach.address?.coast,
                            water: closestBeach.address?.water,
                            city: closestBeach.address?.city || closestBeach.address?.town || closestBeach.address?.village,
                            state: closestBeach.address?.state,
                            country: closestBeach.address?.country,
                        },
                    };
                }
            }
        }

        // Fallback to standard reverse geocoding
        const url = `https://nominatim.openstreetmap.org/reverse?` +
            `format=json&` +
            `lat=${lat}&` +
            `lon=${lng}&` +
            `zoom=16&` +  // Reduced zoom to get broader area features
            `addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'PlasticWatch/1.0 (Beach Pollution Tracking App)',
            },
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.error) {
            console.warn('No location found for coordinates:', lat, lng);
            return null;
        }

        // Extract beach/location name with priority
        const name =
            data.address?.beach ||
            data.address?.coast ||
            data.address?.water ||
            (data.type === 'beach' ? data.name : null) ||
            data.address?.suburb ||
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.name ||
            'Unknown Location';

        return {
            name,
            displayName: data.display_name,
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lon),
            type: data.type,
            placeType: data.class,
            address: {
                beach: data.address?.beach,
                coast: data.address?.coast,
                water: data.address?.water,
                city: data.address?.city || data.address?.town || data.address?.village,
                state: data.address?.state,
                country: data.address?.country,
            },
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Search for a beach by name
 * Returns the first matching beach location
 */
export async function searchBeach(
    query: string
): Promise<LocationDetails | null> {
    try {
        await waitForRateLimit();

        const url = `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(query)}&` +
            `limit=1&` +
            `addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'PlasticWatch/1.0 (Beach Pollution Tracking App)',
            },
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return null;
        }

        const result = data[0];

        return {
            name: result.name || query,
            displayName: result.display_name,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            type: result.type,
            placeType: result.class,
            address: {
                beach: result.address?.beach,
                coast: result.address?.coast,
                water: result.address?.water,
                city: result.address?.city || result.address?.town,
                state: result.address?.state,
                country: result.address?.country,
            },
        };
    } catch (error) {
        console.error('Beach search error:', error);
        return null;
    }
}
