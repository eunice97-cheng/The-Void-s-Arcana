const audioBlobCache = new Map();

export async function loadAudioBlob(url) {
    if (!url) return '';
    if (audioBlobCache.has(url)) return audioBlobCache.get(url);
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        audioBlobCache.set(url, blobUrl);
        return blobUrl;
    } catch (e) {
        console.warn('Failed to load audio blob for', url, e);
        return url; // Fallback to original URL
    }
}
