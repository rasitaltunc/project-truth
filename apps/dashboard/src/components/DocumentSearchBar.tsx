'use client';

import { useState, useCallback, useMemo } from 'react';
import { Search, Loader2, HelpCircle } from 'lucide-react';

interface DocumentSearchBarProps {
  onSearch: (query: string, providers: string[]) => void;
  isSearching: boolean;
  activeProviders: string[];
}

interface Provider {
  id: string;
  label: string;
  color: string;
  available: boolean;
  tooltip: string;
}

export default function DocumentSearchBar({
  onSearch,
  isSearching,
  activeProviders,
}: DocumentSearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>(activeProviders.length > 0 ? activeProviders : ['icij', 'opensanctions', 'courtlistener']);
  const [showProviderTooltip, setShowProviderTooltip] = useState<string | null>(null);

  // Provider configuration
  const providers: Provider[] = useMemo(
    () => [
      {
        id: 'icij',
        label: 'ICIJ',
        color: '#3b82f6',
        available: true,
        tooltip: 'International Consortium of Investigative Journalists - Belge ve araştırma arşivi',
      },
      {
        id: 'opensanctions',
        label: 'OpenSanctions',
        color: '#8b5cf6',
        available: true,
        tooltip: 'Açık yaptırım ve ayniyat listeleri - Kişi ve kuruluş tanımlaması',
      },
      {
        id: 'courtlistener',
        label: 'CourtListener',
        color: '#f59e0b',
        available: true,
        tooltip: 'ABD mahkeme belgeleri ve karar arşivi - Yasal dökümanlar',
      },
      {
        id: 'teyit',
        label: 'Teyit.org',
        color: '#22c55e',
        available: false,
        tooltip: 'Yakında kullanılabilir',
      },
    ],
    []
  );

  // Handle search submission
  const handleSearch = useCallback(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isSearching) return;

    onSearch(trimmedQuery, selectedProviders);
  }, [query, selectedProviders, isSearching, onSearch]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isSearching) {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch, isSearching]
  );

  // Toggle provider selection
  const toggleProvider = useCallback((providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider?.available) return;

    setSelectedProviders((prev) => {
      if (prev.includes(providerId)) {
        return prev.filter((id) => id !== providerId);
      } else {
        return [...prev, providerId];
      }
    });
  }, [providers]);

  const selectedCount = selectedProviders.length;
  const availableProviders = providers.filter((p) => p.available);

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      {/* Search input section */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            style={{
              position: 'absolute',
              left: '12px',
              width: '16px',
              height: '16px',
              color: '#666',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Belge, kişi, kuruluş ara..."
            disabled={isSearching}
            style={{
              width: '100%',
              background: '#111',
              border: '1px solid #1a1a1a',
              borderRadius: '4px',
              padding: '10px 12px 10px 36px',
              color: '#e5e5e5',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              outline: 'none',
              transition: 'all 0.2s',
              cursor: isSearching ? 'wait' : 'text',
              opacity: isSearching ? 0.6 : 1,
            }}
            onFocus={(e) => {
              (e.target as HTMLElement).style.borderColor = '#dc2626';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.1)';
            }}
            onBlur={(e) => {
              (e.target as HTMLElement).style.borderColor = '#1a1a1a';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          style={{
            padding: '10px 20px',
            background: isSearching || !query.trim() ? '#1a1a1a' : '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: isSearching || !query.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            opacity: isSearching || !query.trim() ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSearching && query.trim()) {
              (e.target as HTMLElement).style.background = '#b91c1c';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSearching && query.trim()) {
              (e.target as HTMLElement).style.background = '#dc2626';
            }
          }}
        >
          {isSearching ? (
            <>
              <Loader2
                style={{
                  width: '14px',
                  height: '14px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              ARANILIYOR
            </>
          ) : (
            'ARA'
          )}
        </button>
      </div>

      {/* Provider selection */}
      <div>
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '11px',
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          KAYNAKLAR ({selectedCount}/{availableProviders.length} SEÇILDI)
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {providers.map((provider) => {
            const isSelected = selectedProviders.includes(provider.id);

            return (
              <div
                key={provider.id}
                style={{
                  position: 'relative',
                }}
                onMouseEnter={() => !provider.available && setShowProviderTooltip(provider.id)}
                onMouseLeave={() => setShowProviderTooltip(null)}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: isSelected ? provider.color + '15' : '#111',
                    border: `1px solid ${isSelected ? provider.color : '#1a1a1a'}`,
                    borderRadius: '4px',
                    cursor: provider.available ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    opacity: provider.available ? 1 : 0.5,
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (provider.available) {
                      (e.currentTarget as HTMLElement).style.borderColor = provider.color;
                      (e.currentTarget as HTMLElement).style.background = provider.color + '20';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (provider.available) {
                      (e.currentTarget as HTMLElement).style.borderColor = isSelected ? provider.color : '#1a1a1a';
                      (e.currentTarget as HTMLElement).style.background = isSelected ? provider.color + '15' : '#111';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProvider(provider.id)}
                    disabled={!provider.available}
                    style={{
                      width: '14px',
                      height: '14px',
                      cursor: provider.available ? 'pointer' : 'not-allowed',
                      accentColor: provider.color,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {/* Color dot */}
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: provider.color,
                        opacity: provider.available ? 1 : 0.3,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontSize: '12px',
                        fontWeight: isSelected ? '600' : '500',
                        color: isSelected ? provider.color : '#e5e5e5',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {provider.label}
                    </span>
                    {!provider.available && (
                      <HelpCircle
                        style={{
                          width: '12px',
                          height: '12px',
                          color: '#666',
                        }}
                      />
                    )}
                  </div>
                </label>

                {/* Provider tooltip */}
                {showProviderTooltip === provider.id && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#1a1a1a',
                      border: `1px solid ${provider.color}`,
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '11px',
                      color: '#e5e5e5',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      marginBottom: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    {provider.tooltip}
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        width: '6px',
                        height: '6px',
                        background: '#1a1a1a',
                        border: `1px solid ${provider.color}`,
                        borderTop: 'none',
                        borderLeft: 'none',
                        transform: 'translateX(-50%) rotate(45deg)',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info text */}
      <div
        style={{
          marginTop: '14px',
          fontSize: '11px',
          color: '#666',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          lineHeight: '1.5',
        }}
      >
        Seçili kaynaklarda belge ara. Belgeler otomatik olarak analiz edilir.
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
