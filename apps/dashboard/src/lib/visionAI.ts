/**
 * Google Cloud Vision AI Wrapper
 * Sprint GCS — "Silah Yükseltmesi"
 *
 * Fotoğraf analizi — FBI evidence fotoları, bina görselleri,
 * belge fotoğrafları için nesne, etiket, landmark, metin tespiti.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import vision from '@google-cloud/vision';

// ─── Configuration ────────────────────────────────────

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

let _client: InstanceType<typeof vision.ImageAnnotatorClient> | null = null;

function getClient(): InstanceType<typeof vision.ImageAnnotatorClient> | null {
  if (_client) return _client;

  if (!GCP_PROJECT_ID) {
    console.warn('[VisionAI] GCP_PROJECT_ID not set — Vision AI disabled');
    return null;
  }

  try {
    const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (keyJson) {
      const credentials = JSON.parse(keyJson);
      _client = new vision.ImageAnnotatorClient({ credentials });
    } else if (keyFile) {
      _client = new vision.ImageAnnotatorClient({ keyFilename: keyFile });
    } else {
      _client = new vision.ImageAnnotatorClient();
    }

    return _client;
  } catch (err) {
    console.error('[VisionAI] Failed to initialize client:', err);
    return null;
  }
}

// ─── Types ────────────────────────────────────────────

export interface VisionLabel {
  description: string;
  score: number;
}

export interface VisionObject {
  name: string;
  score: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisionLandmark {
  description: string;
  score: number;
  latitude: number;
  longitude: number;
}

export interface VisionWebEntity {
  description: string;
  score: number;
}

export interface VisionAnalysisResult {
  labels: VisionLabel[];
  objects: VisionObject[];
  text: string | null;
  landmarks: VisionLandmark[];
  webEntities: VisionWebEntity[];
  webBestGuesses: string[];
  matchingPageUrls: string[];
  safeSearch: {
    adult: string;
    violence: string;
    racy: string;
  } | null;
  processingTimeMs: number;
}

// ─── Public API ───────────────────────────────────────

/**
 * Check if Vision AI is configured and available
 */
export function isVisionAIAvailable(): boolean {
  return !!GCP_PROJECT_ID;
}

/**
 * Analyze an image with Google Cloud Vision AI
 *
 * @param imageBuffer — Raw image bytes (JPEG, PNG, GIF, BMP, WebP, TIFF)
 * @param features — Which analyses to run (default: all)
 * @returns Vision analysis results or null on failure
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  features?: ('labels' | 'objects' | 'text' | 'landmarks' | 'web' | 'safe_search')[]
): Promise<VisionAnalysisResult | null> {
  const client = getClient();
  if (!client) return null;

  const startTime = Date.now();

  // Default: run all features
  const requestedFeatures = features || ['labels', 'objects', 'text', 'landmarks', 'web', 'safe_search'];

  // Build feature list for API
  const featureList: Array<{ type: string; maxResults?: number }> = [];

  if (requestedFeatures.includes('labels')) {
    featureList.push({ type: 'LABEL_DETECTION', maxResults: 15 });
  }
  if (requestedFeatures.includes('objects')) {
    featureList.push({ type: 'OBJECT_LOCALIZATION', maxResults: 20 });
  }
  if (requestedFeatures.includes('text')) {
    featureList.push({ type: 'TEXT_DETECTION' });
  }
  if (requestedFeatures.includes('landmarks')) {
    featureList.push({ type: 'LANDMARK_DETECTION', maxResults: 10 });
  }
  if (requestedFeatures.includes('web')) {
    featureList.push({ type: 'WEB_DETECTION' });
  }
  if (requestedFeatures.includes('safe_search')) {
    featureList.push({ type: 'SAFE_SEARCH_DETECTION' });
  }

  try {
    const [result] = await client.annotateImage({
      image: { content: imageBuffer.toString('base64') },
      features: featureList,
    });

    // Parse labels
    const labels: VisionLabel[] = (result.labelAnnotations || []).map((l: any) => ({
      description: l.description || '',
      score: l.score || 0,
    }));

    // Parse objects
    const objects: VisionObject[] = (result.localizedObjectAnnotations || []).map((o: any) => {
      const vertices = o.boundingPoly?.normalizedVertices || [];
      const x = vertices[0]?.x || 0;
      const y = vertices[0]?.y || 0;
      const x2 = vertices[2]?.x || 0;
      const y2 = vertices[2]?.y || 0;

      return {
        name: o.name || '',
        score: o.score || 0,
        boundingBox: {
          x,
          y,
          width: x2 - x,
          height: y2 - y,
        },
      };
    });

    // Parse text
    const textAnnotations = result.textAnnotations || [];
    const text = textAnnotations.length > 0 ? textAnnotations[0].description || null : null;

    // Parse landmarks
    const landmarks: VisionLandmark[] = (result.landmarkAnnotations || []).map((l: any) => ({
      description: l.description || '',
      score: l.score || 0,
      latitude: l.locations?.[0]?.latLng?.latitude || 0,
      longitude: l.locations?.[0]?.latLng?.longitude || 0,
    }));

    // Parse web detection
    const webDetection = result.webDetection;
    const webEntities: VisionWebEntity[] = (webDetection?.webEntities || [])
      .filter((e: any) => e.description)
      .map((e: any) => ({
        description: e.description || '',
        score: e.score || 0,
      }));

    const webBestGuesses: string[] = (webDetection?.bestGuessLabels || [])
      .map((l: any) => l.label || '')
      .filter(Boolean);

    const matchingPageUrls: string[] = (webDetection?.pagesWithMatchingImages || [])
      .map((p: any) => p.url || '')
      .filter(Boolean)
      .slice(0, 5); // Limit to 5

    // Parse safe search
    const safeSearch = result.safeSearchAnnotation
      ? {
          adult: String(result.safeSearchAnnotation.adult || 'UNKNOWN'),
          violence: String(result.safeSearchAnnotation.violence || 'UNKNOWN'),
          racy: String(result.safeSearchAnnotation.racy || 'UNKNOWN'),
        }
      : null;

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[VisionAI] Analyzed: ${labels.length} labels, ${objects.length} objects, ` +
      `${landmarks.length} landmarks, text: ${text ? text.length + ' chars' : 'none'}, ` +
      `${processingTimeMs}ms`
    );

    return {
      labels,
      objects,
      text,
      landmarks,
      webEntities,
      webBestGuesses,
      matchingPageUrls,
      safeSearch,
      processingTimeMs,
    };
  } catch (err) {
    console.error('[VisionAI] Analysis failed:', err);
    return null;
  }
}

/**
 * Quick text-only extraction from an image (cheaper than full analysis)
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string | null> {
  const result = await analyzeImage(imageBuffer, ['text']);
  return result?.text || null;
}
