# SPRINT 6A — UI ENTEGRASYON DİREKTİFİ (Sonnet İçin)

> **Hazırlayan:** Opus (kod denetim + bug fix tamamlandı)
> **Tarih:** 6 Mart 2026
> **Durum:** Database ✅ | API Routes ✅ | Store ✅ | UI Components ✅ | **Entegrasyon ❌**

---

## TLDR — Ne Yapılacak?

Sprint 6A'nın tüm altyapısı (DB, API, Store, Components) hazır ve test edildi. Şimdi yapılması gereken:

1. **UserBadge.tsx'i yeni badge sistemiyle değiştir** (eski TRUST_LEVELS → yeni badgeStore)
2. **Profil paneli oluştur** — badge, reputation, leaderboard, history hepsini barındıran slide panel
3. **EvidenceReviewQueue'yu entegre et** — Tier 2+ için review UI
4. **NominationModal tetikleyicisi ekle** — profil panelinden erişilebilir
5. **truth/page.tsx layout güncellemesi** — tüm yeni panelleri wire-up

---

## MEVCUT DURUM (Detaylı)

### ✅ Hazır Olan Bileşenler (Opus Tarafından Denetlendi + Fix'lendi)

| Bileşen | Dosya | Durum | Not |
|---------|-------|-------|-----|
| BadgeDisplay | `components/BadgeDisplay.tsx` | ✅ Tam | 4 tier, glow, tooltip, size variants |
| BadgeUpgradePanel | `components/BadgeUpgradePanel.tsx` | ✅ Tam | Progress bars, gazeteci başvurusu |
| ReputationHistory | `components/ReputationHistory.tsx` | ✅ Tam | Timeline, compact mode |
| LeaderboardPanel | `components/LeaderboardPanel.tsx` | ✅ Tam | Network/Global tabs |
| NominationModal | `components/NominationModal.tsx` | ✅ Tam | Peer nomination form |
| EvidenceReviewQueue | `components/EvidenceReviewQueue.tsx` | ✅ Tam | Card stack, verify/dispute/skip |
| badgeStore | `store/badgeStore.ts` | ✅ Tam | Zustand + persist + tüm API calls |

### ✅ Hazır API Routes (Opus Tarafından Fix'lendi)

- `/api/badge` — GET/POST badge bilgisi
- `/api/badge/nominate` — Peer nomination
- `/api/badge/nominations` — Aday listesi
- `/api/badge/check-promotion` — Otomatik tier yükseltme
- `/api/badge/leaderboard` — Sıralama tablosu (10dk cache)
- `/api/badge/journalist-request` — Gazeteci başvurusu
- `/api/evidence/submit` — Staked evidence gönderme
- `/api/evidence/resolve` — Kanıt doğrulama/reddetme
- `/api/evidence/pending` — İnceleme kuyruğu
- `/api/reputation/stats` — Reputation özeti
- `/api/reputation/history` — Transaction geçmişi

### ❌ Yapılması Gereken (Bu Direktifin Konusu)

1. `UserBadge.tsx` → Yeni badge sistemiyle tamamen yeniden yaz
2. `ProfilePanel.tsx` → **YENİ** — Tüm badge/reputation UI'ı barındıran ana panel
3. `truth/page.tsx` → ProfilePanel + EvidenceReviewQueue entegrasyonu

---

## GÖREV 1: UserBadge.tsx — Yeniden Yazım

**Mevcut sorun:** UserBadge.tsx eski `AuthContext` + `TRUST_LEVELS` + `UserProfileModal` kullanıyor. Bu sistemler Sprint 6A badge sistemiyle uyumsuz.

**Yapılacak:** UserBadge'i `badgeStore` ile çalışacak şekilde yeniden yaz.

### Yeni UserBadge Tasarımı:

```
┌─────────────────────────────────┐
│  [🐺]  fp_a1b2c3  •  ⚡ 47    │  ← Tıklanınca ProfilePanel açılır
└─────────────────────────────────┘
```

- Sol: Badge tier ikonu (BadgeDisplay xs kullan)
- Orta: Kısaltılmış fingerprint
- Sağ: Reputation puanı
- Tıklayınca: `showProfilePanel` state toggle

