// ============================================
// NETWORK CONTEXT BUILDER
// Converts network data to compact LLM-friendly format
// Token-efficient: ~40 nodes + 73 links ≈ 3000 tokens
// ============================================

interface ContextNode {
  id: string;
  label?: string;
  type?: string;
  tier?: number | string;
  role?: string;
  occupation?: string;
  nationality?: string;
  is_alive?: boolean;
  summary?: string;
  verification_level?: string;
  country_tags?: string[];
  evidence?: any[];
  timeline?: any[];
  connections?: any[];
}

interface ContextLink {
  source: string | { id: string };
  target: string | { id: string };
  type?: string;
  label?: string;
  description?: string;
  strength?: number;
}

const TIER_LABELS: Record<string, string> = {
  '0': 'KINGPIN',
  '1': 'MASTERMIND',
  '2': 'KEY_PLAYER',
  '3': 'CONNECTED',
  '4': 'PERIPHERAL',
  'tier1': 'MASTERMIND',
  'tier2': 'KEY_PLAYER',
  'tier3': 'CONNECTED',
};

const TYPE_LABELS: Record<string, string> = {
  person: 'PERSON',
  organization: 'ORG',
  location: 'LOCATION',
  document: 'DOCUMENT',
  event: 'EVENT',
};

/**
 * Build compact network context string for LLM consumption
 * Optimized for token efficiency while preserving all queryable info
 */
export function buildNetworkContext(
  nodes: ContextNode[],
  links: ContextLink[]
): string {
  // Build node ID → name map for link resolution
  const idToName = new Map<string, string>();
  nodes.forEach(n => idToName.set(n.id, n.label || 'Unknown'));

  // NODES section
  const nodeLines = nodes.map(n => {
    const tier = TIER_LABELS[String(n.tier)] || 'UNKNOWN';
    const type = TYPE_LABELS[n.type || 'person'] || n.type?.toUpperCase() || 'UNKNOWN';
    const parts = [
      `[${n.id}]`,
      n.label,
      `(${type}, ${tier})`,
    ];
    if (n.occupation) parts.push(`job:${n.occupation}`);
    if (n.nationality) parts.push(`nat:${n.nationality}`);
    if (n.is_alive === false) parts.push('DECEASED');
    if (n.verification_level) parts.push(`ver:${n.verification_level}`);
    if (n.country_tags?.length) parts.push(`countries:[${n.country_tags.join(',')}]`);
    if (n.role) parts.push(`role:${n.role}`);
    if (n.summary) parts.push(`summary:${n.summary.substring(0, 120)}`);
    return parts.join(' | ');
  });

  // LINKS section
  const linkLines = links.map(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    const srcName = idToName.get(sid) || sid;
    const tgtName = idToName.get(tid) || tid;
    const relType = l.type || l.label || 'associated';
    const desc = l.description ? ` — ${l.description.substring(0, 80)}` : '';
    return `${srcName} →[${relType}]→ ${tgtName}${desc}`;
  });

  // EVIDENCE SUMMARY (compact)
  const evidenceSummary = nodes
    .filter(n => n.evidence && n.evidence.length > 0)
    .map(n => {
      const evList = n.evidence!.slice(0, 3).map(e =>
        `"${e.title}" (${e.evidence_type}, ${e.verification_status})`
      ).join('; ');
      const more = n.evidence!.length > 3 ? ` +${n.evidence!.length - 3} more` : '';
      return `${n.label}: ${evList}${more}`;
    });

  // TIMELINE SUMMARY (compact)
  const timelineSummary = nodes
    .filter(n => n.timeline && n.timeline.length > 0)
    .map(n => {
      const events = n.timeline!.slice(0, 3).map(t =>
        `${t.event_date}: ${t.title}`
      ).join('; ');
      return `${n.label}: ${events}`;
    });

  return [
    `=== NETWORK: Epstein Investigation ===`,
    `Total: ${nodes.length} nodes, ${links.length} connections`,
    ``,
    `--- NODES ---`,
    ...nodeLines,
    ``,
    `--- CONNECTIONS ---`,
    ...linkLines,
    ...(evidenceSummary.length > 0 ? [
      ``,
      `--- KEY EVIDENCE ---`,
      ...evidenceSummary,
    ] : []),
    ...(timelineSummary.length > 0 ? [
      ``,
      `--- KEY TIMELINE ---`,
      ...timelineSummary,
    ] : []),
  ].join('\n');
}

/**
 * Build a focused context for a specific node and its neighbors
 * Used for follow-up questions about a specific entity
 */
export function buildFocusedContext(
  nodeId: string,
  nodes: ContextNode[],
  links: ContextLink[]
): string {
  const targetNode = nodes.find(n => n.id === nodeId);
  if (!targetNode) return '';

  // Find connected node IDs
  const connectedIds = new Set<string>();
  connectedIds.add(nodeId);

  links.forEach(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    if (sid === nodeId) connectedIds.add(tid);
    if (tid === nodeId) connectedIds.add(sid);
  });

  const relevantNodes = nodes.filter(n => connectedIds.has(n.id));
  const relevantLinks = links.filter(l => {
    const sid = typeof l.source === 'object' ? l.source.id : l.source;
    const tid = typeof l.target === 'object' ? l.target.id : l.target;
    return sid === nodeId || tid === nodeId;
  });

  return buildNetworkContext(relevantNodes, relevantLinks);
}
