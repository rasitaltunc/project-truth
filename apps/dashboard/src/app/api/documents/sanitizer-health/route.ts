/**
 * /api/documents/sanitizer-health
 * GET: PDF dezenfeksiyon pipeline sağlık kontrolü
 *
 * Ghostscript, QPDF, pdftotext kurulu mu? Versiyonları ne?
 */

import { NextResponse } from 'next/server';
import { checkSanitizerHealth } from '@/lib/pdfSanitizer';
import { isGCSAvailable } from '@/lib/gcs';
import { isDocumentAIAvailable } from '@/lib/documentAI';

export async function GET() {
  try {
    const sanitizerHealth = await checkSanitizerHealth();
    const gcsAvailable = isGCSAvailable();
    const documentAIAvailable = isDocumentAIAvailable();

    const allHealthy =
      sanitizerHealth.ghostscriptAvailable &&
      sanitizerHealth.qpdfAvailable &&
      gcsAvailable &&
      documentAIAvailable;

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      pipeline: {
        ghostscript: {
          available: sanitizerHealth.ghostscriptAvailable,
          version: sanitizerHealth.ghostscriptVersion,
          purpose: 'PDF dezenfeksiyon (JavaScript, gömülü dosya, makro temizliği)',
        },
        qpdf: {
          available: sanitizerHealth.qpdfAvailable,
          version: sanitizerHealth.qpdfVersion,
          purpose: 'PDF yapı tamiri + optimizasyon',
        },
        pdftotext: {
          available: sanitizerHealth.pdftotextAvailable,
          purpose: 'Redaksiyon tespit (metin karşılaştırma)',
        },
        gcs: {
          available: gcsAvailable,
          purpose: 'Google Cloud Storage (dosya depolama)',
        },
        documentAI: {
          available: documentAIAvailable,
          purpose: 'Google Document AI (OCR)',
        },
      },
      flow: [
        '1. Dosya yükleme (magic bytes doğrulama)',
        '2. Metadata sıyırma (EXIF, PDF author)',
        '3. Ghostscript dezenfeksiyon (exploit temizliği)',
        '4. QPDF yapı tamiri',
        '5. Redaksiyon tespit (siyah kutu altı metin)',
        '6. SHA-256 parmak izi',
        '7. GCS yükleme',
        '8. Document AI OCR',
        '9. AI varlık çıkarma → karantina',
        '10. İnsan doğrulama → ağa ekleme',
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    );
  }
}
