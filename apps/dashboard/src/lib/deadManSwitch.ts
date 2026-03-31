// ============================================
// TRUTH PROTOCOL - Dead Man's Switch
// "Ölü Adam Anahtarı" - Koruma Mekanizması
// ============================================
//
// "Karanlıkta kalanları aydınlatmak için,
//  ışığı tutanları korumak gerekir."
//
// Bu sistem, bilgi sahibi olan ama tehlike altındaki
// kişileri korur. Eğer kullanıcı belirli bir süre
// içinde "check-in" yapmazsa, şifreli içerik otomatik
// olarak belirlenen alıcılara gönderilir.
// ============================================

import { supabase } from './auth';
import {
    generateEncryptionKey,
    encryptData,
    decryptData,
    exportKey,
    importKey,
    hashData,
    EncryptedData
} from './crypto';

// ============================================
// TYPES
// ============================================

export interface DeadManSwitch {
    id: string;
    userId: string;
    name: string;
    description?: string;

    // Trigger settings
    triggerType: 'no_checkin' | 'manual_trigger' | 'scheduled';
    triggerDays?: number;        // For no_checkin
    triggerDate?: string;        // For scheduled
    lastCheckin: string;

    // Content (encrypted)
    hasContent: boolean;
    contentPreview?: string;     // First 50 chars (unencrypted hint)

    // Recipients
    recipients: DMSRecipient[];

    // Status
    status: 'active' | 'triggered' | 'cancelled' | 'paused';
    triggeredAt?: string;

    // Meta
    createdAt: string;
    updatedAt: string;
}

export interface DMSRecipient {
    type: 'email' | 'public' | 'journalist' | 'authority' | 'trusted_user';
    value?: string;              // Email, user ID, etc.
    name?: string;               // Display name
    delay_hours?: number;        // Delay before sending to this recipient
}

export interface DMSCreateInput {
    name: string;
    description?: string;
    triggerType: 'no_checkin' | 'manual_trigger' | 'scheduled';
    triggerDays?: number;
    triggerDate?: string;
    content: string;
    contentPreview?: string;
    recipients: DMSRecipient[];
}

export interface DMSContent {
    text: string;
    files?: {
        name: string;
        data: string;  // Base64
        type: string;
    }[];
    metadata?: Record<string, any>;
}

// ============================================
// SWITCH MANAGEMENT
// ============================================

/**
 * Create a new Dead Man's Switch
 */
