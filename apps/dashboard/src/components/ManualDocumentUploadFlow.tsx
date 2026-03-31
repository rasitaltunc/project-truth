'use client';

/**
 * ManualDocumentUploadFlow — 5-step modal for document processing
 * Step 1: UPLOAD — drag-drop file upload
 * Step 2: VIEW — PDF/image viewer for visual inspection
 * Step 3: OCR — text extraction with progress
 * Step 4: AI SCAN — Groq entity extraction
 * Step 5: RESULTS — review entities, quarantine status
 *
 * Federal indictment aesthetic
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Eye, ScanLine, Brain, Check,
  ChevronRight, ChevronLeft, Loader2, FileText,
  Image as ImageIcon, AlertTriangle,
} from 'lucide-react';
import DocumentViewer from './DocumentViewer';
import OCRExtractor from './OCRExtractor';
import DocumentPipelineStatus, { type PipelineStage } from './DocumentPipelineStatus';
import { useDocumentStore, type DocumentRecord, type ScanResultData } from '@/store/documentStore';
import type { OCRResult } from '@/lib/ocr';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface ManualDocumentUploadFlowProps {
  networkId: string;
  fingerprint: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (document: DocumentRecord) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, { label: string; icon: React.ReactNode }> = {
  1: { label: 'UPLOAD', icon: <Upload size={14} /> },
  2: { label: 'REVIEW', icon: <Eye size={14} /> },
  3: { label: 'OCR', icon: <ScanLine size={14} /> },
  4: { label: 'AI SCAN', icon: <Brain size={14} /> },
  5: { label: 'RESULTS', icon: <Check size={14} /> },
};

// ═══════════════════════════════════════════════════════
// ALLOWED FILE TYPES
// ═══════════════════════════════════════════════════════

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function ManualDocumentUploadFlow({
  networkId,
  fingerprint,
  isOpen,
  onClose,
  onComplete,
}: ManualDocumentUploadFlowProps) {
  // Step state
  const [step, setStep] = useState<Step>(1);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('uploaded');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<DocumentRecord | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [gcsPath, setGcsPath] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image'>('pdf');

  // Metadata fields
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('court_record');

  // OCR state
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  // AI Scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scanDocument, fetchDocuments, fetchStats } = useDocumentStore();

  // Drag & drop state
  const [dragOver, setDragOver] = useState(false);

  // ─── File selection ─────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(`Desteklenmeyen dosya tipi: ${file.type}. Sadece PDF ve görsel kabul edilir.`);
      return;
    }
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB`);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setFileType(file.type === 'application/pdf' ? 'pdf' : 'image');
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  }, [title]);

  // ─── Upload to server ─────────────────────────
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fingerprint', fingerprint);
      formData.append('network_id', networkId);
      formData.append('title', title || selectedFile.name);
      formData.append('document_type', documentType);

      const res = await fetch('/api/documents/manual-upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setUploadedDocument(data.document);
      // Use proxy URL for GCS files (avoids CORS), direct URL for Supabase
      const proxyUrl = data.storageProvider === 'gcs' && data.document?.id
        ? `/api/documents/${data.document.id}/file`
        : data.displayUrl;
      setDisplayUrl(proxyUrl);
      setGcsPath(data.gcsPath || null);
      setFileType(data.fileType);
      setPipelineStage('uploaded');
      setStep(2);

      // Refresh document list
      fetchDocuments(networkId, 1);
      fetchStats(networkId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, fingerprint, networkId, title, documentType, fetchDocuments, fetchStats]);

  // ─── Move to OCR step ─────────────────────────
  const handleProceedToOCR = useCallback(() => {
    setPipelineStage('viewing');
    setStep(3);
  }, []);

  // ─── OCR complete ─────────────────────────
  const handleOCRExtracted = useCallback(async (result: OCRResult) => {
    setOcrResult(result);
    setPipelineStage('ocr_done');

    // Save OCR text to server
    if (uploadedDocument) {
      try {
        await fetch(`/api/documents/${uploadedDocument.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_content: result.text,
            ocr_status: 'completed',
            ocr_extracted_text: result.text,
            ocr_confidence: result.confidence,
            ocr_page_count: result.pageCount,
          }),
        });
      } catch {
        console.warn('[ManualUpload] Failed to save OCR text');
      }
    }
  }, [uploadedDocument]);

  // ─── Start AI Scan ─────────────────────────
  const handleStartAIScan = useCallback(async () => {
    if (!uploadedDocument || !ocrResult) return;

    setScanning(true);
    setScanError(null);
    setPipelineStage('ai_scanning');
    setStep(4);

    try {
      // Send extracted text directly to scan endpoint
      const res = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: uploadedDocument.id,
          fingerprint,
          extracted_text: ocrResult.text,
        }),
      });

      if (!res.ok) throw new Error(`Scan failed (HTTP ${res.status})`);

      const result = await res.json();
      setScanResult(result);
      setPipelineStage('quarantine');
      setStep(5);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'AI tarama başarısız');
      setPipelineStage('ai_done');
    } finally {
      setScanning(false);
    }
  }, [uploadedDocument, ocrResult, fingerprint]);

  // ─── Close and cleanup ─────────────────────────
  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedFile(null);
    setUploading(false);
    setUploadError(null);
    setUploadedDocument(null);
    setDisplayUrl(null);
    setGcsPath(null);
    setTitle('');
    setDocumentType('court_record');
    setOcrResult(null);
    setScanning(false);
    setScanResult(null);
    setScanError(null);
    setPipelineStage('uploaded');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{
            width: '100%',
            maxWidth: '880px',
            maxHeight: '90vh',
            background: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ─── Header ─────────────────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #222',
            background: '#080808',
          }}>
            <div style={{
              fontFamily: mono,
              fontSize: '13px',
              fontWeight: 700,
              color: '#dc2626',
              letterSpacing: '0.15em',
            }}>
              DOCUMENT UPLOAD SYSTEM
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                <div key={s} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  background: s === step ? '#1a1a1a' : 'transparent',
                  border: s === step ? '1px solid #333' : '1px solid transparent',
                  color: s < step ? '#22c55e' : s === step ? '#e5e5e5' : '#555',
                  fontFamily: mono,
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}>
                  {s < step ? <Check size={10} /> : STEP_LABELS[s].icon}
                  {STEP_LABELS[s].label}
                </div>
              ))}
            </div>

            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ─── Content ─────────────────────────── */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
          }}>
            {/* Pipeline status (shown from step 2 onwards) */}
            {step >= 2 && (
              <div style={{ marginBottom: '16px' }}>
                <DocumentPipelineStatus currentStage={pipelineStage} />
              </div>
            )}

            {/* ═══ STEP 1: UPLOAD ═══ */}
            {step === 1 && (
              <div>
                {/* Drag & drop area */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? '#dc2626' : selectedFile ? '#166534' : '#333'}`,
                    borderRadius: '6px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? '#0f0f0f' : '#080808',
                    transition: 'all 0.2s',
                    marginBottom: '16px',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.tiff"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  {selectedFile ? (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#22c55e',
                        marginBottom: '8px',
                      }}>
                        {fileType === 'pdf' ? <FileText size={24} /> : <ImageIcon size={24} />}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: '13px', color: '#e5e5e5', fontWeight: 700 }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontFamily: mono, fontSize: '11px', color: '#888', marginTop: '4px' }}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · {fileType === 'pdf' ? 'PDF Document' : 'Image'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} style={{ color: '#555', margin: '0 auto 12px' }} />
                      <div style={{ fontFamily: mono, fontSize: '13px', color: '#888' }}>
                        PDF veya görsel dosyası sürükle & bırak
                      </div>
                      <div style={{ fontFamily: mono, fontSize: '11px', color: '#555', marginTop: '6px' }}>
                        veya tıklayarak seç · Maks 50MB · PDF, JPEG, PNG, WebP, TIFF
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata fields */}
                {selectedFile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    {/* Title */}
                    <div>
                      <label style={{ fontFamily: mono, fontSize: '10px', color: '#888', fontWeight: 700, letterSpacing: '0.1em' }}>
                        TITLE
                      </label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Belge başlığı"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: '#111',
                          border: '1px solid #333',
                          borderRadius: '3px',
                          color: '#e5e5e5',
                          fontFamily: mono,
                          fontSize: '13px',
                          marginTop: '4px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Document type */}
                    <div>
                      <label style={{ fontFamily: mono, fontSize: '10px', color: '#888', fontWeight: 700, letterSpacing: '0.1em' }}>
                        DOCUMENT TYPE
                      </label>
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: '#111',
                          border: '1px solid #333',
                          borderRadius: '3px',
                          color: '#e5e5e5',
                          fontFamily: mono,
                          fontSize: '13px',
                          marginTop: '4px',
                          outline: 'none',
                        }}
                      >
                        <option value="court_record">Court Record</option>
                        <option value="indictment">Indictment</option>
                        <option value="deposition">Deposition</option>
                        <option value="financial">Financial Document</option>
                        <option value="correspondence">Correspondence</option>
                        <option value="foia">FOIA Request</option>
                        <option value="leaked">Leaked Document</option>
                        <option value="media">Media/News</option>
                        <option value="academic">Academic</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Error */}
                {uploadError && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#1a0000',
                    border: '1px solid #7f1d1d',
                    borderRadius: '3px',
                    color: '#ef4444',
                    fontFamily: mono,
                    fontSize: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertTriangle size={14} />
                    {uploadError}
                  </div>
                )}

                {/* Upload button */}
                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: uploading ? '#333' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      border: '1px solid #dc2626',
                      borderRadius: '4px',
                      color: '#fff',
                      fontFamily: mono,
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {uploading ? (
                      <><Loader2 size={16} className="animate-spin" /> UPLOADING...</>
                    ) : (
                      <><Upload size={16} /> UPLOAD FILE</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ═══ STEP 2: VIEW ═══ */}
            {step === 2 && displayUrl && (
              <div>
                <div style={{
                  fontFamily: mono,
                  fontSize: '11px',
                  color: '#888',
                  marginBottom: '12px',
                  letterSpacing: '0.05em',
                }}>
                  Review the document. Make sure it is a valid {fileType === 'pdf' ? 'PDF document' : 'image'}.
                  When ready, proceed to OCR step.
                </div>

                <DocumentViewer
                  fileUrl={displayUrl}
                  fileType={fileType}
                  fileName={title || 'Document'}
                  height="400px"
                />

                <button
                  onClick={handleProceedToOCR}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    border: '1px solid #dc2626',
                    borderRadius: '4px',
                    color: '#fff',
                    fontFamily: mono,
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <ScanLine size={16} /> REVIEWED, START OCR <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ═══ STEP 3: OCR ═══ */}
            {step === 3 && displayUrl && (
              <div>
                <div style={{
                  fontFamily: mono,
                  fontSize: '11px',
                  color: '#888',
                  marginBottom: '16px',
                  letterSpacing: '0.05em',
                }}>
                  OCR will extract all text from the document.
                  {fileType === 'pdf'
                    ? ' If PDF has text layer, extraction will be fast; otherwise, page-by-page OCR is performed.'
                    : ' Image will be scanned with Tesseract.js (Turkish + English).'
                  }
                </div>

                <OCRExtractor
                  fileUrl={displayUrl}
                  fileType={fileType}
                  documentId={uploadedDocument?.id}
                  gcsPath={gcsPath}
                  onExtracted={handleOCRExtracted}
                  onError={(err) => console.error('[OCR Error]', err)}
                />

                {/* Proceed to AI scan */}
                {ocrResult && (
                  <button
                    onClick={handleStartAIScan}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      border: '1px solid #dc2626',
                      borderRadius: '4px',
                      color: '#fff',
                      fontFamily: mono,
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Brain size={16} /> ANALYZE WITH AI <ChevronRight size={16} />
                  </button>
                )}
              </div>
            )}

            {/* ═══ STEP 4: AI SCANNING ═══ */}
            {step === 4 && (
              <div>
                {scanning ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                  }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
                    <div style={{
                      fontFamily: mono,
                      fontSize: '13px',
                      color: '#f59e0b',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}>
                      AI ANALYZING...
                    </div>
                    <div style={{ fontFamily: mono, fontSize: '11px', color: '#888' }}>
                      Groq AI is extracting people, organizations, and relationships from the document.
                    </div>
                  </div>
                ) : scanError ? (
                  <div style={{
                    padding: '20px',
                    background: '#1a0000',
                    border: '1px solid #7f1d1d',
                    borderRadius: '4px',
                    textAlign: 'center',
                  }}>
                    <AlertTriangle size={24} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
                    <div style={{ fontFamily: mono, fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>
                      {scanError}
                    </div>
                    <button
                      onClick={handleStartAIScan}
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
                      TEKRAR DENE
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* ═══ STEP 5: RESULTS ═══ */}
            {step === 5 && scanResult && (
              <div>
                <div style={{
                  fontFamily: mono,
                  fontSize: '11px',
                  color: '#22c55e',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Check size={14} />
                  SCAN COMPLETED — Results sent to quarantine
                </div>

                {/* Summary */}
                <div style={{
                  padding: '16px',
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontFamily: mono,
                  fontSize: '12px',
                  color: '#e5e5e5',
                }}>
                  <div style={{ marginBottom: '8px', fontWeight: 700, color: '#888', fontSize: '10px', letterSpacing: '0.1em' }}>
                    SUMMARY
                  </div>
                  <div style={{ lineHeight: 1.6 }}>
                    {scanResult.summary || 'Summary not available'}
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <StatBox label="PERSON/ORG" value={scanResult.entities?.length || 0} color="#dc2626" />
                  <StatBox label="RELATIONSHIP" value={scanResult.relationships?.length || 0} color="#f59e0b" />
                  <StatBox label="DATE" value={scanResult.keyDates?.length || 0} color="#3b82f6" />
                  <StatBox label="CONFIDENCE" value={`${Math.round((scanResult.confidence || 0) * 100)}%`} color="#22c55e" />
                </div>

                {/* Entities list */}
                {scanResult.entities && scanResult.entities.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#888',
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}>
                      EXTRACTED ENTITIES (awaiting quarantine review)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {scanResult.entities.map((entity, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#111',
                          border: '1px solid #1a1a1a',
                          borderRadius: '3px',
                          fontFamily: mono,
                          fontSize: '11px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '2px',
                              fontSize: '9px',
                              fontWeight: 700,
                              background: entity.type === 'person' ? '#7f1d1d' : entity.type === 'organization' ? '#1e3a5f' : '#333',
                              color: entity.type === 'person' ? '#fca5a5' : entity.type === 'organization' ? '#93c5fd' : '#999',
                            }}>
                              {entity.type.toUpperCase()}
                            </span>
                            <span style={{ color: '#e5e5e5' }}>{entity.name}</span>
                          </div>
                          <span style={{
                            color: entity.confidence > 0.8 ? '#22c55e' : entity.confidence > 0.6 ? '#f59e0b' : '#ef4444',
                            fontSize: '10px',
                          }}>
                            {Math.round(entity.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relationships list */}
                {scanResult.relationships && scanResult.relationships.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#888',
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}>
                      EXTRACTED RELATIONSHIPS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {scanResult.relationships.map((rel, i) => (
                        <div key={i} style={{
                          padding: '8px 12px',
                          background: '#111',
                          border: '1px solid #1a1a1a',
                          borderRadius: '3px',
                          fontFamily: mono,
                          fontSize: '11px',
                          color: '#e5e5e5',
                        }}>
                          <span style={{ color: '#fca5a5' }}>{rel.sourceName}</span>
                          <span style={{ color: '#666', margin: '0 6px' }}>→</span>
                          <span style={{ color: '#93c5fd' }}>{rel.targetName}</span>
                          <span style={{ color: '#555', margin: '0 8px' }}>·</span>
                          <span style={{ color: '#888', fontSize: '10px' }}>{rel.relationshipType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info note */}
                <div style={{
                  padding: '12px 14px',
                  background: '#111',
                  border: '1px solid #1e3a5f',
                  borderRadius: '4px',
                  fontFamily: mono,
                  fontSize: '11px',
                  color: '#60a5fa',
                  lineHeight: 1.6,
                }}>
                  All extracted data has been sent to <strong>QUARANTINE</strong>.
                  An independent user must verify before adding to network.
                  After verification, &quot;ADD TO NETWORK&quot; button will be enabled.
                </div>

                {/* Close button */}
                <button
                  onClick={() => {
                    if (uploadedDocument && onComplete) {
                      onComplete(uploadedDocument);
                    }
                    handleClose();
                  }}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    background: '#166534',
                    border: '1px solid #22c55e',
                    borderRadius: '4px',
                    color: '#fff',
                    fontFamily: mono,
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                  }}
                >
                  DONE, CLOSE
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Helper: Stat Box ─────────────────────────
function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      padding: '12px',
      background: '#111',
      border: '1px solid #1a1a1a',
      borderRadius: '4px',
      textAlign: 'center',
      fontFamily: mono,
    }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '8px', fontWeight: 700, color: '#666', letterSpacing: '0.1em', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
