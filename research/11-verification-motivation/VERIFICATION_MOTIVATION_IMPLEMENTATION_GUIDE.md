# VERIFICATION MOTIVATION IMPLEMENTATION GUIDE

**Hedef:** VERIFICATION_MOTIVATION_ARCHITECTURE.md'deki teorik felsefesini Project Truth koduna dönüştür

**Kapsam:** Sprint 19-20, 4 hafta, 4 faz

---

## FAZE 1: IMPACT VISIBILITY (Hafta 1-2)

### 1.1 Database Gereksinimleri

```sql
-- Yeni kolonu: reputation_transactions → impact_category
ALTER TABLE public.reputation_transactions
ADD COLUMN impact_category TEXT CHECK (
  impact_category IN ('verification', 'discovery', 'staking', 'bridging')
);

-- Yeni tablo: user_impact_cache (performans)
CREATE TABLE public.user_impact_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Personal impact
  verifications_completed INT DEFAULT 0,
  false_items_prevented INT DEFAULT 0,
  connections_founded INT DEFAULT 0,
  investigations_contributed TEXT[] DEFAULT '{}',

  -- Computed
  percentage_of_total DECIMAL(5,2) DEFAULT 0,
  ranking INT,

  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Periyodik refresh (cron job)
-- Bu cache'i her saat güncelle: SELECT * FROM recalculate_user_impact_cache()

-- RPC: Bir user'ın impact'ını hesapla
CREATE OR REPLACE FUNCTION get_user_impact(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_verifications INT;
  v_false_prevented INT;
  v_connections INT;
  v_total_verifications INT;
  v_percentage DECIMAL(5,2);
BEGIN
  -- Verification count
  SELECT COUNT(*) INTO v_verifications
  FROM reputation_transactions
  WHERE user_id = p_user_id
    AND impact_category = 'verification'
    AND points > 0
    AND created_at > NOW() - '1 month'::INTERVAL;

  -- False items prevented (negative transactions)
  SELECT COUNT(*) INTO v_false_prevented
  FROM reputation_transactions
  WHERE user_id = p_user_id
    AND impact_category = 'verification'
    AND points < 0
    AND created_at > NOW() - '1 month'::INTERVAL;

  -- New connections
  SELECT COUNT(*) INTO v_connections
  FROM reputation_transactions
  WHERE user_id = p_user_id
    AND impact_category = 'discovery'
    AND created_at > NOW() - '1 month'::INTERVAL;

  -- Total verifications (all users, this month)
  SELECT COUNT(*) INTO v_total_verifications
  FROM reputation_transactions
  WHERE impact_category = 'verification'
    AND points > 0
    AND created_at > NOW() - '1 month'::INTERVAL;

  -- Percentage
  v_percentage := ROUND((v_verifications::DECIMAL / NULLIF(v_total_verifications, 0)) * 100, 2);

  RETURN jsonb_build_object(
    'verifications_completed', v_verifications,
    'false_items_prevented', v_false_prevented,
    'connections_founded', v_connections,
    'percentage_of_total', v_percentage,
    'period', 'last_30_days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.2 API Endpoints

```typescript
// src/app/api/impact/[userId]/route.ts

import { createClient } from '@/lib/supabaseClient';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = createClient();

  // Fetch user impact (RPC)
  const { data: userImpact, error } = await supabase.rpc(
    'get_user_impact',
    { p_user_id: params.userId }
  );

  if (error) return Response.json({ error }, { status: 400 });

  // Fetch community totals
  const { data: communityData } = await supabase
    .from('reputation_transactions')
    .select('COUNT(*)', { count: 'exact' })
    .eq('impact_category', 'verification')
    .gt('points', 0)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Fetch user's investigations
  const { data: investigations } = await supabase
    .from('investigations')
    .select('id, title, status')
    .eq('creator_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return Response.json({
    personal: userImpact,
    community: {
      total_verifications: communityData[0]?.count || 0,
    },
    investigations_contributed: investigations || [],
  });
}
```

### 1.3 UI Bileşeni

```typescript
// src/components/ImpactDashboard.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ImpactData {
  personal: {
    verifications_completed: number;
    false_items_prevented: number;
    connections_founded: number;
    percentage_of_total: number;
    period: string;
  };
  community: {
    total_verifications: number;
  };
  investigations_contributed: Array<{ id: string; title: string; status: string }>;
}