export async function createDeadManSwitch(
    userId: string,
    input: DMSCreateInput
): Promise<{ success: boolean; switchId?: string; recoveryKey?: string; error?: string }> {
    try {
        // 1. Generate encryption key
        const encryptionKey = await generateEncryptionKey();
        const keyString = await exportKey(encryptionKey);

        // 2. Encrypt the content
        const encryptedContent = await encryptData(input.content, encryptionKey);

        // 3. Create hash for integrity verification
        const contentHash = await hashData(input.content);

        // 4. Insert into database
        const { data: dms, error } = await supabase
            .from('dead_man_switches')
            .insert({
                user_id: userId,
                name: input.name,
                description: input.description,
                trigger_type: input.triggerType,
                trigger_days: input.triggerDays,
                trigger_date: input.triggerDate,
                last_checkin: new Date().toISOString(),
                encrypted_content: JSON.stringify(encryptedContent),
                content_hash: contentHash,
                recipients: input.recipients,
                status: 'active'
            })
            .select('id')
            .single();

        if (error) throw error;

        // Return the recovery key - user MUST save this!
        return {
            success: true,
            switchId: dms.id,
            recoveryKey: keyString  // User must save this securely!
        };

    } catch (err: any) {
        console.error('DMS creation error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Check in to reset the timer
 */
export async function checkIn(
    userId: string,
    switchId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        let query = supabase
            .from('dead_man_switches')
            .update({
                last_checkin: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('status', 'active');

        if (switchId) {
            query = query.eq('id', switchId);
        }

        const { error } = await query;

        if (error) throw error;

        return { success: true };

    } catch (err: any) {
        console.error('Check-in error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get user's switches
 */
export async function getUserSwitches(
    userId: string
): Promise<{ switches: DeadManSwitch[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('dead_man_switches')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const switches: DeadManSwitch[] = (data || []).map((dms: any) => ({
            id: dms.id,
            userId: dms.user_id,
            name: dms.name,
            description: dms.description,
            triggerType: dms.trigger_type,
            triggerDays: dms.trigger_days,
            triggerDate: dms.trigger_date,
            lastCheckin: dms.last_checkin,
            hasContent: !!dms.encrypted_content,
            recipients: dms.recipients || [],
            status: dms.status,
            triggeredAt: dms.triggered_at,
            createdAt: dms.created_at,
            updatedAt: dms.updated_at
        }));

        return { switches };

    } catch (err: any) {
        // Suppress 404 errors (table may not exist yet)
        if (!err.message?.includes('404') && !err.message?.includes('relation')) {
            console.error('Get switches error:', err);
        }
        return { switches: [], error: err.message };
    }
}

/**
 * Cancel a switch
 */
export async function cancelSwitch(
    userId: string,
    switchId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('dead_man_switches')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', switchId)
            .eq('user_id', userId);

        if (error) throw error;

        return { success: true };

    } catch (err: any) {
        console.error('Cancel switch error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Pause a switch (temporary disable)
 */
export async function pauseSwitch(
    userId: string,
    switchId: string,
    paused: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('dead_man_switches')
            .update({
                status: paused ? 'paused' : 'active',
                last_checkin: paused ? undefined : new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', switchId)
            .eq('user_id', userId);

        if (error) throw error;

        return { success: true };

    } catch (err: any) {
        console.error('Pause switch error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Manually trigger a switch (user-initiated)
 */
export async function manualTrigger(
    userId: string,
    switchId: string,
    recoveryKey: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the switch
        const { data: dms, error: fetchError } = await supabase
            .from('dead_man_switches')
            .select('*')
            .eq('id', switchId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !dms) {
            return { success: false, error: 'Switch bulunamadı' };
        }

        // Verify recovery key by trying to decrypt
        const encryptionKey = await importKey(recoveryKey);
        const encryptedContent: EncryptedData = JSON.parse(dms.encrypted_content);

        try {
            await decryptData(encryptedContent, encryptionKey);
        } catch {
            return { success: false, error: 'Geçersiz kurtarma anahtarı' };
        }

        // Trigger the switch
        await processTrigger(dms.id, encryptionKey);

        return { success: true };

    } catch (err: any) {
        console.error('Manual trigger error:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// TRIGGER PROCESSING (Server-side / Cron Job)
// ============================================

/**
 * Check for switches that need to be triggered
 * This should be run by a cron job every hour
 */
export async function checkAndTriggerSwitches(): Promise<{
    triggered: string[];
    errors: string[];
}> {
    const triggered: string[] = [];
    const errors: string[] = [];

    try {
        // Find switches that should be triggered
        const { data: switches, error } = await supabase
            .from('dead_man_switches')
            .select('*')
            .eq('status', 'active')
            .or(
                // no_checkin: last_checkin + trigger_days has passed
                `trigger_type.eq.no_checkin,` +
                // scheduled: trigger_date has passed
                `trigger_type.eq.scheduled`
            );

        if (error) throw error;

        const now = new Date();

        for (const dms of switches || []) {
            let shouldTrigger = false;

            if (dms.trigger_type === 'no_checkin' && dms.trigger_days) {
                const lastCheckin = new Date(dms.last_checkin);
                const triggerTime = new Date(lastCheckin.getTime() + dms.trigger_days * 24 * 60 * 60 * 1000);
                shouldTrigger = now >= triggerTime;
            } else if (dms.trigger_type === 'scheduled' && dms.trigger_date) {
                const triggerDate = new Date(dms.trigger_date);
                shouldTrigger = now >= triggerDate;
            }

            if (shouldTrigger) {
                // Note: In production, we would need the recovery key from a secure vault
                // For now, we mark as triggered and notify admins
                const { error: updateError } = await supabase
                    .from('dead_man_switches')
                    .update({
                        status: 'triggered',
                        triggered_at: now.toISOString()
                    })
                    .eq('id', dms.id);

                if (updateError) {
                    errors.push(`Failed to trigger ${dms.id}: ${updateError.message}`);
                } else {
                    triggered.push(dms.id);

                    // Queue notifications to recipients
                    await queueTriggerNotifications(dms);
                }
            }
        }

    } catch (err: any) {
        errors.push(`System error: ${err.message}`);
    }

    return { triggered, errors };
}

/**
 * Process a trigger and send content to recipients
 */
async function processTrigger(
    switchId: string,
    encryptionKey: CryptoKey
): Promise<void> {
    // Get the switch
    const { data: dms } = await supabase
        .from('dead_man_switches')
        .select('*')
        .eq('id', switchId)
        .single();

    if (!dms) return;

    // Decrypt content
    const encryptedContent: EncryptedData = JSON.parse(dms.encrypted_content);
    const content = await decryptData(encryptedContent, encryptionKey);

    // Update status
    await supabase
        .from('dead_man_switches')
        .update({
            status: 'triggered',
            triggered_at: new Date().toISOString()
        })
        .eq('id', switchId);

    // Send to recipients
    for (const recipient of dms.recipients || []) {
        await sendToRecipient(recipient, content, dms.name);
    }
}

/**
 * Queue notifications to recipients (without decrypted content)
 */
async function queueTriggerNotifications(dms: any): Promise<void> {
    const { sendEmail, dmsAlertEmail } = await import('./email');

    for (const recipient of dms.recipients || []) {
        if (recipient.type === 'email' && recipient.value) {
            const template = dmsAlertEmail({
                switchName: dms.name || 'İsimsiz Anahtar',
                recipientName: recipient.name,
                contentPreview: dms.content_preview || undefined,
                triggerReason: dms.trigger_type === 'no_checkin'
                    ? `Kullanıcı ${dms.trigger_days} gün boyunca check-in yapmadı.`
                    : `Planlanan tetikleme tarihi geldi.`,
            });
            template.to = recipient.value;
            const result = await sendEmail(template);
        } else if (recipient.type === 'journalist' && recipient.value) {
            const template = dmsAlertEmail({
                switchName: dms.name || 'İsimsiz Anahtar',
                recipientName: recipient.name || 'Gazeteci',
                contentPreview: dms.content_preview || undefined,
                triggerReason: `Bir kaynak koruma anahtarı tetiklendi. İçerik gazetecilere yönlendirildi.`,
            });
            template.to = recipient.value;
            await sendEmail(template);
        } else if (recipient.type === 'authority' && recipient.value) {
            const template = dmsAlertEmail({
                switchName: dms.name || 'İsimsiz Anahtar',
                recipientName: recipient.name || 'Yetkili',
                contentPreview: dms.content_preview || undefined,
                triggerReason: `Güvenlik bildirimi — yetkili makama yönlendirildi.`,
            });
            template.to = recipient.value;
            await sendEmail(template);
        } else if (recipient.type === 'public') {
            // Public release: mark in DB for public visibility
        }
    }
}

/**
 * Send content to a recipient (with decrypted content)
 */
async function sendToRecipient(
    recipient: DMSRecipient,
    content: string,
    switchName: string
): Promise<void> {
    const { sendEmail: sendEmailFn, dmsAlertEmail } = await import('./email');

    // Content preview — ilk 200 karakter
    const preview = content.length > 200 ? content.slice(0, 200) + '...' : content;

    switch (recipient.type) {
        case 'email':
        case 'journalist':
        case 'authority':
        case 'trusted_user': {
            if (!recipient.value) {
                console.warn(`⚠️ Recipient ${recipient.type} has no email`);
                return;
            }
            const template = dmsAlertEmail({
                switchName,
                recipientName: recipient.name,
                contentPreview: preview,
                triggerReason: `İçerik doğrudan gönderildi — ${recipient.type} alıcı türü.`,
            });
            template.to = recipient.value;
            const result = await sendEmailFn(template);
            break;
        }

        case 'public':
            // Future: create public URL or mark investigation as public
            break;
    }
}

// ============================================
// RECOVERY
// ============================================

/**
 * Recover switch content with recovery key
 */
export async function recoverContent(
    switchId: string,
    recoveryKey: string
): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        // Get the switch
        const { data: dms } = await supabase
            .from('dead_man_switches')
            .select('encrypted_content, content_hash')
            .eq('id', switchId)
            .single();

        if (!dms) {
            return { success: false, error: 'Switch bulunamadı' };
        }

        // Import the recovery key
        const encryptionKey = await importKey(recoveryKey);

        // Decrypt content
        const encryptedContent: EncryptedData = JSON.parse(dms.encrypted_content);
        const content = await decryptData(encryptedContent, encryptionKey);

        // Verify integrity
        const contentHash = await hashData(content);
        if (contentHash !== dms.content_hash) {
            return { success: false, error: 'İçerik bütünlüğü doğrulanamadı' };
        }

        return { success: true, content };

    } catch (err: any) {
        console.error('Content recovery error:', err);
        return { success: false, error: 'Kurtarma başarısız - geçersiz anahtar' };
    }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Calculate time until trigger
 */
export function getTimeUntilTrigger(dms: DeadManSwitch): {
    days: number;
    hours: number;
    minutes: number;
    isOverdue: boolean;
} {
    const now = new Date();
    let triggerTime: Date;

    if (dms.triggerType === 'no_checkin' && dms.triggerDays) {
        const lastCheckin = new Date(dms.lastCheckin);
        triggerTime = new Date(lastCheckin.getTime() + dms.triggerDays * 24 * 60 * 60 * 1000);
    } else if (dms.triggerType === 'scheduled' && dms.triggerDate) {
        triggerTime = new Date(dms.triggerDate);
    } else {
        return { days: 0, hours: 0, minutes: 0, isOverdue: false };
    }

    const diff = triggerTime.getTime() - now.getTime();
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((absDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((absDiff % (60 * 60 * 1000)) / (60 * 1000));

    return { days, hours, minutes, isOverdue };
}

/**
 * Format time until trigger as string
 */
export function formatTimeUntilTrigger(dms: DeadManSwitch): string {
    const { days, hours, minutes, isOverdue } = getTimeUntilTrigger(dms);

    if (isOverdue) {
        return `${days}g ${hours}s ${minutes}d GEÇMİŞ`;
    }

    if (days > 0) {
        return `${days} gün ${hours} saat kaldı`;
    } else if (hours > 0) {
        return `${hours} saat ${minutes} dakika kaldı`;
    } else {
        return `${minutes} dakika kaldı`;
    }
}
