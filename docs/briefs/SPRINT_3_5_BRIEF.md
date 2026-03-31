# 🎬 SPRINT 3.5 — "Karanlık Odada Fener" Polish Brief

> **Hazırlayan:** Opus (Takım Lideri / Strateji & Mimari)
> **Uygulayıcı:** Sonnet (Kod Yazıcı)
> **Tarih:** 28 Şubat 2026
> **Dosya:** `apps/dashboard/src/components/Truth3DScene.tsx`

---

## 🎯 FELSEFİ ÇERÇEVE

Bu sprint'in amacı "nuclear test" highlight'ını **sinematik bir deneyime** dönüştürmek.

### Metafor: Karanlık Odada Fener
Kullanıcı soru soruyor. Tüm ağ yavaşça loşlaşıyor — karanlık bir odaya giriyoruz.
Sonra sorgulanan kişiler ılık bir ışıkla aydınlanıyor. Alarm değil, **aydınlanma**.
Kamera bir belgesel kameramanı gibi yavaşça kayıp tüm aydınlanan kişileri çerçeveye alıyor.

### His Kuralları
- ❌ Alarm, acil durum, tehlike → ✅ Keşif, aydınlanma, farkındalık
- ❌ Anında ışınlanma → ✅ Yumuşak geçiş, sinematik kayma
- ❌ Görünmez olma (mesh.visible=false) → ✅ Hayalet: orada ama odak değil
- ❌ Hızlı yanıp sönme (3Hz) → ✅ Nefes alır gibi yavaş nabız (0.8Hz)
- ❌ Sert kırmızı (#ff0000) → ✅ Sıcak amber-kırmızı (#ff4444)

---

## 🐛 6 SORUN & ÇÖZÜM

### SORUN 1: Kamera Tek Node'a Zoom Yapıyor
**Mevcut:** `focusOnNodeExternal(nodeId)` — tek node'a zoom
**Sorun:** "Kurbanlar kimler?" → 5 kişi çıkıyor ama kamera sadece ilkine gidiyor
**Çözüm:** `focusOnNodeExternal` yerine `focusOnNodesExternal(nodeIds[])` — tüm highlighted node'ların bounding box'ını hesapla, kamerayı hepsini görecek şekilde konumlandır

### SORUN 2: Kamera Geçişi Sert
**Mevcut:** 60 frame lerp, `dir * 15 + 5` formülü
**Sorun:** Çok hızlı, çok yakın, ışınlanma hissi
**Çözüm:** 120 frame (2 saniye), bounding box tabanlı mesafe hesabı, easeInOutCubic

### SORUN 3: Kırmızı Alarm Hissi
**Mevcut:** RingGeometry(8,12) + #ff0000 + opacity 0.4±0.4 @ 3Hz
**Sorun:** Acil durum sireni gibi
**Çözüm:** Soft halo + #ff4444 + opacity 0.15±0.10 @ 0.8Hz (nefes)

### SORUN 4: Nuclear Hide (mesh.visible = false)
**Mevcut:** Highlighted olmayanlar tamamen görünmez
**Sorun:** Amatör, sert, bağlam kaybı
**Çözüm:** Animasyonlu fade: opacity 1.0 → 0.06, scale 7→4.5 (2 saniyede)

### SORUN 5: Boşluğa Tıklama Bug'ı
**Mevcut:** Container click handler kendi restore'unu yapıyor ama `highlightActive`, `glowRings`, store temizlenmiyor
**Sorun:** Yarım restore — link'ler görünür, node'lar karışık
**Çözüm:** Boşluk tıklaması `restoreAllHighlightsExternal()` çağırmalı + store clear

### SORUN 6: Link'lerin Yarım Kalması
**Mevcut:** Highlight sırasında bağlı olmayan link'ler 0.01 ama restore edilmiyor
**Sorun:** highlightActive true kalınca link'ler garip durumda
**Çözüm:** Sorun 5 ile birlikte çözülür + link'ler de animasyonlu fade olmalı

---

## 📐 TEKNİK UYGULAMA DETAYLARI

### GÖREV 1: Animasyonlu Fade Sistemi (En Kritik)

Yeni bir animasyon sistemi lazım. Mevcut highlight fonksiyonu anında değişiklik yapıyor.
Bunun yerine **frame-by-frame animasyon** olacak.

#### Yeni Değişkenler (glowRings tanımının yanına ekle):
```typescript
const glowRings: THREE_TYPES.Mesh[] = [];
let highlightActive = false;

// YENİ: Animasyon sistemi
let highlightAnimation: {
  active: boolean;
  progress: number;        // 0 → 1
  duration: number;        // frame sayısı
  targetNodeIds: Set<string>;
  targetLinkIds: Set<string>;
  phase: 'dimming' | 'glowing' | 'complete';
} | null = null;
```

#### `highlightNodesExternal` Yeniden Yazımı:
```typescript
const highlightNodesExternal = (nodeIds: string[], linkIds: string[]) => {
    const nodeSet = new Set(nodeIds);
    const linkSet = new Set(linkIds);
    const hasHighlights = nodeIds.length > 0;

    highlightActive = hasHighlights;

    // Eski glow ring'leri temizle
    glowRings.forEach(ring => scene.remove(ring));
    glowRings.length = 0;

    if (!hasHighlights) {
        // Restore — animasyonsuz direkt dön
        // (restoreAllHighlightsExternal zaten bunu yapıyor)
        return;
    }

    // Animasyon başlat
    highlightAnimation = {
        active: true,
        progress: 0,
        duration: 120,  // 2 saniye @ 60fps
        targetNodeIds: nodeSet,
        targetLinkIds: linkSet,
        phase: 'dimming',
    };

    // Auto-rotate durdur
    controls.autoRotate = false;
};
```

#### Animate Loop'a Eklenecek Bölüm (glow rings pulse'dan ÖNCE):
```typescript
// ═══ HIGHLIGHT ANIMATION ═══
if (highlightAnimation && highlightAnimation.active) {
    highlightAnimation.progress++;
    const p = Math.min(highlightAnimation.progress / highlightAnimation.duration, 1);
    const t = easeInOutCubic(p);

    const nodeSet = highlightAnimation.targetNodeIds;
    const linkSet = highlightAnimation.targetLinkIds;

    // --- NODE ANIMASYONU ---
    nodeMeshes.forEach(mesh => {
        const nid = mesh.userData.id;
        const isHighlighted = nodeSet.has(nid);
        const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;

        if (isHighlighted) {
            // Highlighted: normal → büyük + parlak
            mat.opacity = 1;
            const scaleX = 7 + t * 4;       // 7 → 11
            const scaleY = 8.75 + t * 5;    // 8.75 → 13.75
            mesh.scale.set(scaleX, scaleY, 1);
        } else {
            // Dimmed: normal → hayalet
            mat.opacity = 1 - t * 0.94;     // 1.0 → 0.06
            const scaleX = 7 - t * 2.5;     // 7 → 4.5
            const scaleY = 8.75 - t * 3.125; // 8.75 → 5.625
            mesh.scale.set(scaleX, scaleY, 1);
        }
        mat.needsUpdate = true;
    });

    // --- GLOW HALO ANIMASYONU ---
    scene.traverse((child: any) => {
        if (child.userData.isGlow) {
            const isHighlighted = child.userData.nodeId && nodeSet.has(child.userData.nodeId);
            if (child.material) {
                if (isHighlighted) {
                    child.material.opacity = (child.userData.originalOpacity || 0.15) * (1 + t * 2);
                } else {
                    child.material.opacity = (child.userData.originalOpacity || 0.15) * (1 - t * 0.9);
                }
            }
        }
    });

    // --- LINK ANIMASYONU ---
    scene.traverse((child: any) => {
        if (child.userData.isLink && child.material) {
            const sid = child.userData.sourceId;
            const tid = child.userData.targetId;
            const bothHighlighted = nodeSet.has(sid) && nodeSet.has(tid);
            const oneHighlighted = nodeSet.has(sid) || nodeSet.has(tid);

            let targetOpacity: number;
            if (bothHighlighted) {
                targetOpacity = 0.7;   // İki ucu da parlayan: parlak
            } else if (oneHighlighted) {
                targetOpacity = 0.12;  // Bir ucu parlayan: soluk görünür
            } else {
                targetOpacity = 0.02;  // Hiçbiri: neredeyse görünmez
            }

            const currentOpacity = child.material.opacity;
            child.material.opacity = currentOpacity + (targetOpacity - currentOpacity) * t;
        }
    });

    // --- linkLines (animate loop'un kullandığı array) da güncelle ---
    // Bu gerekli çünkü linkLines forEach ayrı referans tutuyor
    // highlightActive=true olduğu için zaten pulse yapmıyor

    // --- GLOW RING OLUŞTURMA (animasyon %30'a ulaştığında) ---
    if (highlightAnimation.phase === 'dimming' && p >= 0.3) {
        highlightAnimation.phase = 'glowing';

        // Highlighted node'lar için glow ring oluştur
        nodeMeshes.forEach(mesh => {
            if (nodeSet.has(mesh.userData.id)) {
                // Soft halo — RingGeometry yerine daha büyük, daha yumuşak
                const ringGeo = new THREE.RingGeometry(5, 9, 48);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xff4444,          // Sıcak amber-kırmızı
                    transparent: true,
                    opacity: 0,               // 0'dan başla, animate loop büyütecek
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.copy(mesh.position);
                ring.lookAt(camera.position);
                ring.userData.isGlowRing = true;
                ring.userData.phase = Math.random() * Math.PI * 2;
                scene.add(ring);
                glowRings.push(ring);
            }
        });
    }

    // Animasyon tamamlandı
    if (p >= 1) {
        highlightAnimation.phase = 'complete';
        highlightAnimation.active = false;
    }
}
```

#### Glow Ring Pulse Güncellemesi (mevcut animate loop'taki):
```typescript
// ═══ PULSE GLOW RINGS (AI Highlights) ═══
glowRings.forEach(ring => {
    if (ring.parent) {
        const mat = ring.material as THREE_TYPES.MeshBasicMaterial;
        const phase = ring.userData.phase || 0;
        // ESKI: mat.opacity = 0.4 + Math.sin(elapsed * 3 + phase) * 0.4;
        // YENİ: Nefes alır gibi yavaş nabız (0.8Hz = elapsed * 0.8 * 2π ≈ elapsed * 5.0)
        // Aslında 0.8Hz → periyot 1.25s → elapsed * (2π/1.25) ≈ elapsed * 5.03
        // Ama biz elapsed * 1.6 kullanacağız (daha sakin, ~0.25Hz)
        mat.opacity = 0.15 + Math.sin(elapsed * 1.6 + phase) * 0.10;
        // Yavaş rotasyon
        ring.rotation.z = elapsed * 0.2 + phase;
        // Kameraya bak
        ring.lookAt(camera.position);
    }
});
```

---

### GÖREV 2: Kamera — Tüm Node'ları Çerçevele

#### `focusOnNodeExternal` → `focusOnNodesExternal` Dönüşümü:

Mevcut `focusOnNodeExternal` fonksiyonunu SİL ve yerine şunu koy:

```typescript
const focusOnNodesExternal = (nodeIds: string[]) => {
    if (nodeIds.length === 0) return;

    // Highlighted node'ların pozisyonlarını topla
    const positions: THREE_TYPES.Vector3[] = [];
    nodeMeshes.forEach(mesh => {
        if (nodeIds.includes(mesh.userData.id)) {
            positions.push(mesh.position.clone());
        }
    });

    if (positions.length === 0) return;

    // Bounding box merkezi hesapla
    const center = new THREE.Vector3();
    positions.forEach(p => center.add(p));
    center.divideScalar(positions.length);

    // En uzak node'a olan mesafeyi bul (radius)
    let maxDist = 0;
    positions.forEach(p => {
        const d = p.distanceTo(center);
        if (d > maxDist) maxDist = d;
    });

    // Kamera mesafesi: radius'a göre ayarla
    // Tek node → yakın (20 birim), çok node → uzak (radius * 2.5 + 20)
    const cameraDistance = Math.max(25, maxDist * 2.5 + 20);

    // Kamera pozisyonu: merkeze göre biraz yukarıdan ve yandan
    const dir = center.clone().normalize();
    // Eğer center origin'e çok yakınsa, varsayılan yön kullan
    if (dir.length() < 0.1) dir.set(1, 0.5, 1).normalize();

    const targetCamPos = new THREE.Vector3(
        center.x + dir.x * cameraDistance * 0.7,
        center.y + cameraDistance * 0.4,
        center.z + dir.z * cameraDistance * 0.7
    );
    const targetLookAt = center.clone();

    // Smooth kamera animasyonu
    const startCamPos = camera.position.clone();
    const startLookAt = controls.target.clone();

    let progress = 0;
    const duration = 120; // 2 saniye — sinematik hız

    const animateZoom = () => {
        progress++;
        const t = easeInOutCubic(Math.min(progress / duration, 1));

        camera.position.lerpVectors(startCamPos, targetCamPos, t);
        controls.target.lerpVectors(startLookAt, targetLookAt, t);
        controls.update();

        // Glow ring'ler kameraya baksın
        glowRings.forEach(ring => ring.lookAt(camera.position));

        if (progress < duration) {
            requestAnimationFrame(animateZoom);
        }
    };
    animateZoom();
};
```

#### Engine API Güncelleme:

Engine return objesinde:
```typescript
// ESKİ:
focusOnNode: focusOnNodeExternal,
// YENİ:
focusOnNode: focusOnNodeExternal,      // Geriye uyumluluk (tek node)
focusOnNodes: focusOnNodesExternal,    // YENİ: çoklu node
```

`focusOnNodeExternal`'ı da güncelle — artık `focusOnNodesExternal([nodeId])` çağırsın:
```typescript
const focusOnNodeExternal = (nodeId: string) => {
    focusOnNodesExternal([nodeId]);
};
```

---

### GÖREV 3: Boşluğa Tıklama Fix

Container click handler'da (satır 470-491), `nodeHits.length === 0 && linkHits.length === 0` bloğunu şu şekilde güncelle:

```typescript
if (nodeHits.length === 0 && linkHits.length === 0) {
    // Cinematic mode'dan çık
    if (cinematic.active) {
        console.log('🎬 EMPTY SPACE CLICK → EXIT CINEMATIC');
        endCinematicMode();
    }

    // AI Highlight aktifse → restore et
    if (highlightActive) {
        console.log('🎯 EMPTY SPACE CLICK → RESTORE HIGHLIGHTS');
        restoreAllHighlightsExternal();
        // Store'daki highlight'ları da temizle
        // NOT: Bu dışarıdan gelecek, aşağıdaki onEmptyClick callback ile
    }

    // Notify parent to close side panel AND clear highlights
    if (onCinematicEndRef.current) onCinematicEndRef.current();
}
```

**AYRICA** — `restoreAllHighlightsExternal`'a animasyonlu geri dönüş ekle:

```typescript
const restoreAllHighlightsExternal = () => {
    // Eğer highlight animasyonu devam ediyorsa, durdur
    if (highlightAnimation) {
        highlightAnimation.active = false;
        highlightAnimation = null;
    }

    // Animasyonlu restore başlat
    let restoreProgress = 0;
    const restoreDuration = 90; // 1.5 saniye

    const animateRestore = () => {
        restoreProgress++;
        const t = easeInOutCubic(Math.min(restoreProgress / restoreDuration, 1));

        // Node'ları yavaşça geri getir
        nodeMeshes.forEach(mesh => {
            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
            // Mevcut opacity'den 1'e doğru
            mat.opacity = mat.opacity + (1 - mat.opacity) * t;
            // Mevcut scale'den normale doğru
            const currentScaleX = mesh.scale.x;
            const currentScaleY = mesh.scale.y;
            mesh.scale.set(
                currentScaleX + (7 - currentScaleX) * t,
                currentScaleY + (8.75 - currentScaleY) * t,
                1
            );
            mat.needsUpdate = true;
        });

        // Glow ring'leri söndür
        glowRings.forEach(ring => {
            const mat = ring.material as THREE_TYPES.MeshBasicMaterial;
            mat.opacity = mat.opacity * (1 - t);
        });

        // Link'leri geri getir
        scene.traverse((child: any) => {
            if (child.userData.isLink && child.material) {
                child.material.opacity = child.material.opacity + (0.3 - child.material.opacity) * t;
            }
            if (child.userData.isGlow && child.material) {
                child.material.opacity = child.material.opacity + ((child.userData.originalOpacity || 0.15) - child.material.opacity) * t;
            }
        });

        if (restoreProgress < restoreDuration) {
            requestAnimationFrame(animateRestore);
        } else {
            // Animasyon bitti — final temizlik
            glowRings.forEach(ring => scene.remove(ring));
            glowRings.length = 0;
            highlightActive = false;
            controls.autoRotate = true;

            // Kesin değerleri set et (kümülatif lerp hatalarını düzelt)
            nodeMeshes.forEach(mesh => {
                const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                mat.opacity = 1;
                mesh.scale.set(7, 8.75, 1);
                mat.needsUpdate = true;
            });
            scene.traverse((child: any) => {
                if (child.userData.isGlow && child.material) {
                    child.visible = true;
                    child.material.opacity = child.userData.originalOpacity || 0.15;
                }
            });
        }
    };
    animateRestore();

    console.log('🎯 HIGHLIGHT: Animated restore started');
};
```

---

### GÖREV 4: Highlight useEffect Güncelleme

Mevcut useEffect'te `focusOnNode` çağrısı `focusOnNodes`'a değişmeli:

```typescript
useEffect(() => {
    const nodeIds = highlightNodeIds ?? [];
    const linkIds = highlightLinkIds ?? [];

    if (nodeIds.length > 0) {
        if (!engineRef.current) {
            pendingHighlightRef.current = { nodeIds, linkIds, focusId: focusNodeId ?? null };
            return;
        }
        engineRef.current.highlightNodes(nodeIds, linkIds);
        // Tüm highlighted node'lara zoom (tek node'a değil)
        setTimeout(() => {
            engineRef.current?.focusOnNodes(nodeIds);
        }, 300);
    } else {
        pendingHighlightRef.current = null;
        if (engineRef.current) {
            engineRef.current.restoreAllHighlights();
        }
    }
}, [highlightNodeIds, highlightLinkIds, focusNodeId]);
```

**Pending highlight'ta da aynı:**
```typescript
// Engine init sonrasında:
if (pendingHighlightRef.current) {
    const { nodeIds, linkIds } = pendingHighlightRef.current;
    engineRef.current.highlightNodes(nodeIds, linkIds);
    setTimeout(() => {
        engineRef.current?.focusOnNodes(nodeIds);
    }, 300);
    pendingHighlightRef.current = null;
}
```

---

### GÖREV 5: Boşluğa Tıklama → Store Clear

`page.tsx`'te `onCinematicEnd` callback'inde `clearHighlights()` çağrılıyor mu kontrol et.
Mevcut:
```typescript
onCinematicEnd={() => { setActiveLinkDetail(null); }}
```

Bunu güncelle:
```typescript
onCinematicEnd={() => {
    setActiveLinkDetail(null);
    clearHighlights();  // Chat highlight'larını da temizle
}}
```

---

### GÖREV 6: Console Log'ları Temizle

Tüm `console.log('🎯 ...')` satırlarını sil veya `// console.log(...)` yap.
NUCLEAR TEST log'larını kesinlikle sil.
Sadece hata durumları için `console.warn` bırak.

---

## ✅ TEST PLANI

1. **Temel Test:** "Kurbanlar kimler?" sor →
   - 5 kişi yavaşça parlasın (2 saniye fade)
   - Diğerleri hayalet olsun (opacity 0.06)
   - Kamera tüm 5 kişiyi çerçeveye alsın (ışınlanma YOK)
   - Glow ring'ler nefes alır gibi nabız atsın (yavaş)

2. **Tek Kişi:** "Jeffrey Epstein hakkında ne biliyorsun?" →
   - Sadece 1 kişi parlasın
   - Kamera yakın zoom (ama smooth)

3. **Boşluk Tıklama:** Highlight aktifken boşluğa tıkla →
   - Her şey yavaşça normale dönsün (1.5 saniye)
   - Glow ring'ler yavaşça sönsün
   - Node'lar orijinal boyut ve opacity'ye dönsün
   - Auto-rotate tekrar başlasın

4. **Ardışık Sorgu:** Önce "kurbanlar" sonra "siyasetçiler" →
   - Önceki highlight temizlensin
   - Yeni highlight başlasın
   - Geçiş smooth olsun

5. **TypeScript:** `npx tsc --noEmit` geçmeli

---

## 🔧 ÖZET: NE DEĞİŞECEK

| Fonksiyon | Değişiklik |
|-----------|-----------|
| `highlightNodesExternal` | Animasyon sistemi ile yeniden yazılacak |
| `focusOnNodeExternal` | `focusOnNodesExternal` wrapper olacak |
| YENİ: `focusOnNodesExternal` | Bounding box hesabı + 2s smooth zoom |
| `restoreAllHighlightsExternal` | Animasyonlu geri dönüş (1.5s) |
| Glow ring pulse (animate loop) | 3Hz→0.25Hz, 0.4±0.4→0.15±0.10, #ff0000→#ff4444 |
| YENİ: highlight animation (animate loop) | Frame-by-frame fade/glow sistemi |
| Container click handler | `restoreAllHighlightsExternal()` çağıracak |
| page.tsx onCinematicEnd | `clearHighlights()` eklenecek |
| useEffect (highlight) | `focusOnNode` → `focusOnNodes(nodeIds)` |
| Console log'lar | Temizlenecek |

---

## ⚠️ DİKKAT EDİLECEKLER

1. `highlightAnimation` animate loop'ta her frame çalışacak — performans kritik. `scene.traverse` yerine önceden cache'lenmiş referanslar tercih et.
2. `restoreAllHighlightsExternal` animasyonu sırasında yeni highlight gelirse, önceki animasyonu iptal et.
3. `easeInOutCubic` fonksiyonu zaten dosyada var, yeni yazmaya gerek yok.
4. `THREE` dynamic import — tüm THREE referansları async init bloğunun içinde olmalı.
5. Engine return objesine `focusOnNodes` eklenecek — TypeScript interface'ini de güncelle.
