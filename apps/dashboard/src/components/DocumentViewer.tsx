'use client';

/**
 * DocumentViewer — PDF and Image viewer component
 * PDF: Uses react-pdf for page-by-page rendering with navigation
 * Image: Native <img> display with zoom
 * Federal indictment aesthetic
 */

import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Loader2, AlertTriangle, FileText, Image as ImageIcon,
} from 'lucide-react';

// Configure pdf.js worker — local copy from node_modules (no CDN dependency)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface DocumentViewerProps {
  fileUrl: string;
  fileType: 'pdf' | 'image';
  fileName?: string;
  onPageCountDetected?: (count: number) => void;
  onTextExtracted?: (text: string) => void;
  height?: string;
}

export default function DocumentViewer({
  fileUrl,
  fileType,
  fileName = 'Document',
  onPageCountDetected,
  height = '500px',
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setLoading(false);
    onPageCountDetected?.(pages);
  }, [onPageCountDetected]);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('[DocumentViewer] PDF load error:', err);
    setError('Failed to load PDF. The file may be corrupted.');
    setLoading(false);
  }, []);

  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3.0, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  // ─── Error State ─────────────────────────
  if (error) {
    return (
      <div style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        border: '1px solid #333',
        borderRadius: '4px',
        fontFamily: mono,
        color: '#ef4444',
        gap: '12px',
      }}>
        <AlertTriangle size={32} />
        <span style={{ fontSize: '13px' }}>{error}</span>
      </div>
    );
  }

  // ─── Image Viewer ─────────────────────────
  if (fileType === 'image') {
    return (
      <div style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0a',
        border: '1px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#111',
          borderBottom: '1px solid #333',
          fontFamily: mono,
          fontSize: '11px',
          color: '#999',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ImageIcon size={14} />
            <span>{fileName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={zoomOut} style={toolbarBtnStyle} title="Küçült">
              <ZoomOut size={14} />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} style={toolbarBtnStyle} title="Büyüt">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          {loading && (
            <div style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="animate-spin" />
              <span style={{ fontFamily: mono, fontSize: '12px' }}>Yükleniyor...</span>
            </div>
          )}
          <img
            src={fileUrl}
            alt={fileName}
            onLoad={() => setLoading(false)}
            onError={() => { setError('Görsel yüklenemedi.'); setLoading(false); }}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: 'transform 0.2s ease',
              display: loading ? 'none' : 'block',
            }}
          />
        </div>
      </div>
    );
  }

  // ─── PDF Viewer ─────────────────────────
  return (
    <div style={{
      height,
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      border: '1px solid #333',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: '#111',
        borderBottom: '1px solid #333',
        fontFamily: mono,
        fontSize: '11px',
        color: '#999',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={14} />
          <span>{fileName}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Page navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={goToPrevPage} disabled={currentPage <= 1} style={toolbarBtnStyle}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: '#e5e5e5', minWidth: '60px', textAlign: 'center' }}>
              {currentPage} / {numPages || '...'}
            </span>
            <button onClick={goToNextPage} disabled={currentPage >= numPages} style={toolbarBtnStyle}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={zoomOut} style={toolbarBtnStyle} title="Küçült">
              <ZoomOut size={14} />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} style={toolbarBtnStyle} title="Büyüt">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '16px',
        background: '#080808',
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
          }}>
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontFamily: mono, fontSize: '12px' }}>PDF yükleniyor...</span>
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            loading={null}
          />
        </Document>
      </div>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #444',
  borderRadius: '3px',
  color: '#999',
  cursor: 'pointer',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.15s',
};
