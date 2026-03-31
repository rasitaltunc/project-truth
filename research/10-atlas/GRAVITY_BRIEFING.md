# 🦁 PROJECT TRUTH - TEKNİK BRİFİNG

> **Tarih:** 13 Şubat 2026
> **Hazırlayan:** Claude (Opus)
> **Alıcı:** Gravity (veya yeni katılan geliştirici)
> **Konu:** 3D Visualization Engine Sorunu + Proje Durumu

---

## 📋 PROJE ÖZET

**PROJECT TRUTH**, karmaşık ilişki ağlarını (Epstein dosyası gibi) 3D görselleştirme ile sunan bir araştırma platformu. Monorepo yapısında, Next.js 16 + React 19 + Three.js stack kullanıyor.

### Vizyon
> "Parçalanmış bilgiyi anlamlı bütüne dönüştürmek. İnsanların yalnızca olayları okumadığı, aynı zamanda bağlantıları görebildiği yeni nesil bir kamusal zeka altyapısı."

### Mevcut Durum
- ✅ Database: Supabase (15 node, 19 link - Epstein ağı)
- ✅ API: `/api/truth` - Düzgün çalışıyor
- ✅ UI Komponentleri: Tamamı çalışıyor (ArchiveModal, UserBadge, FollowTheMoneyPanel, etc.)
- ✅ Ingestion Pipeline: CourtListener + Google Vision OCR entegrasyonu hazır
- ❌ **3D Visualization: ÇALIŞMIYOR** (Bu briefing'in ana konusu)

---

## 🔴 MEVCUT SORUN: 3D Sahne Donması

### Belirtiler
- Sayfa açıldığında "LOADING..." ekranında kalıyor
- Chrome "Sayfa Yanıt Vermiyor" uyarısı veriyor
- Tarayıcı tamamen donuyor, hard refresh bile yapmıyor

### Test Sonuçları

| Test | Sonuç | Çıkarım |
|------|-------|---------|
| `DEBUG_DISABLE_3D = true` (3D yok, sadece UI) | ✅ Çalışıyor | API ve UI sorunsuz |
| Vanilla Three.js test sayfası (`/test3d`) | ✅ Çalışıyor | WebGL + Three.js çalışıyor |
| React Three Fiber (R3F) ile Canvas | ❌ Donuyor | **R3F sorunu** |
| Vanilla Three.js komponenti (`Truth3DScene.tsx`) | ❌ Donuyor | Entegrasyon sorunu? |

### Kritik Bulgu
**Vanilla Three.js direkt kullanıldığında (ayrı sayfa) çalışıyor, ama aynı kod komponente sarılınca donuyor.**

---

## 🔧 DENENEN ÇÖZÜMLER

### 1. Turbopack → Webpack Geçişi
```json
// package.json
"dev": "next dev --webpack"
```
**Sonuç:** Turbopack cache corruption çözüldü ama 3D hâlâ donuyor.

### 2. Dynamic Import + SSR Disable
```typescript
const Truth3DScene = dynamic(
  () => import('@/components/Truth3DScene'),
  { ssr: false }
);
```
**Sonuç:** SSR hatası gitti ama 3D hâlâ donuyor.

### 3. R3F → Vanilla Three.js Geçişi
`Truth3DScene.tsx` komponenti tamamen Vanilla Three.js ile yazıldı (R3F yok).
**Sonuç:** Yine donuyor.

### 4. Minimal Canvas Testi
Sadece bir küp ve grid ile en basit Canvas.
**Sonuç:** Yine donuyor.

### 5. İzole Test Sayfası (`/test3d`)
Tamamen ayrı sayfa, hiçbir başka komponent yok.
```typescript
// Vanilla Three.js - Çalışıyor!
const THREE = await import('three');
const scene = new THREE.Scene();
// ... renderer, cube, animate loop
```
**Sonuç:** ✅ ÇALIŞIYOR!

---

## 🧩 KULLANILAN TEKNOLOJİLER

```json
{
  "next": "16.1.6",
  "react": "19.2.3",
  "three": "^0.182.0",
  "@react-three/fiber": "^9.5.0",
  "@react-three/drei": "^10.7.7"
}
```

### Ortam
- **OS:** macOS 14.0 (Sonoma)
- **CPU:** Apple M2
- **Browser:** Chrome 144
- **WebGL:** Hardware Accelerated ✅
- **GPU:** ANGLE Metal Renderer

---

## 📁 İLGİLİ DOSYALAR

### Ana Sayfa
```
/apps/dashboard/src/app/truth/page.tsx
```
- 900+ satır
- R3F komponentleri (Scene, NodeCard, ConnectionLine, etc.)
- DEBUG_DISABLE_3D ve DEBUG_MINIMAL_3D flag'leri

### Vanilla Three.js Komponenti
```
/apps/dashboard/src/components/Truth3DScene.tsx
```
- ~350 satır
- R3F kullanmıyor, direkt Three.js
- OrbitControls ile kamera kontrolü
- Node kartları, bağlantı çizgileri, raycaster click detection

### Test Sayfası (ÇALIŞIYOR)
```
/apps/dashboard/src/app/test3d/page.tsx
```
- ~100 satır
- Minimal Vanilla Three.js implementasyonu
- Dönen kırmızı küp + status bar

### API
```
/apps/dashboard/src/app/api/truth/route.ts
```
- Supabase'den node ve link çekiyor
- ✅ Düzgün çalışıyor

---

## 🎯 TAHMİNLER VE HİPOTEZLER

### Hipotez 1: React 19 Uyumsuzluğu
React 19 yeni ve R3F tam uyumlu olmayabilir. Ama Vanilla Three.js komponenti de çalışmıyor, bu yüzden R3F değil sorun.

### Hipotez 2: Sonsuz Loop / Memory Leak
`truth/page.tsx` içinde bir yerde sonsuz loop veya memory leak olabilir. `useEffect` dependency'leri kontrol edilmeli.

### Hipotez 3: OrbitControls Import Sorunu
```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
```
Bu import Next.js ile sorun çıkarabiliyor.

### Hipotez 4: Zustand Store Conflict
`useStore` hook'u 3D sahne mount edilirken conflict oluşturuyor olabilir.

### Hipotez 5: Container Size Sorunu
`containerRef.current.clientWidth` veya `clientHeight` 0 dönüyorsa renderer düzgün başlatılamaz.

---

## 🚀 ÖNERİLEN SONRAKI ADIMLAR

### Acil (Debug)
1. `Truth3DScene.tsx` içine daha fazla console.log ekle - hangi satırda takılıyor?
2. Container size'ı kontrol et (width/height 0 mı?)
3. OrbitControls'u kaldırıp dene
4. `truth/page.tsx`'teki diğer useEffect'leri geçici olarak devre dışı bırak

### Orta Vadeli
1. React 18'e downgrade dene
2. R3F'i tamamen kaldır, sadece Vanilla Three.js kullan
3. 3D sahneyi tamamen ayrı bir iframe'e taşı

### Uzun Vadeli
1. WebGL Worker thread'e taşı (OffscreenCanvas)
2. WASM tabanlı renderer düşün (Bevy, etc.)

---

## 💡 NOTLAR

- **Raşit Altunç** (Patron): Projenin kurucusu, vizyon sahibi
- **"Feature Creep" Riski**: Gemini ile yapılan analizde GraphRAG, Hunter, Oracle modülleri tartışıldı - öncelik GraphRAG'e verilmeli
- **Maliyet**: 3.5M sayfa Epstein belgesi işlemek için ~$1,500-2,000 bütçe öngörülüyor (5 aşamalı pipeline ile)

---

## 📞 İLETİŞİM

```
Raşit Altunç
rasitaltunc@gmail.com
```

---

**Son Güncelleme:** 13 Şubat 2026, 22:30
**Durum:** 3D Visualization blocker devam ediyor

> *"Yapacağız. Her şey güzel olacak."* 🦁