### Kod Yapısı:

```tsx
'use client';
import { useState } from 'react';
import { useBadgeStore, getBadgeTier } from '@/store/badgeStore';
import BadgeDisplay from '@/components/BadgeDisplay';

export function UserBadge() {
  const { userFingerprint, globalBadge, reputation } = useBadgeStore();
  const [showProfile, setShowProfile] = useState(false);

  const tier = globalBadge?.badge_tier || 'anonymous';
  const tierInfo = getBadgeTier(tier);
  const shortFp = userFingerprint
    ? userFingerprint.substring(0, 10) + '...'
    : 'ANON';

  return (
    <>
      <button onClick={() => setShowProfile(!showProfile)} ...>
        <BadgeDisplay tierId={tier} size="xs" />
        <span>{shortFp}</span>
        <span>⚡ {reputation?.total_score ?? 0}</span>
      </button>

      {/* ProfilePanel burada veya truth/page.tsx'den kontrol edilebilir */}
    </>
  );
}
```

### Stil Notları:
- `font-family: monospace` — mevcut "federal indictment" aesthetic
- `backgroundColor: '#0a0a0a'`, `border: '1px solid #333'`
- Hover: `borderColor → tierInfo.color`, `boxShadow → 0 0 12px tierColor/30%`
- **CompactUserBadge ve TrustLevelBadge export'larını da güncelle** — badgeStore'dan tier bilgisi alsın

---

## GÖREV 2: ProfilePanel.tsx — YENİ Bileşen

Sağ taraftan slide-in panel. UserBadge tıklandığında açılır.

### Layout:

```
┌─────────────────────────────────────┐
│  KULLANICI PROFİLİ            ✕    │
│─────────────────────────────────────│
│                                      │
│  [🐺 PLATFORM KURDU]                │  ← BadgeDisplay (lg)
│  fp_a1b2c3d4e5...                   │
│  ⚡ 47 puan  •  📊 12 katkı        │
│                                      │
│  ┌─── TABS ───────────────────────┐ │
│  │ 📊 İlerleme │ 📈 Sıralama │    │ │
│  │ 📜 Geçmiş  │ 🗳️ Adaylık  │    │ │
│  └────────────────────────────────┘ │
│                                      │
│  [Aktif Tab İçeriği]                │
│  - İlerleme → BadgeUpgradePanel     │
│  - Sıralama → LeaderboardPanel      │
│  - Geçmiş → ReputationHistory       │
│  - Adaylık → NominationModal        │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ 📋 İNCELEME KUYRUĞU (X adet) │ │  ← EvidenceReviewQueue butonu
│  └────────────────────────────────┘ │
│                                      │
└─────────────────────────────────────┘
```

### Yapı:

```tsx
// components/ProfilePanel.tsx
'use client';
import { useState, useEffect } from 'react';
import { useBadgeStore, getBadgeTier } from '@/store/badgeStore';
import BadgeDisplay from './BadgeDisplay';
import BadgeUpgradePanel from './BadgeUpgradePanel';
import LeaderboardPanel from './LeaderboardPanel';
import ReputationHistory from './ReputationHistory';
import NominationModal from './NominationModal';
import EvidenceReviewQueue from './EvidenceReviewQueue';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  networkId?: string;
}

type Tab = 'progress' | 'leaderboard' | 'history' | 'nominations';

export default function ProfilePanel({ isOpen, onClose, networkId }: ProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [showReviewQueue, setShowReviewQueue] = useState(false);

  const {
    userFingerprint, globalBadge, reputation,
    fetchReputation, fetchReputationHistory, canDoAction
  } = useBadgeStore();

  // Fetch data when panel opens
  useEffect(() => {
    if (isOpen && userFingerprint) {
      fetchReputation(userFingerprint);
      fetchReputationHistory(userFingerprint);
    }
  }, [isOpen, userFingerprint]);

  const canReview = canDoAction('verify_evidence', networkId);

  if (!isOpen) return null;

  // ... render slide-in panel
}
```

