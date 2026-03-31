// ============================================
// TRUTH PROTOCOL - Evidence API
// Güvenli kanıt gönderimi ve yönetimi
// SECURITY: C1 (Input Validation) + E1 (Error Sanitization)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { z } from 'zod';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting (simple in-memory)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, maxPerHour: number = 10): boolean {
    const now = Date.now();
    const record = rateLimits.get(userId);

    if (!record || record.resetTime < now) {
        rateLimits.set(userId, { count: 1, resetTime: now + 3600000 });
        return false;
    }

    if (record.count >= maxPerHour) {
        return true;
    }

    record.count++;
    return false;
}

// SECURITY C1: Zod schemas for evidence validation
const evidencePostSchema = z.object({
  node_id: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  source_name: z.string().min(1).max(200),
  evidence_type: z.string().max(50).optional(),
  description: z.string().max(5000).optional(),
  source_url: z.string().url().max(2000).optional(),
  source_date: z.string().optional(),
  language: z.string().max(10).optional(),
  country_tags: z.array(z.string()).max(50).optional(),
  user_id: z.string().uuid().optional(),
  submitted_by: z.string().max(200).optional(),
});

const evidencePatchSchema = z.object({
  evidenceId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  moderatorId: z.string().max(200).optional(),
  reason: z.string().max(1000).optional(),
});

// ============================================
// POST - Kanıt Gönder
// ============================================

