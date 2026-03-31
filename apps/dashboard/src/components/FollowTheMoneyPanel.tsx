'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, AlertTriangle, Building2,
  ArrowRight, ArrowLeftRight, RefreshCw, Globe,
  X, ShieldAlert, Activity, CreditCard, Wallet,
  Menu, Banknote, Home, Ship, Plane, Bitcoin
} from 'lucide-react';
import {
  FollowTheMoney,
  FinancialTransaction,
  FinancialAccount,
  Asset,
  MoneyFlow,
  TransactionType,
  AssetType
} from '@/lib/followTheMoney';

// New Components
import { LiveTicker } from './CommandCenter/Ticker';
import { TargetGrid } from './CommandCenter/TargetGrid';

// ============================================
// TYPES & CONSTANTS
// ============================================

const TRANSACTION_ICONS: Record<TransactionType, any> = {
  wire_transfer: Banknote,
  cash: DollarSign,
  check: CreditCard,
  crypto: Bitcoin,
  stock_transfer: TrendingUp,
  real_estate: Home,
  donation: DollarSign,
  loan: CreditCard,
  payment: DollarSign,
  investment: TrendingUp,
  gift: DollarSign,
  unknown: DollarSign
};

export function FollowTheMoneyPanel({
  entityId,
  entityName,
  onClose,
  isModal = false
}: {
  entityId?: string;
  entityName?: string;
  onClose?: () => void;
  isModal?: boolean;
}) {
  const [activeView, setActiveView] = useState<'targets' | 'feed' | 'assets' | 'network'>('targets');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [flows, setFlows] = useState<MoneyFlow[]>([]);

  // Load data
  useEffect(() => {
    loadData();
  }, [entityId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const financialStats = await FollowTheMoney.getFinancialStats();
      setStats(financialStats);

      if (entityId) {
        const [txs, accs, asts] = await Promise.all([
          FollowTheMoney.getEntityTransactions(entityId),
          FollowTheMoney.getEntityAccounts(entityId),
          FollowTheMoney.getEntityAssets(entityId)
        ]);
        setTransactions(txs);
        setAccounts(accs);
        setAssets(asts);

        const network = await FollowTheMoney.getFinancialNetwork(entityId, 2);
        setFlows(network.flows);
      } else {
        const suspicious = await FollowTheMoney.getSuspiciousTransactions(50);
        setTransactions(suspicious);
        // Load some global accounts for the grid if no entity selected
        // const globalAccounts = await FollowTheMoney.getEntityAccounts('global_sample'); 
        setAccounts([]); // Fallback to mock data in TargetGrid
        // Fallback if API doesn't support global accounts list without ID, 
        // normally we'd fetch "High Risk Entities". For now, we reuse suspicious tx entities if possible or just empty.
        // In a real app we'd have a specific endpoint. 
        // For this demo, let's pretend we have data or let the Grid handle empty state.
      }
    } catch (error) {
      console.error('Failed to load financial data:', error);
    }
    setLoading(false);
  };

  // Format currency
  const formatMoney = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'relative',
        backgroundColor: '#030303',
        color: '#e5e5e5',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: isModal ? '100%' : '100vh',
      }}
    >
      {/* 1. COMMAND CENTER HEADER — PROJECT TRUTH AESTHETIC */}
      <div style={{
        borderBottom: '1px solid rgba(127, 29, 29, 0.3)',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: 0,
            }}>
              <DollarSign size={18} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <h1 style={{
                margin: 0, fontSize: '14px', fontWeight: 900, letterSpacing: '0.15em',
                color: '#ffffff',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}>
                FOLLOW THE <span style={{ color: '#dc2626' }}>MONEY</span>
              </h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '9px', color: '#6b7280', letterSpacing: '0.1em', marginTop: '2px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e',
                  display: 'inline-block', animation: 'pulse 2s infinite',
                }} />
                SOVEREIGN ENGINE
                <span style={{ color: '#333' }}>|</span>
                FİNANSAL İZLEME
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={loadData}
              style={{
                background: 'none', border: '1px solid #333', padding: '6px',
                cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center',
                borderRadius: 0,
              }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: '1px solid rgba(127, 29, 29, 0.2)', padding: '6px',
                  cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center',
                  borderRadius: 0,
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Live Ticker */}
        <LiveTicker />
      </div>

      {/* 2. MAIN LAYOUT (Bento Grid for Desktop, Tabs for Mobile) */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
      }}>
        {/* SCANLINES OVERLAY */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 50,
            opacity: 0.03,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 3px)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* MOBILE NAVIGATION BAR — hidden on desktop, shown on mobile via JS */}
        <div style={{
          display: 'none',
          flexDirection: 'row',
          borderBottom: '1px solid rgba(127, 29, 29, 0.3)',
          backgroundColor: 'rgba(10, 10, 10, 0.5)',
          backdropFilter: 'blur(8px)',
          overflowX: 'auto',
        }}>
          {[
            { id: 'targets', label: 'TARGETS', icon: Globe },
            { id: 'feed', label: 'FEED', icon: Activity },
            { id: 'assets', label: 'ASSETS', icon: Wallet },
            { id: 'network', label: 'NETWORK', icon: ArrowLeftRight }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              style={{
                flex: 1,
                minWidth: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                paddingTop: '12px',
                paddingBottom: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.15em',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: activeView === tab.id ? '#dc2626' : '#6b7280',
                borderBottom: activeView === tab.id ? '2px solid #dc2626' : 'none',
                backgroundColor: activeView === tab.id ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
                border: activeView === tab.id ? '0 solid transparent' : 'none',
                borderBottomWidth: activeView === tab.id ? '2px' : '0',
                borderBottomColor: activeView === tab.id ? '#dc2626' : 'transparent',
                borderRadius: 0,
                background: activeView === tab.id ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* DESKTOP SIDEBAR / MOBILE CONTENT */}
        {/* LEFT COLUMN: TARGET GRID (The "Atlas" View) */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          backgroundColor: 'rgba(10, 10, 10, 0.3)',
          display: 'block',
          borderRight: '1px solid rgba(127, 29, 29, 0.3)',
        }}>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TargetGrid accounts={accounts} transactions={transactions} loading={loading} />
          </div>
        </div>

        {/* RIGHT COLUMN: DATA STREAMS (Transaction Feed & Stats) */}
        <div style={{
          width: '450px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
        }}>

          {/* Desktop Tabs for Right Column */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(127, 29, 29, 0.3)',
          }}>
            {[
              { id: 'feed', label: 'LIVE FEED', icon: Activity },
              { id: 'assets', label: 'ASSETS', icon: Wallet },
              { id: 'network', label: 'FLOW', icon: ArrowLeftRight }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                style={{
                  flex: 1,
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  fontSize: '10px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 'bold',
                  color: activeView === tab.id ? '#dc2626' : '#6b7280',
                  backgroundColor: activeView === tab.id ? 'rgba(10, 10, 10, 0.8)' : 'transparent',
                  cursor: 'pointer',
                  borderRadius: 0,
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: activeView === tab.id ? '2px solid #dc2626' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeView !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeView !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
          }}>
            <AnimatePresence mode="wait">
              {/* FEED VIEW */}
              {(activeView === 'feed' || (!['assets', 'network'].includes(activeView) && window.innerWidth >= 1024)) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <h3 style={{
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#6b7280',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    letterSpacing: '0.1em',
                    fontWeight: 'bold',
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#dc2626',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }} />
                    REAL-TIME TRANSACTIONS
                  </h3>

                  {transactions.map((tx) => {
                    const Icon = TRANSACTION_ICONS[tx.transaction_type] || DollarSign;
                    return (
                      <div
                        key={tx.id}
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(10, 10, 10, 0.5)',
                          border: tx.is_suspicious ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(127, 29, 29, 0.3)',
                          borderRadius: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = tx.is_suspicious ? 'rgba(220, 38, 38, 0.6)' : 'rgba(127, 29, 29, 0.6)';
                          e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.7)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = tx.is_suspicious ? 'rgba(220, 38, 38, 0.3)' : 'rgba(127, 29, 29, 0.3)';
                          e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.5)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: 'rgba(10, 10, 10, 0.8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 0,
                              border: '1px solid rgba(127, 29, 29, 0.3)',
                              flexShrink: 0,
                            }}>
                              <Icon size={14} style={{ color: tx.is_suspicious ? '#dc2626' : '#6b7280' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#e5e5e5',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              }}>
                                {tx.description || 'Unknown Transaction'}
                              </div>
                              <div style={{
                                fontSize: '9px',
                                color: '#6b7280',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                marginTop: '4px',
                                letterSpacing: '0.05em',
                              }}>
                                {tx.date} • {tx.transaction_type}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            fontSize: '13px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontWeight: 'bold',
                            color: tx.is_suspicious ? '#dc2626' : '#22c55e',
                            whiteSpace: 'nowrap',
                            marginLeft: '12px',
                            flexShrink: 0,
                          }}>
                            {formatMoney(tx.amount)}
                          </div>
                        </div>
                        {tx.is_suspicious && (
                          <div style={{
                            marginTop: '8px',
                            fontSize: '9px',
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            color: '#dc2626',
                            padding: '6px 8px',
                            display: 'inline-block',
                            borderRadius: 0,
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontWeight: 'bold',
                            letterSpacing: '0.05em',
                          }}>
                            SUSPICIOUS ACTIVITY DETECTED
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* ASSETS VIEW */}
              {activeView === 'assets' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  {assets.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      paddingTop: '40px',
                      paddingBottom: '40px',
                      color: '#6b7280',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}>
                      <Wallet size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.1em',
                      }}>NO ASSETS LINKED</div>
                    </div>
                  ) : (
                    assets.map((asset) => (
                      <div
                        key={asset.id}
                        style={{
                          position: 'relative',
                          aspectRatio: '16 / 9',
                          backgroundColor: 'rgba(10, 10, 10, 0.8)',
                          overflow: 'hidden',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: 0,
                        }}
                      >
                        {/* Placeholder image for asset */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: 'linear-gradient(to top, #000, transparent)',
                          zIndex: 10,
                        }} />
                        <img
                          src={`https://source.unsplash.com/random/400x300/?${asset.asset_type}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.5,
                            filter: 'grayscale(100%)',
                            transition: 'all 0.5s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.filter = 'grayscale(0%)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.5';
                            e.currentTarget.style.filter = 'grayscale(100%)';
                          }}
                          alt={asset.name}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '12px',
                          zIndex: 20,
                        }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          }}>{asset.name}</div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '10px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            marginTop: '4px',
                            letterSpacing: '0.05em',
                          }}>
                            <span style={{ color: '#6b7280' }}>{asset.asset_type.toUpperCase()}</span>
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatMoney(asset.current_value || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {/* NETWORK VIEW */}
              {activeView === 'network' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(10, 10, 10, 0.3)',
                    borderRadius: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    border: '1px solid rgba(127, 29, 29, 0.3)',
                  }}
                >
                  <div>
                    <ArrowLeftRight size={40} style={{ margin: '0 auto 16px', color: '#6b7280' }} />
                    <h3 style={{
                      color: '#6b7280',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      letterSpacing: '0.1em',
                    }}>FLOW VISUALIZATION</h3>
                    <p style={{
                      fontSize: '10px',
                      color: '#6b7280',
                      marginTop: '8px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}>Select a Target from the grid to trace network connections.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default FollowTheMoneyPanel;
