/**
 * PROJECT TRUTH — Role & Permission System
 * Sprint Auth — Üç Katmanlı Kimlik Modeli
 *
 * Katman 1: Anonim Gözlemci (observer) — giriş yok, sadece okuma
 * Katman 2: Pseudonim Hesap (contributor) — email ile kayıt, oy/katkı
 * Katman 3: Doğrulanmış Gazeteci (journalist) — editör masası erişimi
 * + Admin rolü: platform yönetimi
 *
 * Trust Level Mapping:
 * 0 = observer (anonim, fingerprint only)
 * 1 = contributor (email doğrulanmış)
 * 2 = trusted_contributor (3+ kefalet, Tier 2)
 * 3 = journalist (RSF/CPJ/IFJ doğrulanmış)
 * 4 = admin (platform yöneticisi)
 */

// ═══════════════════════════════════════════
// ROLE DEFINITIONS
// ═══════════════════════════════════════════

export type UserRole = 'observer' | 'contributor' | 'trusted_contributor' | 'journalist' | 'admin';

export interface RoleDefinition {
  id: UserRole;
  trustLevel: number;
  name: { en: string; tr: string };
  description: { en: string; tr: string };
  icon: string;
  color: string;
  permissions: Permission[];
  /** Minimum account age in days for full vote weight */
  minAccountAgeDays: number;
  /** Vote weight multiplier (Sybil defense) */
  voteWeight: number;
}

// ═══════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════

export type Permission =
  // Reading
  | 'read_network'           // View network graph
  | 'read_investigations'    // View published investigations
  | 'read_documents'         // View verified documents
  // Contributing
  | 'vote'                   // Vote on proposed links/evidence
  | 'submit_evidence'        // Submit evidence to quarantine
  | 'create_investigation'   // Start new investigation
  | 'propose_link'           // Propose new connections
  | 'comment'                // Add comments/annotations
  // Journalist
  | 'access_editor_desk'     // View whistleblower submissions
  | 'approve_quarantine'     // Approve/reject quarantine items
  | 'review_evidence'        // Review evidence in queue
  | 'nominate_journalist'    // Nominate others for journalist tier
  // Admin
  | 'manage_users'           // Manage user roles
  | 'manage_networks'        // Create/edit networks
  | 'manage_platform'        // Platform settings
  | 'view_audit_log';        // View security audit logs

// ═══════════════════════════════════════════
// ROLE REGISTRY
// ═══════════════════════════════════════════