export async function POST(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            // SECURITY C1: Invalid JSON
            return NextResponse.json(
                { success: false, error: 'Geçersiz JSON formatı' },
                { status: 400 }
            );
        }

        // =====================
        // 1. VALIDATION (SECURITY C1)
        // =====================

        const validation = evidencePostSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            }));
            return NextResponse.json(
                { success: false, error: 'Doğrulama başarısız', details: errors },
                { status: 400 }
            );
        }

        const validated = validation.data;

        // =====================
        // 2. RATE LIMITING
        // =====================

        const submitterId = validated.user_id || validated.submitted_by || 'anonymous';

        if (checkRateLimit(submitterId, 20)) {
            return NextResponse.json(
                { success: false, error: 'Saatte maksimum 20 kanıt gönderebilirsiniz' },
                { status: 429 }
            );
        }

        // =====================
        // 3. PREPARE DATA
        // =====================

        const evidenceData = {
            node_id: validated.node_id,
            evidence_type: validated.evidence_type || 'document',
            title: validated.title,
            description: validated.description || null,
            source_name: validated.source_name,
            source_url: validated.source_url || null,
            source_date: validated.source_date || null,
            verification_status: 'community',
            moderation_status: 'pending',
            is_primary_source: false,
            language: validated.language || 'en',
            country_tags: validated.country_tags || [],
            // User tracking
            submitted_by: validated.user_id || null, // UUID from truth_users
        };

        // =====================
        // 4. INSERT EVIDENCE
        // =====================

        const { data: evidence, error: evidenceError } = await supabase
            .from('evidence_archive')
            .insert([evidenceData])
            .select()
            .single();

        // SECURITY E1: Don't expose database error details to client
        if (evidenceError) {
            console.error('Evidence insert error:', evidenceError.message);
            return NextResponse.json(
                { success: false, error: 'Kanıt kaydedilemedi' },
                { status: 500 }
            );
        }

        // =====================
        // 5. RECORD CONTRIBUTION (if user is authenticated)
        // =====================

        if (validated.user_id) {
            try {
                await supabase
                    .from('user_contributions')
                    .insert({
                        user_id: validated.user_id,
                        contribution_type: 'evidence_submit',
                        reference_table: 'evidence_archive',
                        reference_id: evidence.id,
                        status: 'pending', // Will be approved after moderation
                        impact_score: 10
                    });

                // Update user's contribution count
                await supabase
                    .from('truth_users')
                    .update({
                        contributions_count: supabase.rpc('increment', { x: 1 }),
                        last_active_at: new Date().toISOString()
                    })
                    .eq('id', validated.user_id);

            } catch (contribError) {
                // Non-fatal - continue even if contribution tracking fails
                console.warn('Contribution tracking failed:', contribError);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Kanıt başarıyla eklendi. Moderasyon sonrası görünür olacak.',
            data: {
                id: evidence.id,
                title: evidence.title,
                status: evidence.moderation_status
            }
        });

    } catch (error: any) {
        // SECURITY E1: Log details server-side, return generic message to client
        console.error('POST /api/truth/evidence error:', error?.message || error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// ============================================
// GET - Kanıtları Listele
// ============================================

export async function GET(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        const { searchParams } = new URL(request.url);
        const nodeId = searchParams.get('nodeId');
        const includesPending = searchParams.get('includePending') === 'true';

        // SECURITY C1: Validate nodeId
        if (!nodeId || typeof nodeId !== 'string' || nodeId.length > 200) {
            return NextResponse.json(
                { success: false, error: 'Geçersiz nodeId parametresi' },
                { status: 400 }
            );
        }

        // Build query
        let query = supabase
            .from('evidence_archive')
            .select(`
                *,
                submitter:truth_users!submitted_by (
                    anonymous_id,
                    trust_level,
                    reputation_score
                )
            `)
            .eq('node_id', nodeId)
            .order('created_at', { ascending: false });

        // Filter out pending unless specifically requested
        if (!includesPending) {
            query = query.or('moderation_status.eq.approved,moderation_status.is.null');
        }

        const { data, error } = await query;

        // SECURITY E1: Don't expose database error details
        if (error) {
            console.error('Evidence query error:', error.message);
            return NextResponse.json(
                { success: false, error: 'Kanıtlar yüklenemiyor' },
                { status: 500 }
            );
        }

        // Transform data to include submitter info safely
        const evidence = (data || []).map(item => ({
            ...item,
            submitter_anonymous_id: item.submitter?.anonymous_id || null,
            submitter_trust_level: item.submitter?.trust_level || 0,
            submitter: undefined // Remove the nested object
        }));

        return NextResponse.json({
            success: true,
            data: evidence,
            count: evidence.length
        });

    } catch (error: any) {
        // SECURITY E1: Log details server-side, return generic message to client
        console.error('GET /api/truth/evidence error:', error?.message || error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH - Kanıt Moderasyonu (Admin only)
// ============================================

export async function PATCH(request: NextRequest) {
    const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
    if (blocked) return blocked;

    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            // SECURITY C1: Invalid JSON
            return NextResponse.json(
                { success: false, error: 'Geçersiz JSON formatı' },
                { status: 400 }
            );
        }

        // SECURITY C1: Validate request body with Zod
        const validation = evidencePatchSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            }));
            return NextResponse.json(
                { success: false, error: 'Doğrulama başarısız', details: errors },
                { status: 400 }
            );
        }

        const { evidenceId, action, moderatorId, reason } = validation.data;

        // Update evidence moderation status
        const { data, error } = await supabase
            .from('evidence_archive')
            .update({
                moderation_status: action === 'approve' ? 'approved' : 'rejected',
                moderated_by: moderatorId || null,
                moderated_at: new Date().toISOString()
            })
            .eq('id', evidenceId)
            .select('submitted_by')
            .single();

        // SECURITY E1: Don't expose database error details
        if (error) {
            console.error('Evidence update error:', error.message);
            return NextResponse.json(
                { success: false, error: 'Kanıt güncellenemedi' },
                { status: 500 }
            );
        }

        // Update user contribution status and reputation
        if (data.submitted_by) {
            // Update contribution status
            await supabase
                .from('user_contributions')
                .update({
                    status: action === 'approve' ? 'approved' : 'rejected',
                    reviewed_by: moderatorId || null,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: action === 'reject' ? reason : null
                })
                .eq('reference_table', 'evidence_archive')
                .eq('reference_id', evidenceId);

            // Update user reputation
            if (action === 'approve') {
                await supabase.rpc('update_reputation', {
                    p_user_id: data.submitted_by,
                    p_contribution_verified: true
                });
            } else {
                await supabase.rpc('update_reputation', {
                    p_user_id: data.submitted_by,
                    p_contribution_verified: false
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: action === 'approve' ? 'Kanıt onaylandı' : 'Kanıt reddedildi'
        });

    } catch (error: any) {
        // SECURITY E1: Log details server-side, return generic message to client
        console.error('PATCH /api/truth/evidence error:', error?.message || error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
