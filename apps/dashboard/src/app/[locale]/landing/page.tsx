'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Dynamic imports with SSR disabled for framer-motion components
const HeroSection = dynamic(() => import('@/components/Landing/HeroSection'), { ssr: false });
const ProblemSection = dynamic(() => import('@/components/Landing/ProblemSection'), { ssr: false });
const LastMessageBridge = dynamic(() => import('@/components/Landing/LastMessageBridge'), { ssr: false });
const JournalistShield = dynamic(() => import('@/components/Landing/JournalistShield'), { ssr: false });
const ShieldMechanics = dynamic(() => import('@/components/Landing/ShieldMechanics'), { ssr: false });
const TruthBridge = dynamic(() => import('@/components/Landing/TruthBridge'), { ssr: false });
const EpistemologyReveal = dynamic(() => import('@/components/Landing/EpistemologyReveal'), { ssr: false });
const CommunityCall = dynamic(() => import('@/components/Landing/CommunityCall'), { ssr: false });
const LivePlatformStats = dynamic(() => import('@/components/Landing/LivePlatformStats'), { ssr: false });
const FooterSection = dynamic(() => import('@/components/Landing/FooterSection'), { ssr: false });

export default function LandingPage() {
  // Landing page needs body scroll for useScroll hooks (body has overflow:hidden for Truth page)
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    return () => { document.body.style.overflow = 'hidden'; };
  }, []);

  return (
    <main style={{ background: '#030303', color: '#e5e5e5', minHeight: '100vh' }}>
      {/* ACT 1: THE PROBLEM */}
      <HeroSection />
      <ProblemSection />

      {/* ACT 2: THE SHIELD — Journalist Protection Story */}
      <LastMessageBridge />
      <JournalistShield />
      <ShieldMechanics />

      {/* ACT 3: THE TURN — From Journalists to Everyone */}
      <TruthBridge />
      <EpistemologyReveal />

      {/* LIVE PLATFORM METRICS — Real data from TARA Protocol */}
      <LivePlatformStats />

      {/* ACT 4: THE CALL — Community Invitation + CTA */}
      <CommunityCall />

      <FooterSection />
    </main>
  );
}
