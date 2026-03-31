// ============================================
// PROJECT TRUTH - Document OCR Upload
// Basit PDF/Image yükle → OCR → Graph'a ekle
// ============================================

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Loader2, CheckCircle, AlertTriangle,
  X, Eye, Brain, Zap, Users, Building, MapPin, DollarSign,
  Plane, Mail, FileSearch
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface FilterResult {
  passed: boolean;
  rejectReason?: string;
  category: string;
  confidence: number;
  wordCount: number;
  detectedKeywords: string[];
}

interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

interface UploadResult {
  success: boolean;
  documentId?: string;
  status?: string;
  filterResult?: FilterResult;
  extractedEntities?: ExtractedEntity[];
  createdNodes?: number;
  textPreview?: string;
  error?: string;
}

// ============================================
// CATEGORY ICONS & COLORS
// ============================================

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  FLIGHT_LOG: { icon: Plane, color: '#3b82f6', label: 'Uçuş Kaydı' },
  FINANCIAL: { icon: DollarSign, color: '#22c55e', label: 'Finansal Belge' },
  EMAIL: { icon: Mail, color: '#a855f7', label: 'E-posta' },
  LEGAL: { icon: FileText, color: '#f59e0b', label: 'Yasal Belge' },
  UNKNOWN: { icon: FileSearch, color: '#6b7280', label: 'Bilinmeyen' },
};

