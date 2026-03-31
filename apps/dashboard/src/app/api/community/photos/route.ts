import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { fetchWikidataPhoto, fetchPhotosForNames } from '@/lib/community/photoEngine';
import { safeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

// ============================================
// GET: Node fotoğrafı çek (Wikidata/Wikipedia)
// ?nodeId=X veya ?name=Jeffrey%20Epstein
// ?batch=true → tüm node'lar için toplu çek
// ============================================
export async function GET(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const nodeId = searchParams.get('nodeId');
        const name = searchParams.get('name');
        const batch = searchParams.get('batch') === 'true';
        const force = searchParams.get('force') === 'true';

        // BATCH MODE: Tüm node'lar için fotoğraf çek
        if (batch) {
            // Force mode: önce tüm eski URL'leri temizle (MD5 fix sonrası gerekli)
            if (force) {
                await supabase!
                    .from('nodes')
                    .update({ image_url: null })
                    .eq('is_active', true)
                    .not('image_url', 'is', null);
            }

            const { data: nodes, error } = await supabase!
                .from('nodes')
                .select('id, name, image_url')
                .eq('is_active', true);

            if (error) throw error;

            // Sadece fotoğrafı olmayan node'lar (force modda hepsi null olacak)
            const needsPhoto = (nodes || []).filter((n: any) => !n.image_url);

            if (needsPhoto.length === 0) {
                return NextResponse.json({ message: 'Tüm node\'ların fotoğrafı mevcut', updated: 0 });
            }

            const names = needsPhoto.map((n: any) => n.name);
            const photos = await fetchPhotosForNames(names);

            let updated = 0;
            for (const node of needsPhoto) {
                const photo = photos.get(node.name);
                if (photo?.thumbnail_url || photo?.image_url) {
                    await supabase!
                        .from('nodes')
                        .update({ image_url: photo.thumbnail_url || photo.image_url })
                        .eq('id', node.id);
                    updated++;
                }
            }

            return NextResponse.json({
                message: `${updated}/${needsPhoto.length} node fotoğrafı güncellendi`,
                updated,
                total: needsPhoto.length,
            });
        }

        // SINGLE NODE MODE
        let targetName = name;

        if (nodeId && !targetName) {
            const { data: node } = await supabase!
                .from('nodes')
                .select('name, image_url')
                .eq('id', nodeId)
                .single();

            if (!node) {
                return NextResponse.json({ error: 'Node bulunamadı' }, { status: 404 });
            }

            // Already has a photo
            if (node.image_url) {
                return NextResponse.json({
                    image_url: node.image_url,
                    source: 'cached',
                    cached: true,
                });
            }

            targetName = node.name;
        }

        if (!targetName) {
            return NextResponse.json({ error: 'nodeId veya name gerekli' }, { status: 400 });
        }

        // Fetch from Wikidata/Wikipedia
        const photo = await fetchWikidataPhoto(targetName);

        // Cache in database if found
        if (photo.image_url && nodeId) {
            const imageUrl = photo.thumbnail_url || photo.image_url;
            await supabase!
                .from('nodes')
                .update({ image_url: imageUrl })
                .eq('id', nodeId);
        }

        return NextResponse.json({
            ...photo,
            cached: false,
            name: targetName,
        });
    } catch (error: any) {
        return safeErrorResponse('GET /api/community/photos', error);
    }
}
