'use client';

import { useTranslations, useLocale } from 'next-intl';

export default function FooterSection() {
  const t = useTranslations('landing.footer');
  const locale = useLocale();
  const otherLocale = locale === 'en' ? 'tr' : 'en';

  return (
    <footer style={{
      padding: 'clamp(2rem, 6vw, 4rem) 2rem 2rem',
      background: '#030303',
      borderTop: '1px solid rgba(220,38,38,0.15)',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
        gap: '3rem',
      }}>
        {/* Brand */}
        <div>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#dc2626',
            marginBottom: '0.75rem',
          }}>
            PROJECT TRUTH
          </div>
          <p style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.85rem',
            color: '#737373',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {t('mission')}
          </p>
        </div>

        {/* Product links */}
        <div>
          <h4 style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#a3a3a3',
            margin: '0 0 1rem 0',
            textTransform: 'uppercase',
          }}>
            {t('product')}
          </h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['docs', 'changelog', 'roadmap'].map((item) => (
              <a key={item} href="#" style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: '0.85rem',
                color: '#737373',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}>
                {t(item)}
              </a>
            ))}
          </nav>
        </div>

        {/* Community links */}
        <div>
          <h4 style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#a3a3a3',
            margin: '0 0 1rem 0',
            textTransform: 'uppercase',
          }}>
            {t('community')}
          </h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <a href="https://github.com/rasitaltunc/project-truth" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', color: '#737373', textDecoration: 'none',
            }}>
              {t('github')}
            </a>
            <a href="https://github.com/rasitaltunc/project-truth/issues" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', color: '#737373', textDecoration: 'none',
            }}>
              {t('issues')}
            </a>
            <a href="https://github.com/rasitaltunc/project-truth/discussions" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', color: '#737373', textDecoration: 'none',
            }}>
              {t('discussions')}
            </a>
          </nav>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#a3a3a3',
            margin: '0 0 1rem 0',
            textTransform: 'uppercase',
          }}>
            {t('legal')}
          </h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['license', 'privacy', 'terms'].map((item) => (
              <a key={item} href="#" style={{
                fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', color: '#737373', textDecoration: 'none',
              }}>
                {t(item)}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: '1100px',
        margin: '3rem auto 0',
        paddingTop: '1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <span style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.8rem',
          color: '#525252',
        }}>
          {t('copyright')}
        </span>

        {/* Language switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '0.7rem',
            color: '#525252',
          }}>
            {t('langLabel')}
          </span>
          <a
            href={`/${locale}/landing`}
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.8rem',
              color: '#dc2626',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {locale.toUpperCase()}
          </a>
          <span style={{ color: '#525252', fontSize: '0.8rem' }}>|</span>
          <a
            href={`/${otherLocale}/landing`}
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.8rem',
              color: '#737373',
              textDecoration: 'none',
            }}
          >
            {otherLocale.toUpperCase()}
          </a>
        </div>
      </div>
    </footer>
  );
}
