/**
 * /api/documents/process-wave/debug
 * GET: Debug CourtListener RECAP PDF download strategies
 * Query: ?recapDocId=165318007&entryNumber=187
 */

import { NextRequest, NextResponse } from 'next/server';

const CL_API_KEY = process.env.COURTLISTENER_API_KEY || '';
const DOCKET_ID = 17318376; // Maxwell case

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recapDocId = searchParams.get('recapDocId') || '165318007';
  const entryNumber = searchParams.get('entryNumber') || '187';

  const results: Record<string, unknown> = {
    recapDocId,
    entryNumber,
    apiKeyPresent: !!CL_API_KEY,
    apiKeyLength: CL_API_KEY.length,
    strategies: [],
  };

  // Strategy 1: RECAP document metadata
  try {
    const url = `https://www.courtlistener.com/api/rest/v4/recap-documents/${recapDocId}/?format=json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${CL_API_KEY}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    (results.strategies as unknown[]).push({
      name: 'recap-documents API',
      url,
      status: res.status,
      response: text.substring(0, 500),
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'recap-documents API',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  // Strategy 2: Docket entry endpoint
  try {
    const url = `https://www.courtlistener.com/api/rest/v4/docket-entries/?docket=${DOCKET_ID}&entry_number=${entryNumber}&format=json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${CL_API_KEY}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    (results.strategies as unknown[]).push({
      name: 'docket-entries API',
      url,
      status: res.status,
      response: text.substring(0, 1000),
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'docket-entries API',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  // Strategy 3: Direct recap-documents by docket entry
  try {
    const url = `https://www.courtlistener.com/api/rest/v4/recap-documents/?docket_entry__docket=${DOCKET_ID}&docket_entry__entry_number=${entryNumber}&format=json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${CL_API_KEY}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    (results.strategies as unknown[]).push({
      name: 'recap-documents by entry',
      url,
      status: res.status,
      response: text.substring(0, 1000),
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'recap-documents by entry',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  // Strategy 4: Direct docket page scrape for download links
  try {
    const url = `https://www.courtlistener.com/docket/17318376/${entryNumber}/united-states-v-maxwell/`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${CL_API_KEY}`,
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; TruthPlatform/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    // Find all PDF-related links
    const pdfLinks = html.match(/href="[^"]*\.pdf[^"]*"/gi) || [];
    const recapLinks = html.match(/href="[^"]*recap[^"]*"/gi) || [];
    const downloadLinks = html.match(/href="[^"]*download[^"]*"/gi) || [];

    (results.strategies as unknown[]).push({
      name: 'docket page scrape',
      url,
      status: res.status,
      htmlLength: html.length,
      pdfLinks: pdfLinks.slice(0, 5),
      recapLinks: recapLinks.slice(0, 5),
      downloadLinks: downloadLinks.slice(0, 5),
      // Also try to find filepath_local pattern
      filepathMatches: (html.match(/filepath[^"<>]{0,200}/gi) || []).slice(0, 3),
      storageLinks: (html.match(/storage\.courtlistener\.com[^"<>\s]{0,200}/gi) || []).slice(0, 3),
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'docket page scrape',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  // Strategy 5: v3 API (older, may have different permissions)
  try {
    const url = `https://www.courtlistener.com/api/rest/v3/recap-documents/${recapDocId}/?format=json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${CL_API_KEY}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    (results.strategies as unknown[]).push({
      name: 'v3 recap-documents API',
      url,
      status: res.status,
      response: text.substring(0, 1000),
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'v3 recap-documents API',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  // Strategy 6: No auth page scrape (CourtListener may block authed requests differently)
  try {
    const url = `https://www.courtlistener.com/docket/17318376/${entryNumber}/united-states-v-maxwell/`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    (results.strategies as unknown[]).push({
      name: 'no-auth page scrape',
      url,
      status: res.status,
      htmlLength: html.length,
      htmlSnippet: html.substring(0, 500),
      storageLinks: (html.match(/storage\.courtlistener\.com[^"<>\s]{0,200}/gi) || []).slice(0, 3),
      archiveLinks: (html.match(/archive\.org[^"<>\s]{0,200}/gi) || []).slice(0, 3),
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'no-auth page scrape',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  // Strategy 7: Main docket page (lists all entries)
  try {
    const url = `https://www.courtlistener.com/docket/17318376/united-states-v-maxwell/?page=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();

    // Count how many PDF links exist
    const allStorageLinks = html.match(/storage\.courtlistener\.com\/recap\/[^"<>\s]+\.pdf/gi) || [];
    const allArchiveLinks = html.match(/archive\.org\/download\/[^"<>\s]+\.pdf/gi) || [];

    // Find entry numbers that have PDFs
    const entryWithPdf = html.match(/id="entry-\d+"/gi) || [];

    (results.strategies as unknown[]).push({
      name: 'main docket page',
      url,
      status: res.status,
      htmlLength: html.length,
      totalStoragePdfLinks: allStorageLinks.length,
      totalArchivePdfLinks: allArchiveLinks.length,
      sampleStorageLinks: allStorageLinks.slice(0, 5),
      sampleArchiveLinks: allArchiveLinks.slice(0, 3),
      entriesOnPage: entryWithPdf.length,
    });
  } catch (e) {
    (results.strategies as unknown[]).push({
      name: 'main docket page',
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }

  return NextResponse.json(results);
}
