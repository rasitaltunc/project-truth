// ============================================
// PROJECT TRUTH: PHOTO ENGINE
// Wikipedia/Wikidata fotoğraf çekme + cache
// ============================================

import { createHash } from 'crypto';

interface PhotoResult {
    image_url: string | null;
    thumbnail_url: string | null;
    source: 'wikidata' | 'wikipedia' | 'manual';
    license: string;
    description?: string;
}

/**
 * Wikidata'dan kişi fotoğrafı çek
 * Wikidata API → P18 (image) property → Commons URL
 */
export async function fetchWikidataPhoto(name: string): Promise<PhotoResult> {
    try {
        // 1. Wikidata'da kişiyi ara
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&limit=3&type=item`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.search || searchData.search.length === 0) {
            return fetchWikipediaPhoto(name);
        }

        // İlk sonucu al
        const entityId = searchData.search[0].id;

        // 2. Entity'nin P18 (image) property'sini çek
        const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entityId}&property=P18&format=json`;
        const entityRes = await fetch(entityUrl);
        const entityData = await entityRes.json();

        const claims = entityData.claims?.P18;
        if (!claims || claims.length === 0) {
            // P18 yoksa Wikipedia'dan dene
            return fetchWikipediaPhoto(name);
        }

        const imageName = claims[0].mainsnak?.datavalue?.value;
        if (!imageName) {
            return { image_url: null, thumbnail_url: null, source: 'wikidata', license: '' };
        }

        // 3. Commons API ile GERÇEK URL'i çek (MD5 yerine API güvenilir)
        const commonsName = imageName.replace(/ /g, '_');
        const commonsApiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(commonsName)}&prop=imageinfo&iiprop=url|size&iiurlwidth=200&format=json`;
        const commonsRes = await fetch(commonsApiUrl);
        const commonsData = await commonsRes.json();

        const pages = commonsData?.query?.pages;
        const pageId = pages ? Object.keys(pages)[0] : null;
        const imageInfo = pageId && pages[pageId]?.imageinfo?.[0];

        let fullUrl: string | null = null;
        let thumbUrl: string | null = null;

        if (imageInfo) {
            fullUrl = imageInfo.url || null;
            thumbUrl = imageInfo.thumburl || null;
        } else {
            // Fallback: MD5-based URL construction
            const md5 = computeMD5(commonsName);
            const a = md5[0];
            const ab = md5.substring(0, 2);
            fullUrl = `https://upload.wikimedia.org/wikipedia/commons/${a}/${ab}/${encodeURIComponent(commonsName)}`;
            thumbUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodeURIComponent(commonsName)}/200px-${encodeURIComponent(commonsName)}`;
        }

        return {
            image_url: fullUrl,
            thumbnail_url: thumbUrl,
            source: 'wikidata',
            license: 'CC-BY-SA / Public Domain (Wikimedia Commons)',
            description: searchData.search[0].description || '',
        };
    } catch (error) {
        console.error(`📷 Wikidata photo fetch failed for "${name}":`, error);
        return fetchWikipediaPhoto(name);
    }
}

/**
 * Wikipedia'dan kişi fotoğrafı çek (fallback)
 */
export async function fetchWikipediaPhoto(name: string): Promise<PhotoResult> {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=300&pilicense=any`;
        const res = await fetch(url);
        const data = await res.json();

        const pages = data.query?.pages;
        if (!pages) {
            return { image_url: null, thumbnail_url: null, source: 'wikipedia', license: '' };
        }

        const page = Object.values(pages)[0] as any;
        if (!page?.thumbnail?.source) {
            return { image_url: null, thumbnail_url: null, source: 'wikipedia', license: '' };
        }

        return {
            image_url: page.original?.source || page.thumbnail.source,
            thumbnail_url: page.thumbnail.source,
            source: 'wikipedia',
            license: 'Wikipedia (fair use)',
        };
    } catch (error) {
        console.error(`📷 Wikipedia photo fetch failed for "${name}":`, error);
        return { image_url: null, thumbnail_url: null, source: 'wikipedia', license: '' };
    }
}

/**
 * ✅ DÜZGÜN MD5 HASH — Node.js crypto modülü ile
 * Wikimedia Commons URL yapısı gerçek MD5 gerektirir
 *
 * Önceki bug: crypto.subtle.digest('MD5') Web Crypto API'de desteklenmiyor!
 * Hep fallback'e düşüyordu → yanlış URL → 404 → fotoğraf yok
 */
function computeMD5(input: string): string {
    return createHash('md5').update(input).digest('hex');
}

/**
 * Batch: birden fazla isim için fotoğraf çek
 */
export async function fetchPhotosForNames(names: string[]): Promise<Map<string, PhotoResult>> {
    const results = new Map<string, PhotoResult>();

    // Paralel ama throttled (Wikipedia API rate limit)
    const batchSize = 3;
    for (let i = 0; i < names.length; i += batchSize) {
        const batch = names.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(async (name) => {
                const result = await fetchWikidataPhoto(name);
                return { name, result };
            })
        );

        batchResults.forEach(({ name, result }) => {
            results.set(name, result);
        });

        // Rate limit: 1 second between batches
        if (i + batchSize < names.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return results;
}