export function ImpactDashboard() {
  const { user } = useAuth();
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchImpact = async () => {
      const response = await fetch(`/api/impact/${user.id}`);
      const data = await response.json();
      setImpact(data);
      setLoading(false);
    };

    fetchImpact();
  }, [user?.id]);

  if (loading) return <div className="animate-pulse">Yükleniyor...</div>;
  if (!impact) return null;

  return (
    <div className="grid grid-cols-2 gap-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl">
      {/* YOUR IMPACT */}
      <div className="col-span-2 md:col-span-1">
        <h3 className="text-lg font-bold text-red-500 mb-4">SENIN ETKİN</h3>

        <div className="space-y-3">
          {/* Verified Count */}
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
            <span className="text-sm text-gray-300">Doğrulama Tamamlandı</span>
            <span className="text-2xl font-bold text-green-400">
              {impact.personal.verifications_completed}
            </span>
          </div>

          {/* False Items Prevented */}
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
            <span className="text-sm text-gray-300">Yanlış Bilgi Engellendi</span>
            <span className="text-2xl font-bold text-yellow-400">
              {impact.personal.false_items_prevented}
            </span>
          </div>

          {/* Connections */}
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
            <span className="text-sm text-gray-300">Bağlantı Keşfedildi</span>
            <span className="text-2xl font-bold text-blue-400">
              {impact.personal.connections_founded}
            </span>
          </div>

          {/* Percentage */}
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded">
            <p className="text-xs text-gray-400">Toplam İş'in</p>
            <p className="text-xl font-bold text-red-400">
              %{impact.personal.percentage_of_total}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Bu ay ({impact.personal.period})
            </p>
          </div>
        </div>
      </div>

      {/* COMMUNITY IMPACT */}
      <div className="col-span-2 md:col-span-1">
        <h3 className="text-lg font-bold text-blue-500 mb-4">TOPLULUK ETKİSİ</h3>

        <div className="space-y-3">
          {/* Total Verified */}
          <div className="p-3 bg-slate-700/50 rounded">
            <p className="text-xs text-gray-400 mb-1">Tüm Doğrulamalar</p>
            <p className="text-3xl font-bold text-green-400">
              {impact.community.total_verifications.toLocaleString()}
            </p>
          </div>

          {/* Your Contribution */}
          <div className="p-3 bg-slate-700/50 rounded">
            <p className="text-xs text-gray-400 mb-2">Senin Katılımın</p>
            <div className="w-full bg-slate-600 rounded h-2">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded"
                style={{ width: `${Math.min(impact.personal.percentage_of_total * 10, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              %{impact.personal.percentage_of_total} toplam iş
            </p>
          </div>

          {/* Investigations */}
          {impact.investigations_contributed.length > 0 && (
            <div className="p-3 bg-slate-700/50 rounded mt-4">
              <p className="text-xs text-gray-400 mb-2">Katıldığın Soruşturmalar</p>
              <div className="space-y-2">
                {impact.investigations_contributed.map((inv) => (
                  <div key={inv.id} className="text-xs p-2 bg-slate-600/50 rounded">
                    <p className="text-gray-300 font-medium">{inv.title}</p>
                    <p className="text-gray-500">{inv.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MESSAGE */}
      <div className="col-span-2 p-4 bg-blue-900/20 border border-blue-500/30 rounded text-center">
        <p className="text-sm text-gray-300">
          {impact.personal.percentage_of_total > 5
            ? '🌟 Bu ay çok katkıda bulundun! Devam et.'
            : impact.personal.verifications_completed === 0
            ? '🚀 İlk doğrulaman bir harita kesfet!'
            : '📈 Daha aktif katılım, daha büyük etki.'}
        </p>
      </div>
    </div>
  );
}
```

### 1.4 Integration

```typescript
// src/app/[locale]/truth/page.tsx

import { ImpactDashboard } from '@/components/ImpactDashboard';

export default function TruthPage() {
  return (
    <div className="space-y-6">
      {/* ... Existing components ... */}

      {/* NEW: Impact Dashboard */}
      <ImpactDashboard />

      {/* ... Rest of page ... */}
    </div>
  );
}
```

---

## FAZE 2: DYNAMIC STAKING (Hafta 2-3)

### 2.1 Staking Engine

```typescript
// src/lib/stakingEngine.ts

export interface StakingConfig {
  tier1: { percentage: 0.10; maxStake: 20 };
  tier2: { percentage: 0.20; maxStake: 100 };
  tier3: { percentage: 0.30; maxStake: 500 };
}

export interface StakingOutcome {
  onApprove: {
    reputationGain: number;
    message: string;
  };
  onReject: {
    reputationLoss: number;
    message: string;
  };
  onDisputed: {
    reputationLoss: number;
    message: string;
  };
}

export function calculateStake(
  currentReputation: number,
  userTier: 'tier1' | 'tier2' | 'tier3',
  config: StakingConfig = {
    tier1: { percentage: 0.10, maxStake: 20 },
    tier2: { percentage: 0.20, maxStake: 100 },
    tier3: { percentage: 0.30, maxStake: 500 },
  }
): {
  stakeAmount: number;
  onApprove: number;
  onReject: number;
  onDisputed: number;
} {
  const tierConfig = config[userTier];

  // Hesapla: itibar × yüzde
  let stake = Math.floor(currentReputation * tierConfig.percentage);

  // Max cap uygula
  stake = Math.min(stake, tierConfig.maxStake);

  // Minimum stake (en az 1)
  stake = Math.max(stake, 1);

  // Outcomes
  const outcomes = {
    stakeAmount: stake,
    onApprove: Math.floor(stake * 0.3), // +30% bonus
    onReject: stake * 1.0, // -100% (tüm stake)
    onDisputed: Math.floor(stake * 0.5), // -50% (nötr)
  };

  return outcomes;
}

// Example usage
const stake = calculateStake(200, 'tier2');
console.log(stake);
// {
//   stakeAmount: 40,           (200 × 0.20)
//   onApprove: 12,             (40 × 0.30)
//   onReject: 40,              (40 × 1.00)
//   onDisputed: 20             (40 × 0.50)
// }
```

### 2.2 Database Update

```sql
-- Staking bilgisini quarantine sistemine ekle
ALTER TABLE public.data_quarantine
ADD COLUMN staker_id UUID REFERENCES auth.users(id),
ADD COLUMN staked_amount INT,
ADD COLUMN staking_outcome TEXT CHECK (
  staking_outcome IN ('pending', 'approved', 'rejected', 'disputed')
),
ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Index
CREATE INDEX idx_quarantine_staker ON public.data_quarantine(staker_id);

-- When resolution happens
CREATE OR REPLACE FUNCTION resolve_staked_quarantine(
  p_quarantine_id UUID,
  p_outcome TEXT -- 'approved', 'rejected', 'disputed'
)
RETURNS VOID AS $$
DECLARE
  v_stake RECORD;
BEGIN
  -- Get staking info
  SELECT staker_id, staked_amount INTO v_stake
  FROM data_quarantine
  WHERE id = p_quarantine_id;

  -- Calculate outcome
  IF p_outcome = 'approved' THEN
    -- Award reputation
    INSERT INTO reputation_transactions (user_id, action, points, impact_category)
    VALUES (
      v_stake.staker_id,
      'evidence_approved',
      FLOOR(v_stake.staked_amount * 0.3),
      'staking'
    );
  ELSIF p_outcome = 'rejected' THEN
    -- Slash reputation
    INSERT INTO reputation_transactions (user_id, action, points, impact_category)
    VALUES (
      v_stake.staker_id,
      'evidence_rejected',
      -v_stake.staked_amount,
      'staking'
    );
  ELSIF p_outcome = 'disputed' THEN
    -- Half-loss
    INSERT INTO reputation_transactions (user_id, action, points, impact_category)
    VALUES (
      v_stake.staker_id,
      'evidence_disputed',
      -FLOOR(v_stake.staked_amount * 0.5),
      'staking'
    );
  END IF;

  -- Update quarantine status
  UPDATE data_quarantine
  SET staking_outcome = p_outcome
  WHERE id = p_quarantine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 UI Component

```typescript
// src/components/QuarantineReviewWithStaking.tsx

import React, { useState } from 'react';
import { calculateStake } from '@/lib/stakingEngine';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  quarantine: any;
  userTier: 'tier1' | 'tier2' | 'tier3';
  userReputation: number;
}

export function QuarantineReviewWithStaking({
  quarantine,
  userTier,
  userReputation,
}: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<null | 'approve' | 'reject' | 'dispute'>(null);
  const stake = calculateStake(userReputation, userTier);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
      {/* Warning section */}
      <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded">
        <p className="text-sm font-bold text-yellow-300 mb-2">⚠️ CİLT OYUNDA</p>
        <p className="text-xs text-gray-300">
          Bu kararın için <span className="font-bold text-yellow-400">{stake.stakeAmount} puan</span> risky:
        </p>
        <ul className="text-xs text-gray-400 mt-2 space-y-1">
          <li>✅ Doğru: +{stake.onApprove} bonus</li>
          <li>❌ Yanlış: -{stake.onReject} (tüm stake)</li>
          <li>🤷 Tartışmalı: -{stake.onDisputed} (yarısı)</li>
        </ul>
      </div>

      {/* Quarantine content */}
      <div className="mb-6 p-4 bg-slate-700/50 rounded">
        <p className="text-sm font-bold text-gray-300 mb-2">Doğrulanacak</p>
        <p className="text-gray-400">{quarantine.content}</p>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedOutcome('approve')}
          className={`p-3 rounded font-bold text-sm transition-all ${
            selectedOutcome === 'approve'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          ✅ DOĞRU
          <div className="text-xs mt-1">+{stake.onApprove}</div>
        </button>

        <button
          onClick={() => setSelectedOutcome('dispute')}
          className={`p-3 rounded font-bold text-sm transition-all ${
            selectedOutcome === 'dispute'
              ? 'bg-yellow-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          🤷 TARTIŞMALI
          <div className="text-xs mt-1">-{stake.onDisputed}</div>
        </button>

        <button
          onClick={() => setSelectedOutcome('reject')}
          className={`p-3 rounded font-bold text-sm transition-all ${
            selectedOutcome === 'reject'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          ❌ YANLIŞ
          <div className="text-xs mt-1">-{stake.onReject}</div>
        </button>
      </div>

      {/* Summary */}
      {selectedOutcome && (
        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded text-sm text-gray-300">
          {selectedOutcome === 'approve' && (
            <>
              <p className="font-bold text-green-400">Bu DOĞRU olduğuna eminsin?</p>
              <p className="text-xs mt-1">
                Doğru tahmin edersin = +{stake.onApprove} puan kazanırsın.
                Yanlış tahmin edersin = -{stake.onReject} puan kaybedersin.
              </p>
            </>
          )}
          {selectedOutcome === 'reject' && (
            <>
              <p className="font-bold text-red-400">Bu YANLIŞ olduğuna eminsin?</p>
              <p className="text-xs mt-1">
                Yanlış kararı vermek çok maliyetli ({stake.onReject} puan).
                Emin misin?
              </p>
            </>
          )}
          {selectedOutcome === 'dispute' && (
            <>
              <p className="font-bold text-yellow-400">Bu tartışmalı buluyorsun?</p>
              <p className="text-xs mt-1">
                Tartışmalı kararı vermek -{stake.onDisputed} puan.
                Başka biri bunu inceleyebilir.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## FAZE 3: BRIDGING CONSENSUS (Hafta 3-4)

### 3.1 Database Schema

```sql
-- Approval threshold with diversity requirements
ALTER TABLE public.data_quarantine
ADD COLUMN requires_bridging BOOLEAN DEFAULT FALSE,
ADD COLUMN bridging_criteria JSONB DEFAULT '{
  "minApprovers": 2,
  "requireGeoDiversity": true,
  "requireTierDiversity": true,
  "requireChallengeResolution": true
}'::jsonb;

-- Challenge table
CREATE TABLE public.quarantine_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarantine_id UUID REFERENCES data_quarantine(id),
  challenger_id UUID REFERENCES auth.users(id),
  challenge_reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Resolution
  resolved_at TIMESTAMP,
  resolution_text TEXT,
  resolved_by UUID REFERENCES auth.users(id),

  status TEXT CHECK (status IN ('open', 'resolved', 'dismissed')) DEFAULT 'open'
);

-- Bridging approval records
CREATE TABLE public.quarantine_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarantine_id UUID REFERENCES data_quarantine(id),
  approver_id UUID REFERENCES auth.users(id),

  -- Diversity tracking
  approver_country TEXT,
  approver_tier TEXT,

  decision TEXT CHECK (decision IN ('approve', 'reject', 'dispute')),
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(quarantine_id, approver_id)
);
```

### 3.2 Bridging Logic

```typescript
// src/lib/bridgingConsensus.ts

import { supabase } from './supabaseClient';

interface Approver {
  id: string;
  country: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  decision: 'approve' | 'reject' | 'dispute';
}

interface BridgingRequirement {
  minApprovers: number;
  requireGeoDiversity: boolean;
  requireTierDiversity: boolean;
  requireChallengeResolution: boolean;
}

export async function checkBridgingConsensus(
  quarantineId: string,
  requirements: BridgingRequirement
): Promise<{
  approved: boolean;
  reason: string;
  approvals: Approver[];
  issues: string[];
}> {
  const issues: string[] = [];

  // Fetch approvals
  const { data: approvals } = await supabase
    .from('quarantine_approvals')
    .select('*')
    .eq('quarantine_id', quarantineId);

  if (!approvals || approvals.length === 0) {
    return {
      approved: false,
      reason: 'No approvals yet',
      approvals: [],
      issues: ['Hiçbir onay yok'],
    };
  }

  // Check minimum
  if (approvals.length < requirements.minApprovers) {
    issues.push(
      `En az ${requirements.minApprovers} onay gerekli, ` +
      `${approvals.length} vardır`
    );
  }

  // Check geo diversity
  if (requirements.requireGeoDiversity) {
    const countries = new Set(approvals.map((a) => a.approver_country));
    if (countries.size < 2) {
      issues.push('Farklı ülkelerden onay gerekli');
    }
  }

  // Check tier diversity
  if (requirements.requireTierDiversity) {
    const tiers = new Set(approvals.map((a) => a.approver_tier));
    if (tiers.size < 2) {
      issues.push('Farklı tier'lerden onay gerekli');
    }
  }

  // Check challenge resolution
  if (requirements.requireChallengeResolution) {
    const { data: openChallenges } = await supabase
      .from('quarantine_challenges')
      .select('*')
      .eq('quarantine_id', quarantineId)
      .eq('status', 'open');

    if (openChallenges && openChallenges.length > 0) {
      issues.push(
        `${openChallenges.length} açık objeksiyon var, ` +
        'bunlar çözülmeli'
      );
    }
  }

  // Verdict
  const approved = issues.length === 0 && approvals.length >= requirements.minApprovers;

  return {
    approved,
    reason: approved
      ? `Toplam ${approvals.length} kişi onayladı`
      : issues.join('; '),
    approvals: approvals,
    issues,
  };
}
```

---

## FAZE 4: ANTI-GAMING LAYERS (Hafta 4)

### 4.1 Sybil Detection

```sql
-- Anomali tespiti
CREATE OR REPLACE FUNCTION detect_sybil_candidates()
RETURNS TABLE (
  user_id UUID,
  risk_score DECIMAL(3,1),
  issues TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH user_metrics AS (
    SELECT
      user_id,
      COUNT(*) as approval_count,
      COUNT(DISTINCT approver_country) as countries,
      COUNT(DISTINCT approver_tier) as tiers,

      -- Same IP check (require external IP table)
      COUNT(DISTINCT CAST(
        SUBSTRING(approver_country, 1, 2) AS TEXT
      )) as geo_diversity,

      -- Time clustering
      COUNT(*) FILTER (
        WHERE created_at > NOW() - '1 hour'::INTERVAL
      ) as approvals_last_hour
    FROM quarantine_approvals
    WHERE created_at > NOW() - '30 days'::INTERVAL
    GROUP BY user_id
  ),
  risk_calculations AS (
    SELECT
      user_id,
      approval_count,
      countries,
      tiers,
      geo_diversity,
      approvals_last_hour,

      -- Risk scoring
      (
        CASE WHEN approvals_last_hour > 10 THEN 30.0 ELSE 0.0 END +
        CASE WHEN geo_diversity = 1 AND approval_count > 5 THEN 20.0 ELSE 0.0 END +
        CASE WHEN tiers = 1 AND approval_count > 10 THEN 15.0 ELSE 0.0 END +
        CASE WHEN approval_count > 50 THEN 10.0 ELSE 0.0 END
      ) as risk_score
    FROM user_metrics
  )
  SELECT
    user_id,
    risk_score,
    ARRAY_AGG(DISTINCT issue) FILTER (WHERE issue IS NOT NULL) as issues
  FROM (
    SELECT
      user_id,
      risk_score,
      CASE
        WHEN approvals_last_hour > 10
        THEN 'Hızlı onaylar (10+ /saat)'
        WHEN geo_diversity = 1 AND approval_count > 5
        THEN 'Çeşitlilik yok (aynı bölge)'
        WHEN tiers = 1 AND approval_count > 10
        THEN 'Tier çeşitliği yok'
        ELSE NULL
      END as issue
    FROM risk_calculations
  ) issues_table
  WHERE risk_score > 20.0
  GROUP BY user_id, risk_score;
END;
$$ LANGUAGE plpgsql;

-- Cron job
SELECT cron.schedule(
  'detect-sybil-candidates',
  '0 */6 * * *', -- Her 6 saatte
  'SELECT detect_sybil_candidates();'
);
```

### 4.2 Rate Limiting

```typescript
// src/middleware/rateLimiting.ts

import { rateLimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const limits = {
  tier1: {
    verificationsPerDay: 5,
    stakedPointsPerDay: 10,
  },
  tier2: {
    verificationsPerDay: 50,
    stakedPointsPerDay: 200,
  },
  tier3: {
    verificationsPerDay: 500,
    stakedPointsPerDay: 5000,
  },
};

export async function checkRateLimit(
  userId: string,
  userTier: 'tier1' | 'tier2' | 'tier3',
  action: 'verification' | 'staking'
) {
  const limit = limits[userTier];
  const key = `${userId}:${action}:${new Date().toISOString().split('T')[0]}`;

  const limiter = rateLimit({
    redis,
    limiter: rateLimit.slidingWindow(
      action === 'verification'
        ? limit.verificationsPerDay
        : Math.floor(limit.stakedPointsPerDay / 5), // 5pt/verification avg
      '24h'
    ),
  });

  try {
    const { success, remaining } = await limiter.limit(key);
    return { success, remaining };
  } catch (error) {
    // Redis down = allow (fail open)
    return { success: true, remaining: -1 };
  }
}
```

---

## TEST PLAN (Sprint 19'un Sonunda)

### 6.1 Accuracy Test

```typescript
// tests/verification-accuracy.test.ts

describe('Verification Accuracy with Staking', () => {
  it('should show higher accuracy with staking enabled', async () => {
    // Setup: 100 claims, 50 true, 50 false
    const claims = generateTestClaims(100);

    // Control: without staking
    const controlResults = await verifyClaimsWithoutStaking(claims);
    const controlAccuracy = calculateAccuracy(controlResults);
    // Expected: ~72% (from Zooniverse baseline)

    // Experiment: with staking
    const stakingResults = await verifyClaimsWithStaking(claims);
    const stakingAccuracy = calculateAccuracy(stakingResults);
    // Expected: ~86-90%

    expect(stakingAccuracy).toBeGreaterThan(controlAccuracy * 1.15);
    // At least 15% improvement
  });

  it('should penalize incorrect verifications', async () => {
    const user = createTestUser('tier2', reputation: 200);

    // Wrong verification
    await submitVerification(user, falseClaim, 'approve');

    const { data: reputation } = await getUserReputation(user.id);
    expect(reputation.current).toBeLessThan(200);
    expect(reputation.lost).toBeGreaterThan(30); // Staking penalty
  });
});
```

### 6.2 Retention Test

```typescript
it('should maintain engagement with impact visibility', async () => {
  const controlGroup = createTestUsers(50, { showImpact: false });
  const treatmentGroup = createTestUsers(50, { showImpact: true });

  // 2-week observation
  const controlRetention = calculateWeeklyRetention(controlGroup);
  const treatmentRetention = calculateWeeklyRetention(treatmentGroup);

  // Expected: Treatment group +10-15% retention
  expect(treatmentRetention).toBeGreaterThan(controlRetention * 1.10);
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] Database migrations tested (test DB first)
- [ ] API endpoints tested (50+ requests)
- [ ] UI components tested (manual browser test)
- [ ] Performance profiling (impact calculation <100ms)
- [ ] Error handling (graceful failures)
- [ ] Security audit (no SQL injection, CORS safe)
- [ ] Monitoring setup (Sentry, analytics)
- [ ] Rollback plan (feature flags)
- [ ] Documentation updated
- [ ] Team training

---

**Prepared by:** Claude Agent
**Date:** March 23, 2026
**Status:** READY FOR SPRINT 19
