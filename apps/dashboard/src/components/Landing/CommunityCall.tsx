'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

// ═══════════════════════════════════════════════════════════
//  "THE CALL"
//
//  Four roles. One manifesto. Three doors.
//
//  "Truth can't stand alone. It needs people who
//   refuse to look away."
//
//  Ends with: "Gerçeğe ışık tutan herkes, tarihin doğru
//  tarafında yerini alır."
// ═══════════════════════════════════════════════════════════

const ROLES = [
  { key: 'role1', icon: '⚖', color: '#3b82f6' },  // Lawyer
  { key: 'role2', icon: '📊', color: '#22c55e' },  // Analyst
  { key: 'role3', icon: '🖊', color: '#a855f7' },  // Journalist
  { key: 'role4', icon: '✊', color: '#dc2626' },   // Citizen
];

const DOORS = [
  { key: 'cta1', subKey: 'cta1Sub', href: 'truth', color: '#3b82f6', icon: '🔍' },
  { key: 'cta2', subKey: 'cta2Sub', href: 'truth', color: '#22c55e', icon: '🤝' },
  { key: 'cta3', subKey: 'cta3Sub', href: 'https://github.com', color: '#a855f7', icon: '⚡', external: true },
];

export default function CommunityCall() {
  const t = useTranslations('landing.community');
  const locale = useLocale();

  const headlineRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLDivElement>(null);
  const doorsRef = useRef<HTMLDivElement>(null);

  const headlineInView = useInView(headlineRef, { once: true, amount: 0.5 });
  const rolesInView = useInView(rolesRef, { once: true, amount: 0.3 });
  const manifestoInView = useInView(manifestoRef, { once: true, amount: 0.5 });
  const doorsInView = useInView(doorsRef, { once: true, amount: 0.3 });

  return (
    <section style={{
      position: 'relative',
      background: '#030303',
      overflow: 'hidden',
    }}>
      {/* ─── HEADLINE: "Truth can't stand alone" ─── */}
      <div style={{ position: 'relative', height: '160vh' }}>
        <div
          ref={headlineRef}
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          {/* Label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={headlineInView ? { opacity: 1 } : {}}
            transition={{ duration: 1 }}
            style={{ marginBottom: 32 }}
          >
            <span style={{
              fontSize: 11,
              letterSpacing: '0.35em',
              fontFamily: 'monospace',
              color: 'rgba(220,38,38,0.5)',
            }}>
              {t('label')}
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={headlineInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.3 }}
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 700,
              color: '#e5e5e5',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {t('headline')}
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headlineInView ? { opacity: 0.6, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: '#a3a3a3',
              textAlign: 'center',
              margin: '20px 0 0',
              fontWeight: 300,
              maxWidth: 500,
            }}
          >
            {t('subheadline')}
          </motion.p>
        </div>
      </div>

      {/* ─── ROLES: Four contributors ─── */}
      <div
        ref={rolesRef}
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
          gap: 16,
        }}>
          {ROLES.map((role, i) => (
            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 30 }}
              animate={rolesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: 'clamp(20px, 2vw, 28px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 2,
                background: role.color,
                opacity: 0.6,
              }} />

              <div style={{
                fontSize: 28,
                marginBottom: 14,
              }}>
                {role.icon}
              </div>

              <h4 style={{
                fontSize: 16,
                color: '#e5e5e5',
                margin: '0 0 10px',
                fontWeight: 600,
              }}>
                {t(`${role.key}Title`)}
              </h4>

              <p style={{
                fontSize: 13,
                color: '#888',
                lineHeight: 1.7,
                margin: 0,
              }}>
                {t(`${role.key}Desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── MANIFESTO: The final message ─── */}
      <div style={{ position: 'relative', height: '180vh' }}>
        <div
          ref={manifestoRef}
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          <motion.blockquote
            initial={{ opacity: 0 }}
            animate={manifestoInView ? { opacity: 1 } : {}}
            transition={{ duration: 2 }}
            style={{
              maxWidth: 640,
              textAlign: 'center',
              margin: 0,
              padding: 0,
              border: 'none',
            }}
          >
            <p style={{
              fontSize: 'clamp(18px, 2.5vw, 26px)',
              color: '#e5e5e5',
              lineHeight: 1.8,
              fontWeight: 300,
              fontFamily: 'Georgia, serif',
              margin: 0,
            }}>
              {t('manifesto')}
            </p>
          </motion.blockquote>

          {/* Red accent below manifesto */}
          <motion.div
            initial={{ width: 0 }}
            animate={manifestoInView ? { width: 80 } : {}}
            transition={{ duration: 1.5, delay: 1 }}
            style={{
              height: 2,
              background: '#dc2626',
              marginTop: 40,
            }}
          />
        </div>
      </div>

      {/* ─── THREE DOORS: The CTA ─── */}
      <div
        ref={doorsRef}
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 24px 40px',
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
          gap: 20,
        }}>
          {DOORS.map((door, i) => (
            <motion.div
              key={door.key}
              initial={{ opacity: 0, y: 40 }}
              animate={doorsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: i * 0.2 }}
            >
              <Link
                href={door.external ? door.href : `/${locale}/${door.href}`}
                target={door.external ? '_blank' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: 'clamp(24px, 5vw, 36px) clamp(16px, 3vw, 24px)',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 12,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = door.color + '44';
                  e.currentTarget.style.background = door.color + '08';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: 32, marginBottom: 16 }}>
                  {door.icon}
                </span>

                {/* CTA text */}
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#e5e5e5',
                  marginBottom: 8,
                }}>
                  {t(door.key)}
                </span>

                {/* Sub text */}
                <span style={{
                  fontSize: 13,
                  color: '#888',
                  lineHeight: 1.5,
                }}>
                  {t(door.subKey)}
                </span>

                {/* Bottom accent */}
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: '20%', right: '20%',
                  height: 2,
                  background: door.color,
                  opacity: 0.4,
                  borderRadius: '2px 2px 0 0',
                }} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── FINAL LINE ─── */}
      <div style={{
        textAlign: 'center',
        padding: '80px 24px 40px',
      }}>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          style={{
            fontSize: 'clamp(20px, 3vw, 32px)',
            color: '#dc2626',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          {t('finalLine')}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{
            fontSize: 13,
            color: '#a3a3a3',
            margin: '16px 0 0',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}
        >
          {t('finalNote')}
        </motion.p>
      </div>
    </section>
  );
}
