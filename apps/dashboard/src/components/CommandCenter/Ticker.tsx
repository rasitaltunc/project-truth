'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface TickerItem {
    id: string;
    symbol: string;
    value: string;
    change?: string;
    isAlert?: boolean;
}

const MOCK_TICKER_DATA: TickerItem[] = [
    { id: '1', symbol: 'BTC/USD', value: '$42,156.00', change: '+2.4%', isAlert: false },
    { id: '2', symbol: 'SWISS_BANK_FLOW', value: '$1.2M', change: '+450%', isAlert: true },
    { id: '3', symbol: 'CAYMAN_SHELL_OPS', value: 'DETECTED', isAlert: true },
    { id: '4', symbol: 'XAU/USD', value: '$2,034.00', change: '-0.1%', isAlert: false },
    { id: '5', symbol: 'OFFSHORE_INDEX', value: 'HIGH', isAlert: true },
    { id: '6', symbol: 'ETH/USD', value: '$2,230.00', change: '+1.2%', isAlert: false },
    { id: '7', symbol: 'PANAMA_LEAKS', value: 'ACTIVE', isAlert: true },
];

export function LiveTicker() {
    return (
        <div style={{
            width: '100%',
            backgroundColor: '#030303',
            borderTop: '1px solid rgba(220, 38, 38, 0.2)',
            borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
            overflow: 'hidden',
            position: 'relative',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(220, 38, 38, 0.02)',
                zIndex: 0,
            }} />
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '32px',
                backgroundImage: 'linear-gradient(to right, #030303, transparent)',
                zIndex: 10,
            }} />
            <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '32px',
                backgroundImage: 'linear-gradient(to left, #030303, transparent)',
                zIndex: 10,
            }} />

            <motion.div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    whiteSpace: 'nowrap',
                    zIndex: 0,
                }}
                animate={{ x: [0, -1000] }}
                transition={{
                    repeat: Infinity,
                    duration: 30,
                    ease: "linear"
                }}
            >
                {/* Repeat list twice for seamless loop */}
                {[...MOCK_TICKER_DATA, ...MOCK_TICKER_DATA, ...MOCK_TICKER_DATA].map((item, i) => (
                    <div
                        key={`${item.id}-${i}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '10px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }}
                    >
                        {item.isAlert ? (
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#dc2626',
                                fontWeight: 'bold',
                                animation: 'pulse 2s infinite',
                                letterSpacing: '0.05em',
                            }}>
                                <AlertTriangle size={10} />
                                {item.symbol}: {item.value}
                            </span>
                        ) : (
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#6b7280',
                            }}>
                                <span style={{
                                    color: '#e5e5e5',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.05em',
                                }}>{item.symbol}</span>
                                <span>{item.value}</span>
                                <span style={{
                                    color: item.change?.startsWith('+') ? '#22c55e' : '#dc2626',
                                    fontWeight: 'bold',
                                }}>
                                    ({item.change})
                                </span>
                            </span>
                        )}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
