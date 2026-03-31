'use client';

import { motion } from 'framer-motion';
import { User, ShieldAlert, Crosshair, MapPin, Building2, Globe } from 'lucide-react';
import { FinancialAccount, FinancialTransaction } from '@/lib/followTheMoney';

interface TargetGridProps {
    accounts: FinancialAccount[];
    transactions: FinancialTransaction[];
    loading: boolean;
}

// Helper to generate a fake "Target" from account data for visual flair
const mapAccountToTarget = (acc: FinancialAccount, idx: number) => {
    const isSuspicious = acc.is_offshore || acc.is_shell_company;
    const riskScore = isSuspicious ? 85 + (idx % 15) : 10 + (idx % 40);

    return {
        id: acc.id,
        name: acc.account_name || acc.bank_name || 'Unknown Entity',
        type: acc.is_shell_company ? 'SHELL CORP' : 'INDIVIDUAL',
        location: acc.country || 'Unknown',
        risk: riskScore,
        status: isSuspicious ? 'ACTIVE THREAT' : 'MONITORING',
        // Fallback images based on index to simulate "Photos"
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.id}`, // Using DiceBear for "Photos" illusion
        isFlagged: isSuspicious
    };
};

export function TargetGrid({ accounts, loading }: TargetGridProps) {
    if (loading) {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px',
                padding: '16px',
            }}>
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            height: '160px',
                            backgroundColor: 'rgba(10, 10, 10, 0.3)',
                            borderRadius: 0,
                            animation: 'pulse 2s infinite',
                            border: '1px solid rgba(220, 38, 38, 0.1)',
                        }}
                    />
                ))}
            </div>
        );
    }

    const targets = accounts.slice(0, 12).map(mapAccountToTarget);
    // If no targets, show mock data for the visual "Atlas" feel
    const displayTargets = targets.length > 0 ? targets : MOCK_TARGETS;

    return (
        <div style={{ padding: '16px', overflowY: 'auto', maxHeight: '100%' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                gap: '16px',
            }}>
                <h3 style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    letterSpacing: '0.1em',
                }}>
                    <Crosshair size={16} />
                    HIGH VALUE TARGETS
                </h3>
                <span style={{
                    fontSize: '9px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#6b7280',
                    backgroundColor: 'rgba(10, 10, 10, 0.8)',
                    padding: '4px 8px',
                    borderRadius: 0,
                    border: '1px solid rgba(127, 29, 29, 0.3)',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                }}>
                    LIVE TRACKING: {displayTargets.length} ENTITIES
                </span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px',
                paddingBottom: '80px',
            }}>
                {displayTargets.map((target, idx) => (
                    <motion.div
                        key={target.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                            border: target.isFlagged ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(127, 29, 29, 0.3)',
                            borderRadius: 0,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = target.isFlagged ? 'rgba(220, 38, 38, 0.6)' : 'rgba(127, 29, 29, 0.6)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = target.isFlagged ? 'rgba(220, 38, 38, 0.3)' : 'rgba(127, 29, 29, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                        }}
                    >
                        {/* "Photo" Area */}
                        <div style={{
                            aspectRatio: '1 / 1',
                            width: '100%',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: 'rgba(10, 10, 10, 0.5)',
                        }}>
                            {/* Scanline overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: 0.1,
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 3px)',
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                height: '32px',
                                backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent)',
                                zIndex: 10,
                            }} />

                            {/* Avatar Image */}
                            <img
                                src={target.avatarUrl}
                                alt={target.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: 0.8,
                                    transition: 'all 0.3s ease',
                                    filter: 'grayscale(100%)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.filter = 'grayscale(0%)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.8';
                                    e.currentTarget.style.filter = 'grayscale(100%)';
                                }}
                            />

                            {/* Risk Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                zIndex: 20,
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 0,
                                    border: '2px solid ' + (target.risk > 80 ? '#dc2626' : '#3b82f6'),
                                    fontWeight: 'bold',
                                    fontSize: '10px',
                                    backdropFilter: 'blur(8px)',
                                    backgroundColor: target.risk > 80 ? 'rgba(127, 29, 29, 0.8)' : 'rgba(25, 48, 137, 0.8)',
                                    color: target.risk > 80 ? '#dc2626' : '#3b82f6',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    boxShadow: target.risk > 80 ? '0 0 10px rgba(220, 38, 38, 0.5)' : 'none',
                                }}>
                                    {target.risk}
                                </div>
                            </div>

                            {/* Status Overlay */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '12px',
                                backgroundImage: 'linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0.8) 60%, transparent 100%)',
                                zIndex: 20,
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '4px',
                                }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        animation: 'pulse 2s infinite',
                                        backgroundColor: target.isFlagged ? '#dc2626' : '#22c55e',
                                    }} />
                                    <span style={{
                                        fontSize: '8px',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        color: '#e5e5e5',
                                        letterSpacing: '0.15em',
                                        fontWeight: 'bold',
                                    }}>
                                        {target.status}
                                    </span>
                                </div>
                                <h4 style={{
                                    color: '#ffffff',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    lineHeight: 1.2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    margin: 0,
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    letterSpacing: '0.05em',
                                }}>
                                    {target.name}
                                </h4>
                            </div>
                        </div>

                        {/* Details Footer */}
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            borderTop: '1px solid rgba(127, 29, 29, 0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '9px',
                                color: '#6b7280',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            }}>
                                <Globe size={10} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.location}</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '9px',
                                color: '#6b7280',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            }}>
                                <Building2 size={10} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.type}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// Fallback Mock Data if API returns nothing
const MOCK_TARGETS = [
    { id: 'm1', name: 'Viktor Volkov', type: 'ARMS DEALER', location: 'Moscow, RU', risk: 95, status: 'RED NOTICE', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Viktor', isFlagged: true },
    { id: 'm2', name: 'Pacific Trust Holdings', type: 'SHELL CORP', location: 'Panama City', risk: 88, status: 'MONEY LAUNDERING', avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Pacific', isFlagged: true },
    { id: 'm3', name: 'Elena  S.', type: 'COURIER', location: 'Zurich, CH', risk: 45, status: 'ACTIVE', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena', isFlagged: false },
    { id: 'm4', name: 'CryptoNexus LLC', type: 'EXCHANGE', location: 'Cayman Islands', risk: 92, status: 'UNREGULATED', avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Nexus', isFlagged: true },
    { id: 'm5', name: 'John Doe', type: 'UNKOWN', location: 'New York, US', risk: 12, status: 'LOW LEVEL', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', isFlagged: false },
    { id: 'm6', name: 'Golden Parachute Ltd', type: 'INVESTMENT', location: 'London, UK', risk: 65, status: 'INVESTIGATING', avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Golden', isFlagged: false },
];