const ENTITY_ICONS: Record<string, any> = {
  PERSON: Users,
  ORGANIZATION: Building,
  LOCATION: MapPin,
  MONEY: DollarSign,
  FLIGHT: Plane,
  DATE: FileText,
  ACCOUNT: DollarSign,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function DocumentOCRUpload() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // File selection handler
  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setResult({ success: false, error: 'Sadece PDF, PNG, JPEG veya WebP dosyaları kabul edilir.' });
      setStatus('error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setResult({ success: false, error: 'File size must be less than 10MB.' });
      setStatus('error');
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setStatus('idle');
  }, []);

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Upload and process
  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', 'full'); // Full pipeline

      setStatus('processing');

      const response = await fetch('/api/ingestion/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          documentId: data.result?.documentId,
          status: data.result?.status,
          filterResult: data.result?.filterResult,
          extractedEntities: data.result?.extractedEntities,
          createdNodes: data.result?.createdNodes,
          textPreview: data.textPreview,
        });
        setStatus('completed');
      } else {
        setResult({ success: false, error: data.error });
        setStatus('error');
      }
    } catch (error) {
      setResult({ success: false, error: 'Yükleme başarısız. Lütfen tekrar deneyin.' });
      setStatus('error');
    }
  };

  // Reset
  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setStatus('idle');
  };

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      border: '1px solid #7f1d1d40',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          padding: '8px',
          backgroundColor: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Brain size={20} color="#dc2626" />
        </div>
        <div>
          <h3 style={{
            color: '#e5e5e5',
            fontWeight: 'bold',
            fontSize: '14px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: 0
          }}>Document Analysis System</h3>
          <p style={{
            color: '#999999',
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.05em',
            margin: 0
          }}>Upload PDF or image → OCR → Add to graph</p>
        </div>
      </div>

      {/* Upload Area */}
      {status === 'idle' && !selectedFile && (
        <div
          style={{
            border: dragActive ? '2px solid #dc2626' : '2px dashed #7f1d1d40',
            backgroundColor: dragActive ? '#7f1d1d20' : 'transparent',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
          onMouseEnter={(e) => {
            if (!dragActive) {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#dc2626';
              (e.currentTarget as HTMLDivElement).style.backgroundColor = '#7f1d1d10';
            }
          }}
          onMouseLeave={(e) => {
            if (!dragActive) {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#7f1d1d40';
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          <input
            id="file-input"
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <Upload size={48} color="#999999" style={{ margin: '0 auto 16px' }} />
          <p style={{
            color: '#e5e5e5',
            fontSize: '13px',
            marginBottom: '8px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 8px 0'
          }}>Drag & Drop Your File</p>
          <p style={{
            color: '#999999',
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            margin: '0 0 16px 0'
          }}>or click to select</p>
          <p style={{
            color: '#666666',
            fontSize: '9px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>PDF, PNG, JPEG, WEBP • Max 10MB</p>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && status === 'idle' && (
        <div style={{
          border: '1px solid #7f1d1d40',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={32} color="#dc2626" />
              <div>
                <p style={{
                  color: '#e5e5e5',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  margin: 0
                }}>{selectedFile.name}</p>
                <p style={{
                  color: '#999999',
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  margin: '4px 0 0 0'
                }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #7f1d1d40',
                color: '#999999',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7f1d1d20';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626';
                (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#7f1d1d40';
                (e.currentTarget as HTMLButtonElement).style.color = '#999999';
              }}
            >
              <X size={20} />
            </button>
          </div>

          <button
            onClick={handleUpload}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#dc2626',
              border: '1px solid #dc2626',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#991b1b';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626';
            }}
          >
            <Zap size={16} />
            ANALYZE & ADD TO GRAPH
          </button>
        </div>
      )}

      {/* Processing */}
      {(status === 'uploading' || status === 'processing') && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Loader2 size={48} color="#dc2626" style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{
            color: '#e5e5e5',
            fontWeight: 'bold',
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            {status === 'uploading' ? 'UPLOADING...' : 'PROCESSING OCR & ANALYSIS...'}
          </p>
          <p style={{
            color: '#999999',
            fontSize: '11px',
            marginTop: '8px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.05em'
          }}>
            This may take a few seconds
          </p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {status === 'completed' && result?.success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ gap: '16px' } as any}
          >
            {/* Success Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#1a3a1a',
              border: '1px solid #22c55e'
            }}>
              <CheckCircle size={24} color="#22c55e" />
              <div>
                <p style={{
                  color: '#22c55e',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>Document Processed</p>
                <p style={{
                  color: '#999999',
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  margin: '4px 0 0 0'
                }}>
                  Status: {result.status} • {result.createdNodes || 0} nodes created
                </p>
              </div>
            </div>

            {/* Category */}
            {result.filterResult && (
              <div style={{
                padding: '16px',
                backgroundColor: '#030303',
                border: '1px solid #7f1d1d40',
                marginTop: '16px'
              }}>
                <p style={{
                  color: '#999999',
                  fontSize: '9px',
                  marginBottom: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>Detected Category</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {(() => {
                    const config = CATEGORY_CONFIG[result.filterResult.category] || CATEGORY_CONFIG.UNKNOWN;
                    const Icon = config.icon;
                    return (
                      <>
                        <div
                          style={{
                            padding: '8px',
                            backgroundColor: `${config.color}20`,
                            border: `1px solid ${config.color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Icon size={20} color={config.color} />
                        </div>
                        <div>
                          <p style={{
                            color: '#e5e5e5',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                            margin: 0
                          }}>{config.label}</p>
                          <p style={{
                            color: '#999999',
                            fontSize: '11px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                            margin: '4px 0 0 0'
                          }}>
                            Confidence: {Math.round(result.filterResult.confidence * 100)}%
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Keywords */}
                {result.filterResult.detectedKeywords?.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {result.filterResult.detectedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#7f1d1d40',
                          color: '#dc2626',
                          fontSize: '9px',
                          border: '1px solid #7f1d1d',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extracted Entities */}
            {result.extractedEntities && result.extractedEntities.length > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#030303',
                border: '1px solid #7f1d1d40',
                marginTop: '16px'
              }}>
                <p style={{
                  color: '#999999',
                  fontSize: '9px',
                  marginBottom: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  Detected Entities ({result.extractedEntities.length})
                </p>
                <div style={{ maxHeight: '192px', overflowY: 'auto', gap: '8px' }}>
                  {result.extractedEntities.slice(0, 10).map((entity, i) => {
                    const Icon = ENTITY_ICONS[entity.type] || FileText;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px',
                          backgroundColor: '#000000',
                          border: '1px solid #7f1d1d40',
                          marginBottom: '8px'
                        }}
                      >
                        <Icon size={14} color="#999999" />
                        <span style={{ color: '#e5e5e5', fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', flex: 1 }}>{entity.value}</span>
                        <span style={{
                          color: '#999999',
                          fontSize: '9px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {entity.type}
                        </span>
                      </div>
                    );
                  })}
                  {result.extractedEntities.length > 10 && (
                    <p style={{
                      color: '#999999',
                      fontSize: '11px',
                      textAlign: 'center',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                      margin: '8px 0 0 0'
                    }}>
                      +{result.extractedEntities.length - 10} MORE
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Text Preview */}
            {result.textPreview && (
              <div style={{
                padding: '16px',
                backgroundColor: '#030303',
                border: '1px solid #7f1d1d40',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Eye size={14} color="#999999" />
                  <p style={{
                    color: '#999999',
                    fontSize: '9px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    margin: 0
                  }}>Text Preview</p>
                </div>
                <p style={{
                  color: '#e5e5e5',
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '128px',
                  overflowY: 'auto',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {result.textPreview.substring(0, 500)}
                  {result.textPreview.length > 500 && '...'}
                </p>
              </div>
            )}

            {/* New Upload Button */}
            <button
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #7f1d1d40',
                backgroundColor: 'transparent',
                color: '#999999',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: '16px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626';
                (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7f1d1d10';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#7f1d1d40';
                (e.currentTarget as HTMLButtonElement).style.color = '#999999';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              Upload New Document
            </button>
          </motion.div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '16px',
              backgroundColor: '#7f1d1d40',
              border: '1px solid #dc2626',
              marginTop: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AlertTriangle size={24} color="#dc2626" />
              <div>
                <p style={{
                  color: '#dc2626',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>Error</p>
                <p style={{
                  color: '#999999',
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  margin: '4px 0 0 0'
                }}>{result?.error}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#7f1d1d20',
                border: '1px solid #dc2626',
                color: '#dc2626',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626';
                (e.currentTarget as HTMLButtonElement).style.color = '#000000';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7f1d1d20';
                (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
              }}
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
