/**
 * /api/documents/process-wave/cl-test
 * Quick test: What does CourtListener return for a Maxwell docket entry?
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const testUrls = [
    {
      name: 'entry-187-no-auth',
      url: 'https://www.courtlistener.com/docket/17318376/187/united-states-v-maxwell/',
      auth: false,
    },
    {
      name: 'entry-262-no-auth',
      url: 'https://www.courtlistener.com/docket/17318376/262/united-states-v-maxwell/',
      auth: false,
    },
    {
      name: 'recap-fetch-187',
      url: 'https://www.courtlistener.com/api/rest/v4/recap-fetch/',
      auth: true,
      method: 'GET',
    },
  ];

  const results: Record<string, unknown>[] = [];

  for (const t of testUrls.slice(0, 2)) {
    try {
      const headers: Record<string, string> = {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      };

      const res = await fetch(t.url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      const html = await res.text();

      // Sanitize: remove any cookies/tokens, keep only structural info
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)?.slice(0, 3);
      const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi)?.slice(0, 5);

      // Strip HTML tags from matches
      const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

      results.push({
        name: t.name,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type'),
        htmlLength: html.length,
        title: titleMatch ? stripTags(titleMatch[1]) : null,
        h1: h1Match ? stripTags(h1Match[1]) : null,
        h2s: h2Matches?.map(stripTags) || [],
        paragraphs: pMatches?.map(stripTags).filter(p => p.length > 5).slice(0, 3) || [],
        hasStoragePdfLink: /storage\.courtlistener\.com\/recap\/.*\.pdf/i.test(html),
        hasArchivePdfLink: /archive\.org\/download\/.*\.pdf/i.test(html),
        pdfLinkCount: (html.match(/\.pdf/gi) || []).length,
        hasJavascriptRedirect: /window\.location|document\.location|meta.*refresh/i.test(html),
        hasChallengeForm: /challenge|captcha|verify|cf-|turnstile/i.test(html),
      });
    } catch (e) {
      results.push({
        name: t.name,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
