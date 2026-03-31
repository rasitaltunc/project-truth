// ============================================
// CONNECTION TIMELINE PANEL
// İki entity arasındaki ilişkinin kronolojik hikayesi
// ============================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    X, Calendar, MapPin, FileText, Users, AlertTriangle,
    Clock, ArrowRight, Link2, ChevronDown, ChevronUp,
    Eye, DollarSign, Plane, Building, Phone, Mail
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'meeting' | 'transaction' | 'travel' | 'communication' | 'document' | 'witness' | 'media' | 'legal' | 'other';
    location?: string;
    source?: string;
    sourceUrl?: string;
    confidence: number; // 0-100
    verified: boolean;
    evidenceIds?: string[];
}

export interface ConnectionData {
    sourceNode: {
        id: string;
        label: string;
        img?: string;
        type?: string;
        role?: string;
    };
    targetNode: {
        id: string;
        label: string;
        img?: string;
        type?: string;
        role?: string;
    };
    linkType: string;
    strength: number;
    firstContact?: string;
    lastContact?: string;
    events: TimelineEvent[];
}

interface Props {
    connection: ConnectionData;
    onClose: () => void;
}

// ============================================
// EVENT TYPE CONFIG
// ============================================

const EVENT_TYPES: Record<string, { icon: any; color: string; label: string }> = {
    meeting: { icon: Users, color: '#dc2626', label: 'Meeting' },
    transaction: { icon: DollarSign, color: '#22c55e', label: 'Transaction' },
    travel: { icon: Plane, color: '#3b82f6', label: 'Travel' },
    communication: { icon: Phone, color: '#a855f7', label: 'Communication' },
    document: { icon: FileText, color: '#f59e0b', label: 'Document' },
    witness: { icon: Eye, color: '#ec4899', label: 'Testimony' },
    media: { icon: FileText, color: '#06b6d4', label: 'Media' },
    legal: { icon: Building, color: '#ef4444', label: 'Legal' },
    other: { icon: Link2, color: '#6b7280', label: 'Other' },
};

// ============================================
// COMPONENT
// ============================================

