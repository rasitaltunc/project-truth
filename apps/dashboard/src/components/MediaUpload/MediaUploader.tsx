'use client';

// ═══════════════════════════════════════════
// MEDIA UPLOADER — Sprint 9
// Sürükle-bırak medya yükleme bileşeni
// EXIF uyarısı + metadata sıyırma seçeneği
// Project Truth "Federal Indictment" aesthetic
// ═══════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, Film, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

// ── Types ──
interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  url?: string;
  hash?: string;
  error?: string;
  hasGpsWarning?: boolean;
}

interface MediaUploaderProps {
  fingerprint: string;
  nodeId?: string;
  evidenceId?: string;
  onUploadComplete?: (files: { url: string; hash: string; mediaId: string }[]) => void;
  maxFiles?: number;
  compact?: boolean;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf',
];
const MAX_SIZE = 50 * 1024 * 1024;

export default function MediaUploader({
  fingerprint,
  nodeId,
  evidenceId,
  onUploadComplete,
  maxFiles = 5,
  compact = false,
}: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [stripMetadata, setStripMetadata] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Dosya ekleme ──
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const added: UploadFile[] = [];

    for (const file of Array.from(newFiles)) {
      if (files.length + added.length >= maxFiles) break;

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`Desteklenmeyen format: ${file.name}\nİzin verilenler: JPG, PNG, WebP, GIF, MP4, WebM, PDF`);
        continue;
      }

      if (file.size > MAX_SIZE) {
        alert(`File too large: ${file.name}\nMax: 50MB`);
        continue;
      }

      // GPS/EXIF uyarısı (JPEG/PNG)
      const hasGpsWarning = file.type.startsWith('image/');

      added.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        status: 'pending',
        progress: 0,
        hasGpsWarning,
      });
    }

    setFiles(prev => [...prev, ...added]);
  }, [files.length, maxFiles]);

  // ── Drag & Drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // ── Dosya kaldır ──
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── Yükleme başlat ──
  const uploadAll = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) return;

    const results: { url: string; hash: string; mediaId: string }[] = [];

    for (const uploadFile of pending) {
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 20 } : f
      ));

      try {
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        formData.append('fingerprint', fingerprint);
        formData.append('strip_metadata', stripMetadata ? 'true' : 'false');
        if (nodeId) formData.append('node_id', nodeId);
        if (evidenceId) formData.append('evidence_id', evidenceId);

        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, progress: 50 } : f
        ));

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setFiles(prev => prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'done' as const, progress: 100, url: data.url, hash: data.hash }
              : f
          ));
          results.push({
            url: data.url || '',
            hash: data.hash || '',
            mediaId: data.mediaId || '',
          });
        } else {
          setFiles(prev => prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'error' as const, error: data.error || data.message }
              : f
          ));
        }
      } catch (err: any) {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error' as const, error: err.message }
            : f
        ));
      }
    }

    if (results.length > 0 && onUploadComplete) {
      onUploadComplete(results);
    }
  }, [files, fingerprint, nodeId, evidenceId, stripMetadata, onUploadComplete]);

  // ── Dosya ikonu ──
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={14} />;
    if (type.startsWith('video/')) return <Film size={14} />;
    return <FileText size={14} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const hasGpsFiles = files.some(f => f.hasGpsWarning && f.status === 'pending');

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      border: '1px solid #1a1a1a',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Upload size={12} style={{ color: '#dc2626' }} />
        <span style={{
          fontSize: '9px',
          letterSpacing: '0.2em',
          color: '#dc2626',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
        }}>
          MEDYA YÜKLEME
        </span>
        <span style={{ fontSize: '9px', color: '#444', fontFamily: 'monospace', marginLeft: 'auto' }}>
          {files.length}/{maxFiles}
        </span>
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: compact ? '16px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: isDragging ? '2px dashed #dc2626' : '2px dashed #222',
          borderRadius: '4px',
          margin: '8px',
          backgroundColor: isDragging ? '#dc262608' : 'transparent',
          transition: 'all 0.2s ease',
          minHeight: compact ? '60px' : '80px',
        }}
      >
        <Upload size={compact ? 16 : 20} style={{ color: isDragging ? '#dc2626' : '#444', marginBottom: '6px' }} />
        <div style={{ fontSize: '10px', color: isDragging ? '#dc2626' : '#555', fontFamily: 'monospace', textAlign: 'center' }}>
          {isDragging ? 'BIRAKIN' : 'Sürükle-bırak veya tıkla'}
        </div>
        <div style={{ fontSize: '8px', color: '#333', fontFamily: 'monospace', marginTop: '2px' }}>
          JPG, PNG, PDF, MP4, WebM — Max 50MB
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* ── GPS/EXIF Uyarısı ── */}
      {hasGpsFiles && (
        <div style={{
          padding: '8px 12px',
          margin: '0 8px 8px',
          backgroundColor: '#f59e0b12',
          border: '1px solid #f59e0b30',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '2px' }}>
              GPS/EXIF UYARISI
            </div>
            <div style={{ fontSize: '9px', color: '#888', lineHeight: 1.5 }}>
              Yüklediğiniz fotoğraflarda konum ve kamera bilgisi olabilir.
            </div>
          </div>
        </div>
      )}

      {/* ── Metadata Strip Toggle ── */}
      {files.length > 0 && (
        <div style={{
          padding: '6px 12px',
          margin: '0 8px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setStripMetadata(!stripMetadata); }}
            style={{
              width: '32px',
              height: '16px',
              borderRadius: '8px',
              backgroundColor: stripMetadata ? '#dc262640' : '#333',
              border: `1px solid ${stripMetadata ? '#dc262680' : '#444'}`,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s',
              padding: 0,
            }}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: stripMetadata ? '#dc2626' : '#666',
              position: 'absolute',
              top: '1px',
              left: stripMetadata ? '17px' : '1px',
              transition: 'all 0.2s',
            }} />
          </button>
          <Shield size={10} style={{ color: stripMetadata ? '#dc2626' : '#555' }} />
          <span style={{
            fontSize: '9px',
            color: stripMetadata ? '#ccc' : '#555',
            fontFamily: 'monospace',
          }}>
            {stripMetadata ? 'Metadata Temizle (EXIF/GPS kaldır)' : 'Metadata koru'}
          </span>
        </div>
      )}

      {/* ── Dosya Listesi ── */}
      {files.length > 0 && (
        <div style={{ padding: '0 8px 8px' }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              backgroundColor: '#111',
              borderRadius: '3px',
              marginBottom: '4px',
              border: f.status === 'error' ? '1px solid #dc262640' : '1px solid #1a1a1a',
            }}>
              {/* İkon */}
              <div style={{ color: f.status === 'done' ? '#22c55e' : f.status === 'error' ? '#dc2626' : '#555' }}>
                {f.status === 'done' ? <CheckCircle size={14} /> : getFileIcon(f.file.type)}
              </div>

              {/* Bilgi */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: '9px',
                  color: '#ccc',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {stripMetadata ? `[temiz]_${f.file.name.slice(-12)}` : f.file.name}
                </div>
                <div style={{ fontSize: '8px', color: '#444', fontFamily: 'monospace' }}>
                  {formatSize(f.file.size)}
                  {f.status === 'error' && <span style={{ color: '#dc2626' }}> — {f.error}</span>}
                </div>
              </div>

              {/* Progress */}
              {f.status === 'uploading' && (
                <div style={{ width: '40px', height: '3px', backgroundColor: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${f.progress}%`, height: '100%', backgroundColor: '#dc2626', transition: 'width 0.3s' }} />
                </div>
              )}

              {/* Hash (başarılı yükleme) */}
              {f.status === 'done' && f.hash && (
                <span style={{ fontSize: '7px', color: '#22c55e40', fontFamily: 'monospace' }}>
                  #{f.hash.slice(0, 6)}
                </span>
              )}

              {/* Kaldır */}
              {(f.status === 'pending' || f.status === 'error') && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#555',
                    padding: '2px',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Yükle Butonu ── */}
      {pendingCount > 0 && (
        <div style={{ padding: '0 8px 8px' }}>
          <button
            onClick={uploadAll}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#dc262618',
              border: '1px solid #dc262660',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#dc2626',
              fontSize: '10px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 700,
              letterSpacing: '0.15em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Upload size={12} />
            {pendingCount} DOSYA YÜKLE
          </button>
        </div>
      )}
    </div>
  );
}
