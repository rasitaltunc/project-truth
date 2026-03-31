'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import DailyQuestionBanner from '@/components/DailyQuestionBanner';
import GapAnalysisPanel from '@/components/GapAnalysisPanel';

interface ChatPanelProps {
  nodes: any[];
  links: any[];
  onNodeHighlight?: (nodeId: string) => void;
  footer?: React.ReactNode;
  networkId?: string; // Sprint 5: Gap analysis + daily question için
}

export default function ChatPanel({ nodes, links, onNodeHighlight, footer, networkId }: ChatPanelProps) {
  const {
    messages,
    isLoading,
    error,
    isChatOpen,
    toggleChat,
    closeChat,
    sendMessage,
    clearChat,
    clearHighlights,
    setHighlights,
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput('');
    await sendMessage(q, nodes, links);
  }, [input, isLoading, sendMessage, nodes, links]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // When user clicks a node name in AI response
  const handleNodeRefClick = (nodeId: string) => {
    setHighlights([nodeId], [], nodeId);
    if (onNodeHighlight) onNodeHighlight(nodeId);
  };

  // Click on a follow-up suggestion
  const handleFollowUp = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  // Quick suggestions for empty chat
  const suggestions = [
    'Bu ağdaki en önemli kişiler kimler?',
    'Epstein ile Maxwell arasındaki bağlantı nedir?',
    'Hangi kurumlar bu ağda yer alıyor?',
    'Kurbanlar kimler ve hikayeleri ne?',
  ];

  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#7f1d1d',
          border: '2px solid #dc2626',
          color: '#fecaca',
          cursor: 'pointer',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 20px rgba(220,38,38,0.3)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.boxShadow = '0 0 30px rgba(220,38,38,0.5)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(220,38,38,0.3)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="SORGULA — AI ile ağı keşfet"
      >
        <MessageSquare size={22} />
      </button>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(220,38,38,0.3); }
          50% { border-color: rgba(220,38,38,0.6); }
        }
        .chat-scrollbar::-webkit-scrollbar { width: 4px; }
        .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: #7f1d1d40; border-radius: 2px; }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '380px',
        zIndex: 80,
        backgroundColor: 'rgba(5, 5, 5, 0.95)',
        borderRight: '1px solid #dc262640',
        backdropFilter: 'blur(16px)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInLeft 0.4s ease-out',
      }}>

        {/* HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #7f1d1d40',
          background: 'linear-gradient(180deg, #1a050580, transparent)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={16} style={{ color: '#dc2626' }} />
              <span style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.2em', fontWeight: 700 }}>
                SORGULA
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {messages.length > 0 && (
                <button
                  onClick={() => { clearChat(); clearHighlights(); }}
                  style={{ background: 'none', border: 'none', color: '#6b728060', cursor: 'pointer', padding: '4px' }}
                  title="Sohbeti temizle"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => { closeChat(); }}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: '#6b728060', letterSpacing: '0.1em', marginTop: '6px' }}>
            AI ile ağı sorgula • Node isimlerine tıkla → 3D&apos;de göster
          </div>
        </div>

        {/* MESSAGES */}
        <div
          className="chat-scrollbar"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Empty state — suggestions */}
          {messages.length === 0 && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
              {/* Sprint 5: Günün Sorusu */}
              <DailyQuestionBanner
                networkId={networkId}
                onAsk={(question) => {
                  setInput(question);
                  setTimeout(() => {
                    sendMessage(question, nodes, links);
                    setInput('');
                  }, 50);
                }}
              />

              <div style={{
                fontSize: '12px', color: '#6b728080', marginBottom: '16px',
                lineHeight: 1.6, padding: '12px', backgroundColor: '#0f0f0f',
                border: '1px solid #7f1d1d20',
              }}>
                Ağ hakkında her şeyi sorabilirsiniz. Kişiler, kurumlar, bağlantılar, kanıtlar...
                AI cevap verirken 3D sahne otomatik olarak ilgili düğümleri vurgular.
              </div>
              <div style={{ fontSize: '9px', color: '#991b1b', letterSpacing: '0.15em', marginBottom: '8px' }}>
                HIZLI SORULAR
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); setTimeout(handleSend, 100); }}

                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #7f1d1d20',
                    color: '#e5e5e580',
                    cursor: 'pointer',
                    fontSize: '11px',
                    lineHeight: 1.4,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#dc262660';
                    e.currentTarget.style.color = '#e5e5e5';
                    e.currentTarget.style.backgroundColor = '#1a0808';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(127,29,29,0.12)';
                    e.currentTarget.style.color = 'rgba(229,229,229,0.5)';
                    e.currentTarget.style.backgroundColor = '#0a0a0a';
                  }}
                >
                  {s}
                </button>
              ))}

              {/* Sprint 5: Gap Analysis Panel */}
              <GapAnalysisPanel
                networkId={networkId}
                onSuggestionClick={(suggestion) => {
                  sendMessage(suggestion, nodes, links);
                }}
              />
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onNodeClick={handleNodeRefClick}
              onFollowUp={handleFollowUp}
            />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px', animation: 'fadeIn 0.3s ease',
            }}>
              <Loader2 size={14} style={{ color: '#dc2626', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '11px', color: '#dc262680' }}>Ağ analiz ediliyor...</span>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px', backgroundColor: '#1a0808',
              border: '1px solid #dc262640', fontSize: '11px', color: '#fca5a5',
            }}>
              Hata: {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #7f1d1d40',
          backgroundColor: '#0a0a0a',
        }}>
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ağı sorgula..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                backgroundColor: '#111111',
                border: '1px solid #7f1d1d30',
                color: '#e5e5e5',
                fontSize: '12px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#dc262660'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(127,29,29,0.19)'; }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '10px',
                backgroundColor: input.trim() ? '#7f1d1d' : '#1a1a1a',
                border: '1px solid',
                borderColor: input.trim() ? '#dc2626' : '#333',
                color: input.trim() ? '#fecaca' : '#555',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Send size={16} />
            </button>
          </div>

        </div>

        {/* INVESTIGATION BANNER — footer slot */}
        {footer && (
          <div style={{ padding: '8px 16px 12px' }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================
function MessageBubble({
  message,
  onNodeClick,
  onFollowUp,
}: {
  message: ChatMessage;
  onNodeClick: (nodeId: string) => void;
  onFollowUp: (q: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      animation: 'fadeIn 0.3s ease',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '95%',
    }}>
      {/* Message content */}
      <div style={{
        padding: '10px 14px',
        backgroundColor: isUser ? '#7f1d1d20' : '#0f0f0f',
        border: `1px solid ${isUser ? '#dc262630' : '#7f1d1d20'}`,
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
      }}>
        {isUser ? (
          <div style={{ fontSize: '12px', color: '#fca5a5', lineHeight: 1.5 }}>
            {message.content}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#d4d4d4', lineHeight: 1.6 }}>
            {renderNarrative(message.content, message.nodeNames || {}, onNodeClick)}
          </div>
        )}
      </div>

      {/* Highlighted nodes as chips (AI messages only) */}
      {!isUser && message.highlightNodeIds && message.highlightNodeIds.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px',
          marginTop: '6px', paddingLeft: '4px',
        }}>
          {message.highlightNodeIds.map(id => {
            const name = message.nodeNames?.[id] || id.substring(0, 8);
            return (
              <button
                key={id}
                onClick={() => onNodeClick(id)}
                style={{
                  padding: '3px 8px',
                  fontSize: '9px',
                  backgroundColor: '#7f1d1d15',
                  border: '1px solid #dc262630',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#7f1d1d40';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(127,29,29,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(220,38,38,0.19)';
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* Follow-up suggestion */}
      {!isUser && message.followUp && (
        <button
          onClick={() => onFollowUp(message.followUp!)}
          style={{
            display: 'block',
            marginTop: '8px',
            padding: '6px 10px',
            fontSize: '10px',
            backgroundColor: 'transparent',
            border: '1px dashed #dc262630',
            color: '#dc262680',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            lineHeight: 1.4,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#dc262660';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.19)';
            e.currentTarget.style.color = 'rgba(220,38,38,0.5)';
          }}
        >
          💡 {message.followUp}
        </button>
      )}
    </div>
  );
}

// ============================================
// NARRATIVE RENDERER
// Replaces node names in text with clickable spans
// ============================================
function renderNarrative(
  text: string,
  nodeNames: Record<string, string>,
  onNodeClick: (nodeId: string) => void
): React.ReactNode {
  if (!text || Object.keys(nodeNames).length === 0) {
    return text;
  }

  // Build regex from node names
  const names = Object.entries(nodeNames)
    .sort((a, b) => b[1].length - a[1].length); // longest first

  let result: (string | React.ReactElement)[] = [text];
  let keyCounter = 0;

  for (const [nodeId, name] of names) {
    const newResult: (string | React.ReactElement)[] = [];
    for (const part of result) {
      if (typeof part !== 'string') {
        newResult.push(part);
        continue;
      }
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const splits = part.split(regex);
      for (let i = 0; i < splits.length; i++) {
        if (splits[i].toLowerCase() === name.toLowerCase()) {
          keyCounter++;
          newResult.push(
            <span
              key={`node-link-${nodeId}-${keyCounter}`}
              onClick={() => onNodeClick(nodeId)}
              style={{
                color: '#fca5a5',
                cursor: 'pointer',
                borderBottom: '1px dashed #dc262660',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => { (e.target as HTMLElement).style.color = '#dc2626'; }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.color = '#fca5a5'; }}
            >
              {splits[i]}
            </span>
          );
        } else if (splits[i]) {
          newResult.push(splits[i]);
        }
      }
    }
    result = newResult;
  }

  return <>{result}</>;
}