export function ConnectionTimelinePanel({ connection, onClose }: Props) {
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Filter & Sort Events
    const filteredEvents = useMemo(() => {
        let events = [...connection.events];

        if (filterType) {
            events = events.filter(e => e.type === filterType);
        }

        events.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return events;
    }, [connection.events, filterType, sortOrder]);

    // Event counts by type
    const eventCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        connection.events.forEach(e => {
            counts[e.type] = (counts[e.type] || 0) + 1;
        });
        return counts;
    }, [connection.events]);

    // Date range
    const dateRange = useMemo(() => {
        if (connection.events.length === 0) return null;
        const dates = connection.events.map(e => new Date(e.date).getTime());
        const min = new Date(Math.min(...dates));
        const max = new Date(Math.max(...dates));
        return {
            start: min.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }),
            end: max.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }),
            span: Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' yıl'
        };
    }, [connection.events]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: 'rgba(0,0,0,0.97)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.3s ease'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .timeline-event:hover {
                    background-color: rgba(220, 38, 38, 0.1) !important;
                }
                .filter-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                }
            `}</style>

            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1100px',
                maxHeight: '90vh',
                backgroundColor: '#0a0a0a',
                border: '2px solid #7f1d1d',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* HEADER */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid #7f1d1d40',
                    background: 'linear-gradient(180deg, #1a0505 0%, #0a0a0a 100%)'
                }}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={24} />
                    </button>

                    {/* Entity Cards */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2rem'
                    }}>
                        {/* Source Entity */}
                        <EntityCard entity={connection.sourceNode} />

                        {/* Connection Info */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <div style={{
                                    width: '60px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent, #dc2626)'
                                }} />
                                <Link2 size={24} style={{ color: '#dc2626' }} />
                                <div style={{
                                    width: '60px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, #dc2626, transparent)'
                                }} />
                            </div>
                            <span style={{
                                fontSize: '11px',
                                color: '#fca5a5',
                                fontFamily: 'monospace',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                {connection.linkType || 'BAĞLANTI'}
                            </span>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                color: '#991b1b'
                            }}>
                                <div style={{
                                    width: `${connection.strength}%`,
                                    maxWidth: '100px',
                                    height: '3px',
                                    backgroundColor: '#dc2626',
                                    borderRadius: '2px'
                                }} />
                                <span>{connection.strength}%</span>
                            </div>
                        </div>

                        {/* Target Entity */}
                        <EntityCard entity={connection.targetNode} />
                    </div>

                    {/* Summary Stats */}
                    {dateRange && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '2rem',
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #7f1d1d20'
                        }}>
                            <StatBadge icon={Calendar} label="İlk Temas" value={dateRange.start} />
                            <StatBadge icon={Clock} label="Son Temas" value={dateRange.end} />
                            <StatBadge icon={ArrowRight} label="Süre" value={dateRange.span} />
                            <StatBadge icon={FileText} label="Olay Sayısı" value={connection.events.length.toString()} />
                        </div>
                    )}
                </div>

                {/* FILTERS */}
                <div style={{
                    padding: '1rem 2rem',
                    borderBottom: '1px solid #7f1d1d20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    {/* Type Filters */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            className="filter-btn"
                            onClick={() => setFilterType(null)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                backgroundColor: !filterType ? '#dc262640' : 'transparent',
                                border: '1px solid #dc262640',
                                borderRadius: '4px',
                                color: !filterType ? '#fca5a5' : '#991b1b',
                                cursor: 'pointer'
                            }}
                        >
                            TÜMÜ ({connection.events.length})
                        </button>
                        {Object.entries(eventCounts).map(([type, count]) => {
                            const config = EVENT_TYPES[type] || EVENT_TYPES.other;
                            const Icon = config.icon;
                            return (
                                <button
                                    key={type}
                                    className="filter-btn"
                                    onClick={() => setFilterType(filterType === type ? null : type)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '11px',
                                        fontFamily: 'monospace',
                                        backgroundColor: filterType === type ? `${config.color}40` : 'transparent',
                                        border: `1px solid ${config.color}40`,
                                        borderRadius: '4px',
                                        color: filterType === type ? config.color : `${config.color}80`,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Icon size={12} />
                                    {config.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort */}
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            backgroundColor: 'transparent',
                            border: '1px solid #7f1d1d40',
                            borderRadius: '4px',
                            color: '#991b1b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <Clock size={12} />
                        {sortOrder === 'asc' ? 'ESKİDEN YENİYE' : 'YENİDEN ESKİYE'}
                    </button>
                </div>

                {/* TIMELINE */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '2rem'
                }}>
                    {filteredEvents.length === 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4rem',
                            color: '#991b1b'
                        }}>
                            <AlertTriangle size={48} style={{ opacity: 0.3 }} />
                            <p style={{ marginTop: '1rem', fontFamily: 'monospace' }}>
                                {filterType ? 'Bu kategoride olay bulunamadı' : 'Henüz kayıtlı olay yok'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            {/* Timeline Line */}
                            <div style={{
                                position: 'absolute',
                                left: '20px',
                                top: 0,
                                bottom: 0,
                                width: '2px',
                                background: 'linear-gradient(180deg, #dc2626 0%, #7f1d1d 100%)'
                            }} />

                            {/* Events */}
                            {filteredEvents.map((event, index) => (
                                <TimelineEventCard
                                    key={event.id}
                                    event={event}
                                    index={index}
                                    isExpanded={expandedEvent === event.id}
                                    onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// SUB COMPONENTS
// ============================================

function EntityCard({ entity }: { entity: ConnectionData['sourceNode'] }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
        }}>
            <div style={{
                width: '80px',
                height: '100px',
                backgroundColor: '#1a0505',
                border: '2px solid #dc2626',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}>
                {entity.img ? (
                    <img
                        src={entity.img}
                        alt={entity.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#dc2626'
                    }}>
                        {entity.label.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                )}
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#fecaca',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {entity.label}
                </div>
                {entity.role && (
                    <div style={{
                        fontSize: '10px',
                        color: '#991b1b',
                        fontFamily: 'monospace'
                    }}>
                        {entity.role}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <Icon size={14} style={{ color: '#991b1b' }} />
            <div>
                <div style={{ fontSize: '9px', color: '#991b1b', fontFamily: 'monospace' }}>{label}</div>
                <div style={{ fontSize: '12px', color: '#fecaca', fontWeight: 'bold' }}>{value}</div>
            </div>
        </div>
    );
}

function TimelineEventCard({
    event,
    index,
    isExpanded,
    onToggle
}: {
    event: TimelineEvent;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const config = EVENT_TYPES[event.type] || EVENT_TYPES.other;
    const Icon = config.icon;
    const date = new Date(event.date);

    return (
        <div
            className="timeline-event"
            style={{
                position: 'relative',
                marginLeft: '50px',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#0a0a0a',
                border: '1px solid #7f1d1d40',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                animation: `slideIn 0.3s ease ${index * 0.05}s both`
            }}
            onClick={onToggle}
        >
            {/* Timeline Dot */}
            <div style={{
                position: 'absolute',
                left: '-42px',
                top: '1rem',
                width: '24px',
                height: '24px',
                backgroundColor: '#0a0a0a',
                border: `2px solid ${config.color}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={12} style={{ color: config.color }} />
            </div>

            {/* Date Badge */}
            <div style={{
                position: 'absolute',
                left: '-140px',
                top: '0.8rem',
                width: '85px',
                textAlign: 'right',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#991b1b'
            }}>
                <div style={{ fontWeight: 'bold' }}>
                    {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{ opacity: 0.7 }}>{date.getFullYear()}</div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            backgroundColor: `${config.color}20`,
                            color: config.color,
                            borderRadius: '2px',
                            fontFamily: 'monospace'
                        }}>
                            {config.label.toUpperCase()}
                        </span>
                        {event.verified && (
                            <span style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                backgroundColor: '#22c55e20',
                                color: '#22c55e',
                                borderRadius: '2px',
                                fontFamily: 'monospace'
                            }}>
                                ✓ DOĞRULANMIŞ
                            </span>
                        )}
                        <span style={{
                            fontSize: '9px',
                            color: '#991b1b',
                            fontFamily: 'monospace'
                        }}>
                            %{event.confidence} GÜVENİLİRLİK
                        </span>
                    </div>
                    <h4 style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#fecaca',
                        margin: '0 0 4px 0'
                    }}>
                        {event.title}
                    </h4>
                    <p style={{
                        fontSize: '12px',
                        color: '#a8a8a8',
                        margin: 0,
                        lineHeight: 1.5,
                        display: isExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'unset' : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: isExpanded ? 'visible' : 'hidden'
                    }}>
                        {event.description}
                    </p>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                    {isExpanded ? <ChevronUp size={16} style={{ color: '#991b1b' }} /> : <ChevronDown size={16} style={{ color: '#991b1b' }} />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #7f1d1d20',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#991b1b' }}>
                            <MapPin size={12} />
                            {event.location}
                        </div>
                    )}
                    {event.source && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#991b1b' }}>
                            <FileText size={12} />
                            {event.sourceUrl ? (
                                <a
                                    href={event.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#dc2626', textDecoration: 'underline' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {event.source}
                                </a>
                            ) : (
                                event.source
                            )}
                        </div>
                    )}
                    {event.evidenceIds && event.evidenceIds.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#991b1b' }}>
                            <Link2 size={12} />
                            {event.evidenceIds.length} kanıt bağlı
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ConnectionTimelinePanel;