export const ROLES: Record<UserRole, RoleDefinition> = {
  observer: {
    id: 'observer',
    trustLevel: 0,
    name: { en: 'Observer', tr: 'Gözlemci' },
    description: {
      en: 'Anonymous viewer — read only, no account required',
      tr: 'Anonim gözlemci — sadece okuma, hesap gerektirmez',
    },
    icon: '👤',
    color: '#6b7280',
    permissions: ['read_network', 'read_investigations', 'read_documents'],
    minAccountAgeDays: 0,
    voteWeight: 0,
  },

  contributor: {
    id: 'contributor',
    trustLevel: 1,
    name: { en: 'Contributor', tr: 'Katkıcı' },
    description: {
      en: 'Registered with email — can vote, submit evidence, investigate',
      tr: 'Email ile kayıtlı — oy verebilir, kanıt gönderebilir, soruşturma açabilir',
    },
    icon: '✓',
    color: '#f59e0b',
    permissions: [
      'read_network', 'read_investigations', 'read_documents',
      'vote', 'submit_evidence', 'create_investigation', 'propose_link', 'comment',
    ],
    minAccountAgeDays: 0,
    voteWeight: 1,
  },

  trusted_contributor: {
    id: 'trusted_contributor',
    trustLevel: 2,
    name: { en: 'Trusted Contributor', tr: 'Güvenilir Katkıcı' },
    description: {
      en: 'Peer-nominated by 3+ members — higher vote weight, can review evidence',
      tr: '3+ üye kefaleti — yüksek oy ağırlığı, kanıt inceleyebilir',
    },
    icon: '🛡️',
    color: '#3b82f6',
    permissions: [
      'read_network', 'read_investigations', 'read_documents',
      'vote', 'submit_evidence', 'create_investigation', 'propose_link', 'comment',
      'review_evidence',
    ],
    minAccountAgeDays: 30,
    voteWeight: 3,
  },

  journalist: {
    id: 'journalist',
    trustLevel: 3,
    name: { en: 'Verified Journalist', tr: 'Doğrulanmış Gazeteci' },
    description: {
      en: 'Verified by RSF/CPJ/GIJN — editor desk access, quarantine approval',
      tr: 'RSF/CPJ/GIJN doğrulaması — editör masası erişimi, karantina onayı',
    },
    icon: '📰',
    color: '#8b5cf6',
    permissions: [
      'read_network', 'read_investigations', 'read_documents',
      'vote', 'submit_evidence', 'create_investigation', 'propose_link', 'comment',
      'review_evidence',
      'access_editor_desk', 'approve_quarantine', 'nominate_journalist',
    ],
    minAccountAgeDays: 0, // Journalists skip age requirement — verified externally
    voteWeight: 5,
  },

  admin: {
    id: 'admin',
    trustLevel: 4,
    name: { en: 'Administrator', tr: 'Yönetici' },
    description: {
      en: 'Platform administrator — full access',
      tr: 'Platform yöneticisi — tam erişim',
    },
    icon: '⚙️',
    color: '#dc2626',
    permissions: [
      'read_network', 'read_investigations', 'read_documents',
      'vote', 'submit_evidence', 'create_investigation', 'propose_link', 'comment',
      'review_evidence',
      'access_editor_desk', 'approve_quarantine', 'nominate_journalist',
      'manage_users', 'manage_networks', 'manage_platform', 'view_audit_log',
    ],
    minAccountAgeDays: 0,
    voteWeight: 10,
  },
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/** Get role from trust level — with input validation */
export function getRoleFromTrustLevel(trustLevel: number): UserRole {
  // SECURITY: Validate input — NaN, negative, non-integer all default to observer
  if (typeof trustLevel !== 'number' || isNaN(trustLevel) || trustLevel < 0) return 'observer';
  if (trustLevel >= 4) return 'admin';
  if (trustLevel >= 3) return 'journalist';
  if (trustLevel >= 2) return 'trusted_contributor';
  if (trustLevel >= 1) return 'contributor';
  return 'observer';
}

/** Check if user has a specific permission */
export function hasPermission(trustLevel: number, permission: Permission): boolean {
  const role = getRoleFromTrustLevel(trustLevel);
  return ROLES[role].permissions.includes(permission);
}

/** Get vote weight based on trust level AND account age */
export function getVoteWeight(trustLevel: number, accountCreatedAt: string): number {
  const role = getRoleFromTrustLevel(trustLevel);
  const roleDef = ROLES[role];

  // Base weight from role
  let weight = roleDef.voteWeight;

  // Account age multiplier (Sybil defense)
  // 0-30 days: 0.1x, 30-90 days: 0.5x, 90-180 days: 0.8x, 180-365 days: 0.9x, 365+: 1.0x
  const parsedDate = new Date(accountCreatedAt).getTime();
  // SECURITY: Protect against NaN dates and future dates
  const accountAgeMs = isNaN(parsedDate) ? 0 : Math.max(0, Date.now() - parsedDate);
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

  let ageMultiplier = 1.0;
  if (accountAgeDays < 30) ageMultiplier = 0.1;
  else if (accountAgeDays < 90) ageMultiplier = 0.5;
  else if (accountAgeDays < 180) ageMultiplier = 0.8;
  else if (accountAgeDays < 365) ageMultiplier = 0.9;

  // Journalists skip age multiplier — they're verified externally
  if (trustLevel >= 3) ageMultiplier = 1.0;

  return weight * ageMultiplier;
}

/** Get role definition with localized strings */
export function getRoleInfo(trustLevel: number, locale: 'en' | 'tr' = 'tr'): {
  role: UserRole;
  name: string;
  description: string;
  icon: string;
  color: string;
  voteWeight: number;
} {
  const role = getRoleFromTrustLevel(trustLevel);
  const def = ROLES[role];
  return {
    role,
    name: def.name[locale],
    description: def.description[locale],
    icon: def.icon,
    color: def.color,
    voteWeight: def.voteWeight,
  };
}

/** Check if user can perform an action (convenience) */
export function canUserDo(trustLevel: number, action: Permission): boolean {
  return hasPermission(trustLevel, action);
}
