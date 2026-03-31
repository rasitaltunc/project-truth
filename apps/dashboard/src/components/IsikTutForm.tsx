'use client';

import { useState } from 'react';
import { Lightbulb, Send, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface IsikTutFormProps {
  nodes: Array<{ id: string; label: string; type?: string }>;
  preSelectedNodeId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const EVIDENCE_TYPES = [
  { value: 'document', label: 'Belge', icon: '📄' },
  { value: 'legal', label: 'Hukuki', icon: '⚖️' },
  { value: 'media', label: 'Medya', icon: '📰' },
  { value: 'testimony', label: 'İfade', icon: '🗣️' },
  { value: 'news', label: 'Haber', icon: '📡' },
  { value: 'photo', label: 'Fotoğraf', icon: '📸' },
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'financial', label: 'Finansal', icon: '💰' },
];

export default function IsikTutForm({ nodes, preSelectedNodeId, onClose, onSuccess }: IsikTutFormProps) {
  const [nodeId, setNodeId] = useState(preSelectedNodeId || '');
  const [evidenceType, setEvidenceType] = useState('document');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceDate, setSourceDate] = useState('');
  const [language, setLanguage] = useState('tr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId || !title.trim()) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/community/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          evidence_type: evidenceType,
          title: title.trim(),
          description: description.trim(),
          source_url: sourceUrl.trim() || null,
          source_name: sourceName.trim() || null,
          source_date: sourceDate || null,
          language,
          status: 'pending',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      setResult({ success: true, message: 'Kanıt başarıyla gönderildi! Gazeteciler tarafından incelenecek.' });
      // Clear form
      setTitle('');
      setDescription('');
      setSourceUrl('');
      setSourceName('');
      setSourceDate('');

      if (onSuccess) setTimeout(onSuccess, 1500);

    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Gönderim başarısız',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort nodes: persons first, then by name
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type === 'person' && b.type !== 'person') return -1;
    if (a.type !== 'person' && b.type === 'person') return 1;
    return (a.label || '').localeCompare(b.label || '');
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
      />
      <div style={{
        position: 'relative', width: '100%', maxWidth: '600px',
        maxHeight: '85vh', overflow: 'auto',
        backgroundColor: '#0a0a0a',
        border: '1px solid #fbbf2460',
        borderTop: '3px solid #fbbf24',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #fbbf2420',
          background: 'linear-gradient(180deg, #1a150580, transparent)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lightbulb size={18} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '11px', color: '#fbbf24', letterSpacing: '0.2em', fontWeight: 700 }}>
              IŞIK TUT
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info banner */}
        <div style={{
          margin: '16px 24px 0', padding: '10px 14px',
          backgroundColor: '#fbbf2408', border: '1px solid #fbbf2415',
          fontSize: '11px', color: '#fbbf2490', lineHeight: 1.5,
        }}>
          Gönderdiğiniz kanıt topluluk katmanına eklenir. Gazeteciler ve doğrulama ekipleri inceledikten sonra ana ağa yükseltilir.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>

          {/* Node selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
              DÜĞÜM *
            </label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              required
              style={{
                width: '100%', padding: '8px 12px',
                backgroundColor: '#111', border: '1px solid #333',
                color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
              }}
            >
              <option value="">Düğüm seçin...</option>
              {sortedNodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label} ({(n.type || 'person').toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Evidence type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
              EVIDENCE TYPE
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EVIDENCE_TYPES.map(et => (
                <button
                  key={et.value}
                  type="button"
                  onClick={() => setEvidenceType(et.value)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: evidenceType === et.value ? '#fbbf2420' : '#111',
                    border: `1px solid ${evidenceType === et.value ? '#fbbf2460' : '#333'}`,
                    color: evidenceType === et.value ? '#fbbf24' : '#888',
                    fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                >
                  {et.icon} {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
              BAŞLIK *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Kanıtın kısa başlığı"
              style={{
                width: '100%', padding: '8px 12px',
                backgroundColor: '#111', border: '1px solid #333',
                color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
              AÇIKLAMA
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detaylı açıklama..."
              style={{
                width: '100%', padding: '8px 12px',
                backgroundColor: '#111', border: '1px solid #333',
                color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Source URL + Name */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
                KAYNAK URL
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%', padding: '8px 12px',
                  backgroundColor: '#111', border: '1px solid #333',
                  color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
                KAYNAK ADI
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="New York Times, vb."
                style={{
                  width: '100%', padding: '8px 12px',
                  backgroundColor: '#111', border: '1px solid #333',
                  color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Date + Language */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
                TARİH
              </label>
              <input
                type="date"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  backgroundColor: '#111', border: '1px solid #333',
                  color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '9px', color: '#fbbf24', letterSpacing: '0.15em', marginBottom: '6px' }}>
                DİL
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  backgroundColor: '#111', border: '1px solid #333',
                  color: '#e5e5e5', fontSize: '12px', fontFamily: 'inherit',
                }}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          {/* Result message */}
          {result && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', marginBottom: '16px',
              backgroundColor: result.success ? '#16a34a10' : '#dc262610',
              border: `1px solid ${result.success ? '#16a34a40' : '#dc262640'}`,
              fontSize: '11px',
              color: result.success ? '#86efac' : '#fca5a5',
            }}>
              {result.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {result.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !nodeId || !title.trim()}
            style={{
              width: '100%', padding: '12px',
              backgroundColor: (!nodeId || !title.trim()) ? '#1a1a1a' : '#92400e',
              border: `1px solid ${(!nodeId || !title.trim()) ? '#333' : '#fbbf24'}`,
              color: (!nodeId || !title.trim()) ? '#555' : '#fef3c7',
              cursor: (!nodeId || !title.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '12px', fontFamily: 'inherit', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                SUBMITTING...
              </>
            ) : (
              <>
                <Send size={16} />
                SUBMIT EVIDENCE
              </>
            )}
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
}
