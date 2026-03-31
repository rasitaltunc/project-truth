/**
 * ═══════════════════════════════════════════════════════════════
 * ROLE & PERMISSION SYSTEM — YETKİLENDİRME TESTLERİ
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu testler platformun yetkilendirme katmanını korur.
 * Yanlış yetki = yetkisiz erişim = güvenlik ihlali.
 *
 * Testler şunu garanti eder:
 * 1. Her rol doğru izinlere sahip
 * 2. Trust level → rol eşlemesi doğru
 * 3. Observer ASLA yazma işlemi yapamaz
 * 4. Sybil savunması: yeni hesaplar düşük oy ağırlığı alır
 * 5. Gazeteciler hesap yaşından muaf
 * 6. Edge case'ler güvenli default'a düşer
 *
 * Çalıştır: npx vitest run src/lib/__tests__/roles.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, test, expect } from 'vitest';
import {
  ROLES,
  getRoleFromTrustLevel,
  hasPermission,
  getVoteWeight,
  getRoleInfo,
  canUserDo,
  type Permission,
  type UserRole,
} from '../roles';

// ═════════════════════════════════════════════════════════════
// BÖLÜM 1: getRoleFromTrustLevel — Trust Level → Rol Eşlemesi
// ═════════════════════════════════════════════════════════════

describe('getRoleFromTrustLevel', () => {
  test('trust 0 → observer', () => {
    expect(getRoleFromTrustLevel(0)).toBe('observer');
  });

  test('trust 1 → contributor', () => {
    expect(getRoleFromTrustLevel(1)).toBe('contributor');
  });

  test('trust 2 → trusted_contributor', () => {
    expect(getRoleFromTrustLevel(2)).toBe('trusted_contributor');
  });

  test('trust 3 → journalist', () => {
    expect(getRoleFromTrustLevel(3)).toBe('journalist');
  });

  test('trust 4 → admin', () => {
    expect(getRoleFromTrustLevel(4)).toBe('admin');
  });

  test('trust > 4 → admin (cap)', () => {
    expect(getRoleFromTrustLevel(99)).toBe('admin');
    expect(getRoleFromTrustLevel(100)).toBe('admin');
  });

  // GÜVENLİK: Kötü girdi → güvenli default
  test('negative → observer (güvenli default)', () => {
    expect(getRoleFromTrustLevel(-1)).toBe('observer');
    expect(getRoleFromTrustLevel(-999)).toBe('observer');
  });

  test('NaN → observer (güvenli default)', () => {
    expect(getRoleFromTrustLevel(NaN)).toBe('observer');
  });

  test('float → alt seviye (1.5 → contributor, not trusted)', () => {
    expect(getRoleFromTrustLevel(1.5)).toBe('contributor');
  });

  test('non-number type → observer', () => {
    expect(getRoleFromTrustLevel('admin' as unknown as number)).toBe('observer');
    expect(getRoleFromTrustLevel(undefined as unknown as number)).toBe('observer');
    expect(getRoleFromTrustLevel(null as unknown as number)).toBe('observer');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 2: hasPermission — İzin Kontrolü
// ═════════════════════════════════════════════════════════════

describe('hasPermission', () => {
  // Observer izinleri (sadece okuma)
  test('observer: read_network → true', () => {
    expect(hasPermission(0, 'read_network')).toBe(true);
  });

  test('observer: vote → false', () => {
    expect(hasPermission(0, 'vote')).toBe(false);
  });

  test('observer: submit_evidence → false', () => {
    expect(hasPermission(0, 'submit_evidence')).toBe(false);
  });

  test('observer: manage_users → false', () => {
    expect(hasPermission(0, 'manage_users')).toBe(false);
  });

  // Contributor izinleri
  test('contributor: vote → true', () => {
    expect(hasPermission(1, 'vote')).toBe(true);
  });

  test('contributor: create_investigation → true', () => {
    expect(hasPermission(1, 'create_investigation')).toBe(true);
  });

  test('contributor: access_editor_desk → false', () => {
    expect(hasPermission(1, 'access_editor_desk')).toBe(false);
  });

  test('contributor: approve_quarantine → false', () => {
    expect(hasPermission(1, 'approve_quarantine')).toBe(false);
  });

  // Trusted contributor izinleri
  test('trusted_contributor: review_evidence → true', () => {
    expect(hasPermission(2, 'review_evidence')).toBe(true);
  });

  test('trusted_contributor: access_editor_desk → false', () => {
    expect(hasPermission(2, 'access_editor_desk')).toBe(false);
  });

  // Journalist izinleri
  test('journalist: access_editor_desk → true', () => {
    expect(hasPermission(3, 'access_editor_desk')).toBe(true);
  });

  test('journalist: approve_quarantine → true', () => {
    expect(hasPermission(3, 'approve_quarantine')).toBe(true);
  });

  test('journalist: manage_users → false', () => {
    expect(hasPermission(3, 'manage_users')).toBe(false);
  });

  // Admin izinleri
  test('admin: manage_users → true', () => {
    expect(hasPermission(4, 'manage_users')).toBe(true);
  });

  test('admin: view_audit_log → true', () => {
    expect(hasPermission(4, 'view_audit_log')).toBe(true);
  });

  test('admin: her şeye erişir', () => {
    const allPerms: Permission[] = [
      'read_network', 'read_investigations', 'read_documents',
      'vote', 'submit_evidence', 'create_investigation', 'propose_link', 'comment',
      'review_evidence', 'access_editor_desk', 'approve_quarantine', 'nominate_journalist',
      'manage_users', 'manage_networks', 'manage_platform', 'view_audit_log',
    ];

    for (const perm of allPerms) {
      expect(hasPermission(4, perm)).toBe(true);
    }
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 3: getVoteWeight — Sybil Savunma (Oy Ağırlığı)
// ═════════════════════════════════════════════════════════════

describe('getVoteWeight', () => {
  const oneYearAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthsAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
  const oneMonthAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  test('observer → oy ağırlığı 0 (oy kullanamaz)', () => {
    expect(getVoteWeight(0, oneYearAgo)).toBe(0);
  });

  test('eski contributor (1 yıl) → tam ağırlık (1 × 1.0)', () => {
    expect(getVoteWeight(1, oneYearAgo)).toBe(1);
  });

  test('yeni contributor (dün) → çok düşük ağırlık (1 × 0.1)', () => {
    const weight = getVoteWeight(1, yesterday);
    expect(weight).toBeCloseTo(0.1, 1);
  });

  test('45 günlük contributor → orta ağırlık (1 × 0.5)', () => {
    const weight = getVoteWeight(1, oneMonthAgo);
    expect(weight).toBeCloseTo(0.5, 1);
  });

  test('journalist hesap yaşından MUAF → tam ağırlık her zaman', () => {
    const newJournalist = getVoteWeight(3, yesterday);
    const oldJournalist = getVoteWeight(3, oneYearAgo);
    // Her ikisi de 5 (journalist base weight)
    expect(newJournalist).toBe(5);
    expect(oldJournalist).toBe(5);
  });

  test('admin hesap yaşından MUAF', () => {
    expect(getVoteWeight(4, yesterday)).toBe(10);
  });

  test('trusted_contributor 6 ay → 3 × 0.9 = 2.7', () => {
    const weight = getVoteWeight(2, sixMonthsAgo);
    expect(weight).toBeCloseTo(2.7, 1);
  });

  // GÜVENLİK: Kötü tarih girdileri
  test('geçersiz tarih → age 0 → minimum çarpan', () => {
    const weight = getVoteWeight(1, 'not-a-date');
    // NaN date → accountAgeMs = 0 → accountAgeDays < 30 → multiplier 0.1
    expect(weight).toBeCloseTo(0.1, 1);
  });

  test('gelecek tarih → age 0 → minimum çarpan', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const weight = getVoteWeight(1, futureDate);
    // Future date → Math.max(0, ...) → 0 → 0.1 multiplier
    expect(weight).toBeCloseTo(0.1, 1);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 4: getRoleInfo — Lokalizasyon
// ═════════════════════════════════════════════════════════════

describe('getRoleInfo', () => {
  test('Türkçe locale', () => {
    const info = getRoleInfo(1, 'tr');
    expect(info.role).toBe('contributor');
    expect(info.name).toBe('Katkıcı');
    expect(info.description).toContain('Email');
  });

  test('English locale', () => {
    const info = getRoleInfo(3, 'en');
    expect(info.role).toBe('journalist');
    expect(info.name).toBe('Verified Journalist');
  });

  test('default locale → tr', () => {
    const info = getRoleInfo(0);
    expect(info.name).toBe('Gözlemci');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 5: ROLE REGISTRY INTEGRITY
// ═════════════════════════════════════════════════════════════

describe('ROLES registry integrity', () => {
  const allRoles: UserRole[] = ['observer', 'contributor', 'trusted_contributor', 'journalist', 'admin'];

  test('all 5 roles defined', () => {
    expect(Object.keys(ROLES)).toHaveLength(5);
    for (const role of allRoles) {
      expect(ROLES[role]).toBeDefined();
    }
  });

  test('trust levels are monotonically increasing', () => {
    const levels = allRoles.map((r) => ROLES[r].trustLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });

  test('vote weights are monotonically increasing', () => {
    const weights = allRoles.map((r) => ROLES[r].voteWeight);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1]);
    }
  });

  test('every role includes base read permissions', () => {
    for (const role of allRoles) {
      expect(ROLES[role].permissions).toContain('read_network');
      expect(ROLES[role].permissions).toContain('read_investigations');
      expect(ROLES[role].permissions).toContain('read_documents');
    }
  });

  test('higher roles include all lower role permissions (superset)', () => {
    for (let i = 1; i < allRoles.length; i++) {
      const lowerPerms = new Set(ROLES[allRoles[i - 1]].permissions);
      const higherPerms = new Set(ROLES[allRoles[i]].permissions);

      lowerPerms.forEach((perm) => {
        expect(higherPerms.has(perm)).toBe(true);
      });
    }
  });

  test('observer has NO write permissions', () => {
    const writePerms: Permission[] = [
      'vote', 'submit_evidence', 'create_investigation', 'propose_link',
      'comment', 'access_editor_desk', 'approve_quarantine', 'review_evidence',
      'nominate_journalist', 'manage_users', 'manage_networks', 'manage_platform',
    ];

    for (const perm of writePerms) {
      expect(ROLES.observer.permissions).not.toContain(perm);
    }
  });

  test('only admin has manage_* permissions', () => {
    const adminOnly: Permission[] = ['manage_users', 'manage_networks', 'manage_platform', 'view_audit_log'];

    for (const role of allRoles.filter((r) => r !== 'admin')) {
      for (const perm of adminOnly) {
        expect(ROLES[role].permissions).not.toContain(perm);
      }
    }
  });

  test('only journalist+ has editor desk access', () => {
    expect(ROLES.observer.permissions).not.toContain('access_editor_desk');
    expect(ROLES.contributor.permissions).not.toContain('access_editor_desk');
    expect(ROLES.trusted_contributor.permissions).not.toContain('access_editor_desk');
    expect(ROLES.journalist.permissions).toContain('access_editor_desk');
    expect(ROLES.admin.permissions).toContain('access_editor_desk');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 6: canUserDo — Convenience alias
// ═════════════════════════════════════════════════════════════

describe('canUserDo', () => {
  test('same as hasPermission', () => {
    expect(canUserDo(0, 'vote')).toBe(hasPermission(0, 'vote'));
    expect(canUserDo(1, 'vote')).toBe(hasPermission(1, 'vote'));
    expect(canUserDo(4, 'manage_users')).toBe(hasPermission(4, 'manage_users'));
  });
});
