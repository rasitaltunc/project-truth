#!/usr/bin/env node
/**
 * Quick DB diagnostic — documents tablosundaki durumu göster
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envPath = new URL('../.env.local', import.meta.url).pathname;
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('📊 Documents Tablosu Durumu\n');

  // 1. Toplam belge sayısı
  const { count: total } = await supabase.from('documents').select('*', { count: 'exact', head: true });
  console.log(`Toplam belge: ${total}`);

  // 2. scan_status dağılımı
  const { data: allDocs } = await supabase.from('documents').select('scan_status, source_type, metadata').limit(2000);

  const statusCounts = {};
  const sourceCounts = {};
  let hasRecapId = 0;
  let hasDocketNumber = 0;
  let maxwellDocket = 0;

  for (const d of allDocs || []) {
    statusCounts[d.scan_status || 'null'] = (statusCounts[d.scan_status || 'null'] || 0) + 1;
    sourceCounts[d.source_type || 'null'] = (sourceCounts[d.source_type || 'null'] || 0) + 1;
    if (d.metadata?.recap_doc_id) hasRecapId++;
    if (d.metadata?.docket_number) hasDocketNumber++;
    if (d.metadata?.docket_number === '1:20-cr-00330') maxwellDocket++;
  }

  console.log('\n── scan_status dağılımı ──');
  Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
    console.log(`  ${k.padEnd(15)} ${v}`);
  });

  console.log('\n── source_type dağılımı ──');
  Object.entries(sourceCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
    console.log(`  ${k.padEnd(20)} ${v}`);
  });

  console.log(`\n── Metadata ──`);
  console.log(`  recap_doc_id var:    ${hasRecapId}`);
  console.log(`  docket_number var:   ${hasDocketNumber}`);
  console.log(`  Maxwell (1:20-cr):   ${maxwellDocket}`);

  // 3. İlk 5 pending belge örneği (varsa)
  const { data: pending } = await supabase.from('documents')
    .select('id, title, scan_status, metadata')
    .eq('scan_status', 'pending')
    .limit(5);

  console.log(`\n── Pending belgeler (ilk 5) ──`);
  if (!pending || pending.length === 0) {
    console.log('  (hiç yok)');
  } else {
    pending.forEach(d => {
      console.log(`  ${d.title?.substring(0, 50)} | recap: ${d.metadata?.recap_doc_id || 'N/A'}`);
    });
  }

  // 4. raw_content olan belgeler
  const { data: withContent } = await supabase.from('documents')
    .select('id, title, scan_status')
    .not('raw_content', 'is', null)
    .limit(10);

  console.log(`\n── raw_content olan belgeler (ilk 10) ──`);
  (withContent || []).forEach(d => {
    console.log(`  ${d.scan_status?.padEnd(10)} ${d.title?.substring(0, 60)}`);
  });
}

main().catch(console.error);
