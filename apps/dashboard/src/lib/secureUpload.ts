// ============================================
// TRUTH PROTOCOL - Secure Upload Service
// Güvenli dosya yükleme ve takip sistemi
// ============================================

import { supabase } from './auth';
import {
    stripImageMetadata,
    stripPdfMetadata,
    createCleanFileCopy,
    hashFile,
    generateSecureId
} from './crypto';

// ============================================
// TYPES
// ============================================

export interface UploadResult {
    success: boolean;
    fileId?: string;
    url?: string;
    hash?: string;
    error?: string;
}

export interface SecureUploadOptions {
    userId: string;
    anonymousId: string;
    evidenceId?: string;
    nodeId?: string;
    stripMetadata?: boolean;
    isConfidential?: boolean;
}

export interface ContributionRecord {
    userId: string;
    type: 'evidence_submit' | 'file_upload' | 'timeline_event' | 'verification_vote';
    referenceTable: string;
    referenceId: string;
}

// ============================================
// SECURE FILE UPLOAD
// ============================================

/**
 * Upload a file securely with metadata stripping and tracking
 */
export async function secureUploadFile(
    file: File,
    options: SecureUploadOptions
): Promise<UploadResult> {
    try {
        // 1. Strip metadata if requested (default: true)
        let cleanFile = file;
        if (options.stripMetadata !== false) {
            if (file.type.startsWith('image/')) {
                cleanFile = await stripImageMetadata(file);
            } else if (file.type === 'application/pdf') {
                cleanFile = await stripPdfMetadata(file);
            } else {
                cleanFile = await createCleanFileCopy(file);
            }
        }

        // 2. Generate file hash for integrity verification
        const fileHash = await hashFile(cleanFile);

        // 3. Generate secure file path
        const fileId = generateSecureId(16);
        const extension = cleanFile.name.split('.').pop() || 'bin';
        const securePath = options.isConfidential
            ? `confidential/${options.anonymousId}/${fileId}.${extension}`
            : `evidence/${options.nodeId || 'general'}/${fileId}.${extension}`;

        // 4. Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('truth-files')
            .upload(securePath, cleanFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: cleanFile.type
            });

        if (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }

        // 5. Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('truth-files')
            .getPublicUrl(securePath);

        // 6. Record the upload in database
        await recordFileUpload({
            fileId,
            userId: options.userId,
            anonymousId: options.anonymousId,
            evidenceId: options.evidenceId,
            nodeId: options.nodeId,
            originalName: file.name, // Keep for user reference only
            storagePath: securePath,
            fileHash,
            mimeType: cleanFile.type,
            fileSize: cleanFile.size,
            isConfidential: options.isConfidential || false
        });

        return {
            success: true,
            fileId,
            url: publicUrl,
            hash: fileHash
        };

    } catch (err: any) {
        console.error('Secure upload error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Record file upload in database
 */
async function recordFileUpload(data: {
    fileId: string;
    userId: string;
    anonymousId: string;
    evidenceId?: string;
    nodeId?: string;
    originalName: string;
    storagePath: string;
    fileHash: string;
    mimeType: string;
    fileSize: number;
    isConfidential: boolean;
}) {
    // This would insert into a file_uploads table
    // For now, we'll use the contributions table
    const { error } = await supabase
        .from('user_contributions')
        .insert({
            user_id: data.userId,
            contribution_type: 'file_upload',
            reference_table: 'file_uploads',
            reference_id: data.fileId,
            status: 'approved', // Auto-approve file uploads
            impact_score: 5
        });

    if (error) {
        console.warn('Could not record contribution:', error);
    }
}

// ============================================
// CONTRIBUTION TRACKING
// ============================================

/**
 * Record a user contribution
 */
export async function recordContribution(
    contribution: ContributionRecord
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('user_contributions')
            .insert({
                user_id: contribution.userId,
                contribution_type: contribution.type,
                reference_table: contribution.referenceTable,
                reference_id: contribution.referenceId,
                status: 'pending',
                impact_score: getBaseImpactScore(contribution.type)
            });

        if (error) throw error;

        // Update user's contribution count
        await supabase.rpc('increment_contributions', {
            p_user_id: contribution.userId
        });

        return { success: true };
    } catch (err: any) {
        console.error('Contribution record error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get base impact score for contribution type
 */
function getBaseImpactScore(type: ContributionRecord['type']): number {
    const scores: Record<ContributionRecord['type'], number> = {
        evidence_submit: 10,
        file_upload: 5,
        timeline_event: 8,
        verification_vote: 2
    };
    return scores[type] || 1;
}

// ============================================
// SECURE EVIDENCE SUBMISSION
// ============================================

export interface EvidenceSubmission {
    nodeId: string;
    userId: string;
    anonymousId: string;
    evidenceType: string;
    title: string;
    description?: string;
    sourceName: string;
    sourceUrl?: string;
    sourceDate?: string;
    language: string;
    files?: File[];
}

/**
 * Submit evidence securely with full tracking
 */
export async function submitEvidenceSecurely(
    submission: EvidenceSubmission
): Promise<{ success: boolean; evidenceId?: string; error?: string }> {
    try {
        // 1. Insert evidence record
        const { data: evidence, error: evidenceError } = await supabase
            .from('evidence_archive')
            .insert({
                node_id: submission.nodeId,
                submitted_by: submission.userId,
                evidence_type: submission.evidenceType,
                title: submission.title,
                description: submission.description,
                source_name: submission.sourceName,
                source_url: submission.sourceUrl,
                source_date: submission.sourceDate,
                language: submission.language,
                verification_status: 'community',
                moderation_status: 'pending',
                is_primary_source: false
            })
            .select('id')
            .single();

        if (evidenceError) throw evidenceError;

        const evidenceId = evidence.id;

        // 2. Upload files if any
        if (submission.files && submission.files.length > 0) {
            for (const file of submission.files) {
                const uploadResult = await secureUploadFile(file, {
                    userId: submission.userId,
                    anonymousId: submission.anonymousId,
                    evidenceId,
                    nodeId: submission.nodeId,
                    stripMetadata: true
                });

                if (!uploadResult.success) {
                    console.warn('File upload failed:', uploadResult.error);
                }
            }
        }

        // 3. Record contribution
        await recordContribution({
            userId: submission.userId,
            type: 'evidence_submit',
            referenceTable: 'evidence_archive',
            referenceId: evidenceId
        });

        return { success: true, evidenceId };

    } catch (err: any) {
        console.error('Evidence submission error:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// ANONYMOUS SUBMISSION (No account required)
// ============================================

/**
 * Submit evidence anonymously (creates temporary session)
 */
export async function submitAnonymousEvidence(
    submission: Omit<EvidenceSubmission, 'userId' | 'anonymousId'>
): Promise<{ success: boolean; evidenceId?: string; sessionToken?: string; error?: string }> {
    try {
        // Generate anonymous session
        const sessionToken = generateSecureId(32);
        const anonymousId = `ANON_${generateSecureId(8)}`;

        // Submit with anonymous credentials
        const result = await submitEvidenceSecurely({
            ...submission,
            userId: anonymousId, // Use anonymousId as userId for tracking
            anonymousId
        });

        return {
            ...result,
            sessionToken // For potential follow-up
        };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ============================================
// RATE LIMITING
// ============================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if user is rate limited
 */
export function isRateLimited(
    userId: string,
    action: string,
    maxPerHour: number = 10
): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const hourAgo = now - 3600000;

    const record = rateLimitMap.get(key);

    if (!record || record.resetTime < now) {
        rateLimitMap.set(key, { count: 1, resetTime: now + 3600000 });
        return false;
    }

    if (record.count >= maxPerHour) {
        return true;
    }

    record.count++;
    return false;
}

/**
 * Get remaining submissions for user
 */
export function getRemainingSubmissions(
    userId: string,
    action: string,
    maxPerHour: number = 10
): number {
    const key = `${userId}:${action}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);

    if (!record || record.resetTime < now) {
        return maxPerHour;
    }

    return Math.max(0, maxPerHour - record.count);
}
