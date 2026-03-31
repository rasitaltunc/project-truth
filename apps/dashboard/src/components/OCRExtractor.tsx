'use client';

/**
 * OCRExtractor — UI component for OCR text extraction with progress
 * Shows real-time progress bar, page-by-page status, confidence score
 *
 * Sprint GCS — "Silah Yükseltmesi"
 * Sunucu OCR (Google Document AI) öncelikli, client Tesseract fallback.
 * Fotoğraflar için Vision AI analizi.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Loader2, Check, AlertTriangle, Eye,
  Server, Monitor, Camera, MapPin, Tag, Globe,
} from 'lucide-react';
import { extractTextOCR, type OCRResult, type OCRProgress } from '@/lib/ocr';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface ServerOCRResult {
  text: string;
  confidence: number;
  pageCount: number;
  method: string;
  processingTimeMs: number;
  hasTables?: boolean;
  hasForms?: boolean;
  language?: string;
}

interface VisionResult {
  summary: string;
  labels: Array<{ description: string; score: number }>;
  objects: Array<{ name: string; score: number }>;
  text: string | null;
  landmarks: Array<{ description: string; latitude: number; longitude: number }>;
  webBestGuesses: string[];
  processingTimeMs: number;
}

interface OCRExtractorProps {
  fileUrl: string;
  fileType: 'pdf' | 'image';
  documentId?: string;
  gcsPath?: string | null;
  onExtracted: (result: OCRResult) => void;
  onError?: (error: string) => void;
  onVisionResult?: (result: VisionResult) => void;
  disabled?: boolean;
}

export default function OCRExtractor({
  fileUrl,
  fileType,
  documentId,
  gcsPath,
  onExtracted,
  onError,
  onVisionResult,
  disabled = false,
}: OCRExtractorProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [ocrSource, setOcrSource] = useState<'server' | 'client' | 'vision'>('server');
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [visionData, setVisionData] = useState<VisionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const abortRef = useRef(false);

  // ─── Server-side OCR (Document AI) ─────────────────
  const startServerOCR = useCallback(async () => {
    if (status === 'running') return;
    if (!documentId) {
      // No documentId → fall back to client OCR
      startClientOCR();
      return;
    }

    setStatus('running');
    setOcrSource('server');
    setErrorMsg(null);
    setServerMessage('Establishing server connection...');
    abortRef.current = false;

    try {
      setProgress({ stage: 'loading', progress: 10, message: 'Starting Document AI...' });

      const response = await fetch('/api/documents/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          fileUrl,
          mimeType: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
          gcsPath,
        }),
      });

      if (abortRef.current) return;

      setProgress({ stage: 'extracting', progress: 50, message: 'Document AI processing...' });

      if (response.status === 503) {
        // Document AI unavailable → fall back to client OCR
        setServerMessage('Document AI unavailable, switching to client OCR...');
        setStatus('idle');
        setTimeout(() => startClientOCR(), 100);
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: ServerOCRResult = await response.json();

      setProgress({ stage: 'done', progress: 100, message: 'Complete!' });

      // Convert to OCRResult format for compatibility
      const ocrResult: OCRResult = {
        text: data.text,
        confidence: data.confidence,
        pageCount: data.pageCount,
        processingTimeMs: data.processingTimeMs,
        method: data.method === 'google_document_ai' ? 'ocr' : 'hybrid',
      };

      setResult(ocrResult);
      setServerMessage(
        `Document AI — ${data.language || 'unknown language'}` +
        (data.hasTables ? ' | Table detected' : '') +
        (data.hasForms ? ' | Form fields detected' : '')
      );
      setStatus('done');
      onExtracted(ocrResult);
    } catch (err: unknown) {
      if (abortRef.current) return;
      let msg = 'Server OCR failed';
      if (err instanceof Error) msg = err.message;
      console.error('[OCR] Server OCR error:', err);
      setErrorMsg(msg);
      setStatus('error');
      onError?.(msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, fileType, documentId, gcsPath, onExtracted, onError, status]);

  // ─── Client-side OCR (Tesseract fallback) ──────────
  const startClientOCR = useCallback(async () => {
    if (status === 'running') return;

    setStatus('running');
    setOcrSource('client');
    setErrorMsg(null);
    setServerMessage(null);
    abortRef.current = false;

    try {
      const ocrResult = await extractTextOCR(
        fileUrl,
        fileType,
        (p) => {
          if (!abortRef.current) setProgress(p);
        }
      );

      if (abortRef.current) return;

      setResult(ocrResult);
      setStatus('done');
      onExtracted(ocrResult);
    } catch (err: unknown) {
      let msg = 'OCR failed';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      else if (err && typeof err === 'object' && 'message' in err) msg = String((err as Record<string, unknown>).message);
      else { try { msg = 'Hata detayı: ' + JSON.stringify(err); } catch { msg = 'Hata: ' + String(err); } }
      console.error('[OCR] Client OCR error:', err);
      setErrorMsg(msg);
      setStatus('error');
      onError?.(msg);
    }
  }, [fileUrl, fileType, onExtracted, onError, status]);

  // ─── Vision AI (Fotoğraf analizi) ──────────────────
  const startVisionAI = useCallback(async () => {
    if (status === 'running') return;
    if (!documentId) return;

    setStatus('running');
    setOcrSource('vision');
    setErrorMsg(null);
    abortRef.current = false;

    try {
      setProgress({ stage: 'loading', progress: 20, message: 'Vision AI başlatılıyor...' });

      const response = await fetch('/api/documents/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, fileUrl, gcsPath }),
      });

      if (abortRef.current) return;

      setProgress({ stage: 'extracting', progress: 60, message: 'Görsel analiz ediliyor...' });

      if (response.status === 503) {
        throw new Error('Vision AI yapılandırılmamış. GCP credentials kontrol edin.');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: VisionResult = await response.json();

      setProgress({ stage: 'done', progress: 100, message: 'Analiz tamamlandı!' });
      setVisionData(data);

      // If vision found text, create an OCRResult too
      if (data.text) {
        const ocrResult: OCRResult = {
          text: data.text,
          confidence: 0.8,
          pageCount: 1,
          processingTimeMs: data.processingTimeMs,
          method: 'ocr',
        };
        setResult(ocrResult);
        onExtracted(ocrResult);
      }

      setStatus('done');
      onVisionResult?.(data);
    } catch (err: unknown) {
      if (abortRef.current) return;
      let msg = 'Vision AI başarısız oldu';
      if (err instanceof Error) msg = err.message;
      console.error('[Vision AI] Error:', err);
      setErrorMsg(msg);
      setStatus('error');
      onError?.(msg);
    }
  }, [fileUrl, documentId, gcsPath, onExtracted, onError, onVisionResult, status]);

  // ─── Idle State ─────────────────────────
  if (status === 'idle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {/* Primary: Server OCR (Document AI) */}
        <button
          onClick={startServerOCR}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 24px',
            background: disabled ? '#222' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            border: '1px solid #dc2626',
            borderRadius: '4px',
            color: disabled ? '#666' : '#fff',
            fontFamily: mono,
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: disabled ? 'not-allowed' : 'pointer',
            width: '100%',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          <Server size={18} />
          {fileType === 'pdf' ? 'SERVER OCR (Document AI)' : 'SERVER SCAN (Document AI)'}
        </button>

        {/* Secondary row: Client OCR + Vision AI */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Client OCR fallback */}
          <button
            onClick={startClientOCR}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: '#111',
              border: '1px solid #333',
              borderRadius: '4px',
              color: disabled ? '#555' : '#999',
              fontFamily: mono,
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: disabled ? 'not-allowed' : 'pointer',
              flex: 1,
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Monitor size={14} />
            CLIENT OCR
          </button>

          {/* Vision AI (only for images) */}
          {fileType === 'image' && documentId && (
            <button
              onClick={startVisionAI}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: '#111',
                border: '1px solid #1e3a5f',
                borderRadius: '4px',
                color: disabled ? '#555' : '#60a5fa',
                fontFamily: mono,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                flex: 1,
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <Camera size={14} />
              IMAGE ANALYSIS (Vision AI)
            </button>
          )}
        </div>

        {/* Server message (e.g. fallback notice) */}
        {serverMessage && (
          <div style={{ fontSize: '10px', color: '#f59e0b', fontFamily: mono, padding: '4px 0' }}>
            {serverMessage}
          </div>
        )}
      </div>
    );
  }

  // ─── Running State ─────────────────────────
  if (status === 'running') {
    const pct = progress?.progress || 0;
    const sourceLabel = ocrSource === 'server' ? 'DOCUMENT AI' : ocrSource === 'vision' ? 'VISION AI' : 'CLIENT OCR';
    const sourceColor = ocrSource === 'server' ? '#dc2626' : ocrSource === 'vision' ? '#3b82f6' : '#f59e0b';

    return (
      <div style={{
        padding: '16px',
        background: '#0a0a0a',
        border: `1px solid ${sourceColor}33`,
        borderRadius: '4px',
        fontFamily: mono,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          color: sourceColor,
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          <Loader2 size={16} className="animate-spin" />
          {sourceLabel} PROCESSING
        </div>

        {/* Progress bar */}
        <div style={{
          height: '6px',
          background: '#222',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '8px',
        }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${sourceColor}, #f59e0b)`,
              borderRadius: '3px',
            }}
          />
        </div>

        {/* Status message */}
        <div style={{ fontSize: '11px', color: '#888' }}>
          {progress?.message || 'Processing...'}
          {progress?.currentPage && progress?.totalPages && (
            <span style={{ color: '#e5e5e5', marginLeft: '8px' }}>
              [{progress.currentPage}/{progress.totalPages}]
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────
  if (status === 'error') {
    return (
      <div style={{
        padding: '16px',
        background: '#0a0a0a',
        border: '1px solid #7f1d1d',
        borderRadius: '4px',
        fontFamily: mono,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ef4444',
          fontSize: '12px',
          fontWeight: 700,
          marginBottom: '8px',
        }}>
          <AlertTriangle size={16} />
          {ocrSource === 'vision' ? 'IMAGE ANALYSIS FAILED' : 'OCR FAILED'}
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
          {errorMsg}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setStatus('idle'); setErrorMsg(null); setServerMessage(null); }}
            style={{
              padding: '8px 16px',
              background: '#222',
              border: '1px solid #444',
              borderRadius: '3px',
              color: '#e5e5e5',
              fontFamily: mono,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            RETRY
          </button>
          {/* If server OCR failed, offer client fallback */}
          {ocrSource === 'server' && (
            <button
              onClick={() => { setStatus('idle'); setErrorMsg(null); setTimeout(() => startClientOCR(), 50); }}
              style={{
                padding: '8px 16px',
                background: '#1a1a2e',
                border: '1px solid #444',
                borderRadius: '3px',
                color: '#f59e0b',
                fontFamily: mono,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              TRY CLIENT OCR
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Done State ─────────────────────────
  const isVisionDone = ocrSource === 'vision' && visionData;
  const isVisionNeeded = result?.method === 'vision_needed';
  const borderColor = isVisionDone ? '#1e3a5f' : isVisionNeeded ? '#92400e' : '#166534';

  return (
    <div style={{
      padding: '16px',
      background: '#0a0a0a',
      border: `1px solid ${borderColor}`,
      borderRadius: '4px',
      fontFamily: mono,
    }}>
      {/* Success header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: isVisionDone ? '#60a5fa' : isVisionNeeded ? '#f59e0b' : '#22c55e',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          <Check size={16} />
          {isVisionDone
            ? 'IMAGE ANALYSIS COMPLETE'
            : isVisionNeeded
              ? 'IMAGE ANALYSIS REQUIRED'
              : 'TEXT EXTRACTED'}
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: '#222',
            border: '1px solid #444',
            borderRadius: '3px',
            color: '#999',
            fontFamily: mono,
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          <Eye size={12} />
          {showPreview ? 'HIDE' : 'PREVIEW'}
        </button>
      </div>

      {/* OCR Stats */}
      {result && !isVisionDone && (
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '11px',
          color: '#888',
          marginBottom: (showPreview || isVisionNeeded) ? '12px' : 0,
          flexWrap: 'wrap',
        }}>
          <span>Pages: <strong style={{ color: '#e5e5e5' }}>{result.pageCount}</strong></span>
          <span>Confidence: <strong style={{ color: result.confidence > 0.7 ? '#22c55e' : '#f59e0b' }}>
            {Math.round(result.confidence * 100)}%
          </strong></span>
          <span>Method: <strong style={{ color: '#e5e5e5' }}>
            {ocrSource === 'server' ? 'Document AI' : result.method === 'pdf_text' ? 'Text Layer' : result.method === 'ocr' ? 'Tesseract' : result.method === 'vision_needed' ? 'Image (AI Required)' : 'Hybrid'}
          </strong></span>
          <span>Time: <strong style={{ color: '#e5e5e5' }}>
            {(result.processingTimeMs / 1000).toFixed(1)}s
          </strong></span>
        </div>
      )}

      {/* Server OCR extra info */}
      {serverMessage && ocrSource === 'server' && (
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
          {serverMessage}
        </div>
      )}

      {/* Vision AI Results */}
      {isVisionDone && visionData && (
        <div style={{ marginBottom: showPreview ? '12px' : 0 }}>
          {/* Vision stats row */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span>Labels: <strong style={{ color: '#e5e5e5' }}>{visionData.labels.length}</strong></span>
            <span>Objects: <strong style={{ color: '#e5e5e5' }}>{visionData.objects.length}</strong></span>
            <span>Locations: <strong style={{ color: '#e5e5e5' }}>{visionData.landmarks.length > 0 ? 'Yes' : 'No'}</strong></span>
            <span>Text: <strong style={{ color: '#e5e5e5' }}>{visionData.text ? `${visionData.text.length} chr` : 'None'}</strong></span>
            <span>Time: <strong style={{ color: '#e5e5e5' }}>{(visionData.processingTimeMs / 1000).toFixed(1)}s</strong></span>
          </div>

          {/* Labels */}
          {visionData.labels.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                <Tag size={10} />
                LABELS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {visionData.labels.slice(0, 8).map((l, i) => (
                  <span key={i} style={{
                    padding: '2px 8px',
                    background: '#1e293b',
                    borderRadius: '10px',
                    fontSize: '10px',
                    color: l.score > 0.8 ? '#60a5fa' : '#94a3b8',
                  }}>
                    {l.description} ({Math.round(l.score * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Landmarks */}
          {visionData.landmarks.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                <MapPin size={10} />
                DETECTED LOCATIONS
              </div>
              {visionData.landmarks.map((lm, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#e5e5e5' }}>
                  {lm.description} ({lm.latitude.toFixed(4)}, {lm.longitude.toFixed(4)})
                </div>
              ))}
            </div>
          )}

          {/* Web best guesses */}
          {visionData.webBestGuesses.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                <Globe size={10} />
                WEB RESULTS
              </div>
              <div style={{ fontSize: '10px', color: '#999' }}>
                {visionData.webBestGuesses.join(' • ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vision Needed: offer Vision AI button */}
      {isVisionNeeded && !isVisionDone && documentId && (
        <button
          onClick={startVisionAI}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            color: '#fff',
            fontFamily: mono,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'center',
            marginBottom: showPreview ? '12px' : 0,
          }}
        >
          <Camera size={16} />
          START IMAGE ANALYSIS (Vision AI)
        </button>
      )}

      {/* Text preview */}
      <AnimatePresence>
        {showPreview && (result || visionData) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <pre style={{
              maxHeight: '200px',
              overflow: 'auto',
              padding: '12px',
              background: '#111',
              borderRadius: '3px',
              fontSize: '10px',
              color: '#999',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {visionData?.summary && `--- IMAGE ANALYSIS ---\n${visionData.summary}\n\n`}
              {(result?.text || visionData?.text || '').substring(0, 3000)}
              {((result?.text || visionData?.text || '').length > 3000) && '\n\n... [truncated]'}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