### Stil Notları:
- `position: fixed; top: 0; right: 0; bottom: 0; width: 400px; z-index: 80`
- `backgroundColor: 'rgba(5, 5, 5, 0.97)'`
- `borderLeft: '1px solid #dc2626'`
- `backdropFilter: 'blur(12px)'`
- `animation: slideInRight 0.3s ease-out`
- Overlay (sol taraf): `rgba(0,0,0,0.5)` tıklayınca kapat
- Tabs: pill style, `font-family: monospace`, `text-transform: uppercase`, `letter-spacing: 0.1em`
- Aktif tab: `backgroundColor: '#dc262615'`, `color: '#dc2626'`, `borderBottom: '2px solid #dc2626'`

### Tab İçerikleri:

1. **İlerleme (progress):** `<BadgeUpgradePanel networkId={networkId} />`
2. **Sıralama (leaderboard):** `<LeaderboardPanel networkId={networkId} compact />`
3. **Geçmiş (history):** `<ReputationHistory fingerprint={userFingerprint} compact />`
4. **Adaylık (nominations):** NominationModal'ın inline versiyonu — veya NominationModal'ı buton ile tetikle

### EvidenceReviewQueue:
- Panel alt kısmında, sadece `canReview` true ise görünsün
- Küçük bir banner: "📋 X kanıt inceleme bekliyor" → tıklayınca açılır
- Açıldığında panel genişler veya modal olarak render edilir

---

## GÖREV 3: truth/page.tsx Entegrasyonu

### Eklenecek Import'lar:

```tsx
import ProfilePanel from '@/components/ProfilePanel';
```

### Eklenecek State:

```tsx
const [showProfilePanel, setShowProfilePanel] = useState(false);
```

### UserBadge Değişikliği (satır 217-220):

Mevcut:
```tsx
<div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20, pointerEvents: 'auto' }}>
    <UserBadge />
</div>
```

Yeni:
```tsx
<div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20, pointerEvents: 'auto' }}>
    <UserBadge onProfileClick={() => setShowProfilePanel(true)} />
</div>
```

### ProfilePanel Ekleme (modals bölümüne, ~satır 660):

```tsx
{/* PROFILE PANEL — Badge, Reputation, Leaderboard */}
<ProfilePanel
    isOpen={showProfilePanel}
    onClose={() => setShowProfilePanel(false)}
    networkId={nodes[0]?.network_id}  // İlk node'un network ID'si
/>
```

---

## KRİTİK TEKNİK NOTLAR

### 1. badgeStore Kullanımı

```tsx
import { useBadgeStore, getBadgeTier, BADGE_TIERS } from '@/store/badgeStore';

// Store'dan state al:
const {
  userFingerprint,     // string — kullanıcı parmak izi
  globalBadge,         // { badge_tier, reputation_score, ... } | null
  reputation,          // { total_score, total_gained, total_lost, ... } | null
  reputationHistory,   // ReputationTransaction[]
  leaderboard,         // LeaderboardEntry[]
  isLoadingBadge,      // boolean
} = useBadgeStore();

// Actions:
const {
  initFingerprint,       // () => string — FP oluştur/oku
  fetchUserBadge,        // (fp) => void — badge çek
  fetchReputation,       // (fp) => void — reputation çek
  fetchReputationHistory,// (fp, limit?) => void
  fetchLeaderboard,      // (networkId?) => void
  canDoAction,           // (action, networkId?) => boolean
  getEffectiveTier,      // (networkId?) => BadgeTier
} = useBadgeStore();

// Tier bilgisi al:
const tier = getBadgeTier('community');
// → { id: 'community', name: 'Platform Kurdu', icon: '🐺', color: '#f59e0b', ... }
```

### 2. Tier Renkleri (Tasarım Sistemi)

| Tier | ID | İkon | Renk | Hex |
|------|-----|------|------|-----|
| Anonim | anonymous | 👤 | Gri | #6b7280 |
| Platform Kurdu | community | 🐺 | Amber | #f59e0b |
| Gazeteci | journalist | 🔍 | Mor | #8b5cf6 |
| Kurumsal | institutional | 🏛️ | Yeşil | #10b981 |

### 3. canDoAction Mapping

