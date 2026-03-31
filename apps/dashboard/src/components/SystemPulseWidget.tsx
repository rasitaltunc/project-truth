'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PulseStats {
  total: number;
  scanned: number;
  ready: number;
  pending: number;
  entities: number;
  relationships: number;
  dates: number;
  quarantine: number;
  nodes: number;
  links: number;
}

// Animated odometer digit
function OdometerValue({ value, duration = 1800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (value === prevRef.current) return;
    const start = prevRef.current;
    const diff = value - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prevRef.current = value;
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

// Heartbeat SVG
function HeartbeatLine({ active }: { active: boolean }) {
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" style={{ opacity: active ? 1 : 0.3 }}>
      <path
        d="M0,12 L15,12 L20,4 L25,20 L30,8 L35,16 L40,12 L80,12"
        fill="none"
        stroke="#dc2626"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: '120',
          strokeDashoffset: active ? '0' : '120',
          transition: 'stroke-dashoffset 1.5s ease-in-out',
          filter: active ? 'drop-shadow(0 0 4px rgba(220, 38, 38, 0.6))' : 'none',
        }}
      />
    </svg>
  );
}

// Stat row with glow
function StatRow({ icon, label, value, color, delay }: {
  icon: string; label: string; value: number; color: string; delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '4px 0',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-10px)',
      transition: 'all 0.4s ease',
    }}>
      <span style={{ fontSize: '11px', width: '16px', textAlign: 'center' }}>{icon}</span>
      <span style={{
        fontFamily: '"Courier New", monospace', fontSize: '10px',
        color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase',
        flex: 1,
      }}>{label}</span>
      <span style={{
        fontFamily: '"Courier New", monospace', fontSize: '13px',
        fontWeight: 700, color,
        textShadow: `0 0 8px ${color}40`,
        minWidth: '40px', textAlign: 'right',
      }}>
        <OdometerValue value={value} />
      </span>
    </div>
  );
}

export default function SystemPulseWidget({ networkId }: { networkId?: string }) {
  const [stats, setStats] = useState<PulseStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const nid = networkId || 'epstein';
      const res = await fetch(`/api/documents/stats?network_id=${nid}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdated(new Date());
        // Heartbeat pulse
        setHeartbeatActive(false);
        setTimeout(() => setHeartbeatActive(true), 100);
      }
    } catch { /* silent */ }
  }, [networkId]);

  // Initial fetch + 60s interval
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (!stats) return null;

  const scanProgress = stats.total > 0 ? Math.round((stats.scanned / stats.total) * 100) : 0;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        zIndex: 20,
        pointerEvents: 'auto',
        cursor: 'pointer',
        fontFamily: '"Courier New", monospace',
        userSelect: 'none',
      }}
    >
      {/* Glow background */}
      <div style={{
        position: 'absolute', inset: '-2px',
        background: 'radial-gradient(ellipse at center, rgba(220, 38, 38, 0.08) 0%, transparent 70%)',
        borderRadius: '8px',
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }} />

      {/* Main container */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.92) 0%, rgba(20, 5, 5, 0.92) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(220, 38, 38, 0.15)',
        borderRadius: '6px',
        padding: expanded ? '14px 16px' : '10px 14px',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: expanded ? '280px' : '220px',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: expanded ? '10px' : '0' }}>
          {/* Pulse dot */}
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: '#dc2626',
            boxShadow: '0 0 6px rgba(220, 38, 38, 0.8), 0 0 12px rgba(220, 38, 38, 0.4)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.25em', fontWeight: 700 }}>
            SYSTEM PULSE
          </span>
          <div style={{ flex: 1 }} />
          <HeartbeatLine active={heartbeatActive} />
        </div>

        {/* Collapsed: compact stats */}
        {!expanded && (
          <div style={{
            display: 'flex', gap: '12px', marginTop: '6px',
            fontSize: '10px', color: '#666',
          }}>
            <span><span style={{ color: '#22c55e', fontWeight: 700 }}>{stats.scanned}</span> docs</span>
            <span><span style={{ color: '#3b82f6', fontWeight: 700 }}>{stats.entities}</span> entities</span>
            <span><span style={{ color: '#a855f7', fontWeight: 700 }}>{stats.relationships}</span> links</span>
          </div>
        )}

        {/* Expanded: full dashboard */}
        {expanded && (
          <div style={{
            animation: 'fadeSlideIn 0.3s ease-out',
          }}>
            {/* Scan progress bar */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '9px', color: '#555', marginBottom: '4px',
              }}>
                <span>TARA PROGRESS</span>
                <span style={{ color: scanProgress === 100 ? '#22c55e' : '#dc2626' }}>
                  {scanProgress}%
                </span>
              </div>
              <div style={{
                width: '100%', height: '3px', backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderRadius: '2px', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${scanProgress}%`, height: '100%',
                  background: scanProgress === 100
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, #dc2626, #f87171)',
                  borderRadius: '2px',
                  boxShadow: scanProgress === 100
                    ? '0 0 8px rgba(34, 197, 94, 0.5)'
                    : '0 0 8px rgba(220, 38, 38, 0.5)',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: '1px', width: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.2), transparent)',
              margin: '6px 0',
            }} />

            {/* Stats grid */}
            <div style={{ fontSize: '11px' }}>
              <StatRow icon="📄" label="Documents" value={stats.scanned} color="#22c55e" delay={0} />
              <StatRow icon="👤" label="Entities" value={stats.entities} color="#3b82f6" delay={80} />
              <StatRow icon="🔗" label="Relations" value={stats.relationships} color="#a855f7" delay={160} />
              <StatRow icon="📅" label="Dates" value={stats.dates} color="#f59e0b" delay={240} />
              <StatRow icon="🔬" label="Quarantine" value={stats.quarantine} color="#ef4444" delay={320} />
            </div>

            {/* Divider */}
            <div style={{
              height: '1px', width: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.2), transparent)',
              margin: '8px 0 6px',
            }} />

            {/* Network stats */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '9px', color: '#555',
            }}>
              <span>NETWORK: <span style={{ color: '#dc2626' }}>{stats.nodes}</span> nodes · <span style={{ color: '#991b1b' }}>{stats.links}</span> links</span>
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div style={{
                fontSize: '8px', color: '#333', marginTop: '6px',
                textAlign: 'right',
              }}>
                updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(220, 38, 38, 0.8), 0 0 12px rgba(220, 38, 38, 0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 3px rgba(220, 38, 38, 0.4), 0 0 6px rgba(220, 38, 38, 0.2); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
