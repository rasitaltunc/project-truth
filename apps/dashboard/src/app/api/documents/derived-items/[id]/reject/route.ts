/**
 * /api/documents/derived-items/[id]/reject
 * POST: Reject a derived item (entity or relationship suggestion)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, VOTE_RATE_LIMIT } from '@/lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const blocked = applyRateLimit(req, VOTE_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const body = await req.json();
    const { fingerprint } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Derived item ID is required' },
        { status: 400 }
      );
    }

    // Fetch derived item
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('document_derived_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: 'Derived item not found' },
        { status: 404 }
      );
    }

    // Update rejection status
    const { data: rejected, error: updateError } = await supabaseAdmin
      .from('document_derived_items')
      .update({
        status: 'rejected',
        rejected_by: fingerprint || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(rejected);
  } catch (error) {
    console.error('POST /api/documents/derived-items/[id]/reject error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