```tsx
canDoAction('create_network')    // Tier 3+ (journalist)
canDoAction('verify_evidence')   // Tier 2+ (community)
canDoAction('moderate')          // Tier 3+ (journalist)
canDoAction('nominate')          // Tier 2+ (community)
```

### 4. transaction_type'lar (ReputationHistory'de kullanılır)

```
evidence_submit_stake     // -5  kanıt gönderirken yatırılan
evidence_verified         // +15 kanıt doğrulanınca
evidence_disputed         // -10 kanıt reddedilince
nomination_received       // +3  aday gösterilince
moderation_confirmed      // +5  moderasyon yapınca
daily_bonus               // +1  günlük giriş
first_discovery           // +2  ilk keşif
investigation_published   // +10 soruşturma yayınlayınca
vote_correct              // +2  doğru oy
vote_wrong                // -1  yanlış oy
```

### 5. ESKİ SİSTEM — DOKUNMA!

Eski `AuthContext`, `TRUST_LEVELS`, `UserProfileModal` dosyaları hala var. Bunları **silme** — sadece UserBadge.tsx'i yeni sisteme geçir. Eski sistem auth (login/register) için hala kullanılıyor olabilir. UserBadge'de eski import'ları yeni olanlarla değiştir ama eski dosyaları bozma.

### 6. Fingerprint Mekanizması

badgeStore kendi fingerprint'ini üretiyor (localStorage + crypto random). AuthContext'in user ID'si ile karışmasın. İkisi farklı şeyler:
- `AuthContext.user.anonymous_id` → Supabase auth ile oluşan kullanıcı ID
- `badgeStore.userFingerprint` → Client-side fingerprint (anonim katkı takibi)

İdeal: İkisini birleştirmek, ama şimdilik badgeStore'un kendi fingerprint'ini kullan.

---

## STİL REHBERİ

### Genel Kurallar:
- Font: `font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`
- Arka plan: `#030303` (en koyu), `#0a0a0a` (panel), `#0f0f0f` (card)
- Border: `#333` (normal), `#dc2626` (accent), `tierColor + '40'` (tier-specific)
- Text: `#e5e5e5` (primary), `#6b7280` (secondary), `#991b1b` (muted)
- Letter spacing: `0.05em` (body), `0.1em` (labels), `0.2em` (headers)
- Animasyonlar: `transition: all 0.2s ease`, hover border glow
- **İNLİNE STYLE KULLAN** — mevcut kod tabanı inline style heavy, Tailwind class'ları mix yapma

### Animasyonlar:
```css
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(220,38,38,0.3); }
  50% { box-shadow: 0 0 20px rgba(220,38,38,0.6); }
}
```

---

## DOĞRULAMA CHECKLIST

Entegrasyon tamamlandığında kontrol et:

- [ ] UserBadge sağ üstte görünüyor, tier ikonu + reputation gösteriyor
- [ ] UserBadge'e tıklayınca ProfilePanel açılıyor (sağdan slide)
- [ ] ProfilePanel'de 4 tab çalışıyor: İlerleme / Sıralama / Geçmiş / Adaylık
- [ ] İlerleme tab'ında BadgeUpgradePanel render oluyor
- [ ] Sıralama tab'ında LeaderboardPanel render oluyor
- [ ] Geçmiş tab'ında ReputationHistory render oluyor
- [ ] Adaylık tab'ında NominationModal tetiklenebiliyor
- [ ] Tier 2+ kullanıcılar için EvidenceReviewQueue butonu/paneli görünüyor
- [ ] Panel kapatma: ✕ butonu + overlay tıklama + ESC tuşu
- [ ] `npm run build` hatasız tamamlanıyor
- [ ] Konsol'da hata yok

---

## ÖNCELİK SIRASI

1. **UserBadge.tsx yeniden yaz** (en kritik — ilk görünen şey)
2. **ProfilePanel.tsx oluştur** (ana entegrasyon noktası)
3. **truth/page.tsx güncelle** (wire-up)
4. **Test + polish** (animasyonlar, responsive, edge cases)

---

**Not:** Tüm API route'ları, store ve component'lar Opus tarafından denetlendi ve düzeltildi. DB migration başarıyla çalıştırıldı. Bu direktifteki görevler sadece UI entegrasyonu — backend'e dokunma!
