/**
 * /api/documents/scan/queue
 * GET: List document scan queue tasks
 * POST: Claim a scan task (assign to current user)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeLimit } from '@/lib/inputSanitizer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CLAIM_DEADLINE_MINUTES = 30;

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get('network_id');
    const status = searchParams.get('status') || 'open';
    const limit = safeLimit(searchParams.get('limit'), 50);

    // SECURITY A2: Explicit select — excludes fingerprint columns
    // Note: document_scan_queue may not have network_id column
    // Filter by network through the joined documents table if needed
    let query = supabaseAdmin
      .from('document_scan_queue')
      .select('id, document_id, status, priority, deadline, created_at, updated_at, documents(title, document_type, network_id)', { count: 'exact' })
      .eq('status', status)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    const { data, count, error } = await query.limit(limit);

    if (error) throw error;

    // Flatten document data
    const queue = (data || []).map((task: any) => ({
      id: task.id,
      document_id: task.document_id,
      network_id: task.documents?.network_id || null,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      claimed_at: task.claimed_at,
      deadline: task.deadline,
      created_at: task.created_at,
      document_title: task.documents?.title,
      document_type: task.documents?.document_type,
    }));

    return NextResponse.json({
      queue,
      total: count || 0,
    });
  } catch (error: any) {
    console.error('GET /api/documents/scan/queue error:', error?.message || error);
    return NextResponse.json({ queue: [], total: 0 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { fingerprint } = body;

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'fingerprint is required' },
        { status: 400 }
      );
    }

    // SECURITY A2: Explicit select — excludes fingerprint columns
    // Find oldest open task
    const { data: taskData, error: fetchError } = await supabaseAdmin
      .from('document_scan_queue')
      .select('id, document_id, status, priority, deadline, created_at, updated_at')
      .eq('status', 'open')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No open tasks available' },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (!taskData) {
      return NextResponse.json(
        { error: 'No open tasks available' },
        { status: 404 }
      );
    }

    // Claim task
    const now = new Date();
    const deadline = new Date(now.getTime() + CLAIM_DEADLINE_MINUTES * 60 * 1000);

    const { data: claimedTask, error: updateError } = await supabaseAdmin
      .from('document_scan_queue')
      .update({
        status: 'claimed',
        assigned_to: fingerprint,
        claimed_at: now.toISOString(),
        deadline: deadline.toISOString(),
      })
      .eq('id', taskData.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(claimedTask);
  } catch (error) {
    console.error('POST /api/documents/scan/queue error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
