# PROJECT TRUTH: DETAILED FEATURE COMPARISON MATRIX

**Date:** March 8, 2026
**Purpose:** Comprehensive feature-by-feature breakdown vs competitors

---

## NETWORK VISUALIZATION FEATURES

### Immersive 3D Exploration

| Feature | Truth | Gephi | Neo4j Bloom | Cytoscape | Linkurious | Maltemoto |
|---------|-------|-------|-------------|-----------|-----------|-----------|
| **3D Rendering** | ✅ WebGL (Three.js/R3F) | ⚠️ Basic 3D | ❌ 2D only | ⚠️ Basic | ❌ 2D primarily | ❌ 2D |
| **Immersive Exploration** | ✅ Camera path, orbit | ❌ Fixed views | ❌ Pan/zoom only | ❌ Pan/zoom only | ❌ Link diagram | ❌ Link diagram |
| **Node Detail Zoom** | ✅ Glow ring + focus | ⚠️ Viewport zoom | ⚠️ Viewport zoom | ⚠️ Viewport zoom | ⚠️ Zoom in | ⚠️ Zoom in |
| **Web-Native** | ✅ Browser-based | ❌ Desktop app | ✅ Web (cloud) | ⚠️ Cytoscape.js (limited) | ✅ Web | ✅ Web |
| **Real-time Collab** | ✅ Supabase realtime | ❌ Single-user | ⚠️ Limited | ❌ Single-user | ⚠️ Workspace | ⚠️ Limited |
| **Mobile Support** | ⚠️ Touch controls | ❌ Desktop only | ⚠️ Responsive | ❌ Desktop only | ⚠️ Responsive | ⚠️ Responsive |

### Layout & Analysis

| Feature | Truth | Gephi | Neo4j Bloom | Cytoscape | Linkurious |
|---------|-------|-------|-------------|-----------|-----------|
| **Force-Directed Layout** | ✅ (Dagre + custom) | ✅ Excellent | ✅ | ✅ | ✅ |
| **Hierarchical Layout** | ⚠️ Custom nodes | ✅ Advanced | ⚠️ Limited | ✅ Yes | ✅ Yes |
| **Circular/Radial** | ✅ Tier-based | ✅ Yes | ⚠️ Limited | ✅ Yes | ✅ Yes |
| **Layout Export** | ✅ Supabase JSON | ✅ GraphML, GML | ⚠️ Neo4j format | ✅ JSON, CSV | ✅ Custom |
| **Centrality Metrics** | ⚠️ Display only | ✅ Full suite | ⚠️ Limited | ✅ Full suite | ✅ Full suite |
| **Clustering** | ✅ Visual (color) | ✅ Full algorithms | ⚠️ Limited | ✅ Yes | ✅ Yes |

---

## AI & ANALYSIS FEATURES

### Conversational AI

| Feature | Truth | Pinpoint | ChatGPT | Claude | Groq Only |
|---------|-------|----------|---------|--------|-----------|
| **Network-Aware Chat** | ✅ Groq LLaMA | ⚠️ Document-focused | ❌ No graph context | ❌ No graph context | ❌ Standalone |
| **Real-time Highlighting** | ✅ Chat → 3D nodes glow | ❌ Search results only | ❌ N/A | ❌ N/A | ❌ N/A |
| **Context Preservation** | ✅ Investigation memory | ⚠️ Session-based | ⚠️ Chat history | ⚠️ Chat history | ❌ No memory |
| **Gap Analysis** | ✅ "What are we missing?" | ❌ No | ❌ No | ❌ No | ❌ No |
| **Daily Question** | ✅ AI-generated suggestion | ❌ No | ❌ No | ❌ No | ❌ No |
| **First-Person Insights** | ✅ "Talk to node X" | ❌ No | ❌ No | ❌ No | ❌ No |

### AI Integration

| Feature | Truth | Maltego | Gotham | Datashare | Aleph |
|---------|-------|---------|--------|-----------|-------|
| **Inference Engine** | ✅ Groq (open API) | ⚠️ Proprietary ML | ✅ Classified models | ⚠️ Basic NLP | ❌ No AI |
| **Named Entity Recognition** | ✅ Via Groq | ❌ Limited | ✅ Advanced | ✅ Yes | ⚠️ Basic |
| **Anomaly Detection** | ❌ (planned: Sprint 15) | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Predictive Scoring** | ❌ (planned) | ✅ Risk score | ✅ Threat score | ❌ No | ❌ No |
| **Open Model** | ✅ (LLaMA 3.3) | ❌ Proprietary | ❌ Classified | ⚠️ Closed | ❌ No |

---

## JOURNALIST PROTECTION FEATURES

### Source & Investigator Safety

| Feature | Truth | SecureDrop | OnionShare | Briar | Signal |
|---------|-------|-----------|-----------|-------|--------|
| **Anonymous Intake** | ✅ (via SecureDrop) | ✅ Gold standard | ✅ Lightweight | ✅ Decentralized | ⚠️ Not anonymous |
| **Source Protection** | ✅ (DMS) | ✅ (intake only) | ✅ (file only) | ✅ (messaging) | ⚠️ Limited |
| **Investigator Safety** | ✅ (DMS + Shield) | ❌ No | ❌ No | ❌ No | ❌ No |
| **Dead Man's Switch** | ✅ Individual | ❌ No | ❌ No | ❌ No | ❌ No |
| **Collective Protection** | ✅ Shamir's Secret | ❌ No | ❌ No | ❌ No | ❌ No |
| **Evidence Release Trigger** | ✅ Automated | ❌ Manual | ❌ Manual | ❌ Manual | ❌ N/A |
| **Cryptographic Backup** | ✅ Sealed + split keys | ⚠️ Encrypted inbox | ✅ End-to-end | ✅ Decentralized | ✅ E2E |

### Safety Infrastructure

| Feature | Truth DMS | Truth Shield | SecureDrop | OnionShare |
|---------|-----------|--------------|-----------|-----------|
| **Encryption** | ✅ AES-256-GCM | ✅ AES-256 + Shamir | ✅ GPG | ✅ AES |
| **Anonymity** | ✅ Tor-compatible | ✅ Distributed keys | ✅ Tor-native | ✅ Tor-native |
| **Check-in Reminder** | ✅ Email (Resend) | ✅ Blockchain hash | ❌ No | ❌ No |
| **Automated Trigger** | ✅ Consensus + 72h | ✅ Consensus alarm | ❌ Manual | ❌ Manual |
| **Geographic Awareness** | ✅ RSF risk scoring | ✅ Country risk | ❌ No | ❌ No |
| **Email Notification** | ✅ Journalist + Authority + Trusted | ✅ Registered users | ✅ Configured addresses | ❌ N/A |

---

## COLLABORATIVE INVESTIGATION FEATURES

### Investigation Workflow

| Feature | Truth | Datashare | Aleph | Maltego | Gotham |
|---------|-------|-----------|-------|---------|--------|
| **Investigation Objects** | ✅ Named files (Sprint 4) | ⚠️ Document folders | ⚠️ Search results | ❌ No | ❌ Compartmentalized |
| **Multi-User Editing** | ✅ Real-time (Supabase) | ⚠️ Document-level | ⚠️ Entity search | ⚠️ Limited | ⚠️ Compartmentalized |
| **Thread/Step Tracking** | ✅ Investigation steps | ⚠️ Document threads | ❌ No | ❌ No | ❌ No |
| **Comment/Discussion** | ✅ Per-step (future) | ✅ Document comments | ⚠️ Search notes | ⚠️ Annotations | ❌ No |
| **Version Control** | ✅ Supabase history | ⚠️ Document versions | ❌ No | ❌ No | ❌ No |
| **Fork/Branching** | ✅ Investigation fork (Sprint 4) | ❌ No | ❌ No | ❌ No | ❌ No |

### Community Contribution

| Feature | Truth | Aleph | Wikipedia | GitHub Issues |
|---------|-------|-------|-----------|---------------|
| **Propose Connection** | ✅ Ghost links + voting | ⚠️ Manual entity merge | ✅ Talk page | ✅ Issues/PRs |
| **Community Vote** | ✅ Tier-weighted (Sprint 10) | ❌ No | ⚠️ Talk consensus | ✅ Code review |
| **Auto-Accept** | ✅ 70% + 7-day timer | ❌ Manual admin | ⚠️ Manual consensus | ✅ Maintainer merge |
| **Evidence Staking** | ✅ Reputation (Sprint 6A) | ❌ No | ❌ No | ⚠️ Contributor rep |
| **Reward System** | ✅ Reputation tiers (Sprint 6A) | ❌ No | ❌ No | ❌ No |

---

## EVIDENCE EPISTEMOLOGY FEATURES

### Confidence Scoring

| Feature | Truth | Gephi | Neo4j | Maltego | Aleph |
|---------|-------|-------|-------|---------|-------|
| **Visible Confidence** | ✅ 0.00–1.00 (color/glow) | ❌ Attribute-agnostic | ⚠️ Label-based | ❌ Hidden | ❌ No |
| **Evidence Type Tags** | ✅ 10 types (court, leaked, etc.) | ❌ No | ❌ No | ⚠️ Source type | ❌ No |
| **Source Hierarchy** | ✅ Primary/secondary/tertiary | ⚠️ Source only | ❌ No | ⚠️ Source rating | ❌ No |
| **Evidence Count Visual** | ✅ Link thickness/glow | ❌ No | ❌ No | ❌ No | ❌ No |
| **Timeline Provenance** | ✅ Chronological evidence (Sprint 6C) | ❌ No | ❌ No | ❌ No | ❌ No |

### Verification Transparency

| Feature | Truth | Snopes | IFCN | Datashare | Merkato |
|---------|-------|--------|------|-----------|---------|
| **Verification Badge** | ✅ Official/journalist/community/unverified | ✅ Snopes rating | ✅ IFCN label | ⚠️ Source trust | ⚠️ Document rating |
| **Schema.org ClaimReview** | ✅ JSON-LD export (Sprint 6B) | ✅ Native | ✅ Native | ❌ No | ✅ Native |
| **Public Audit Trail** | ✅ GitHub + Supabase (open) | ✅ Article revision | ⚠️ Limited | ⚠️ Internal only | ⚠️ Blockchain |
| **Confidence Methodology** | ✅ Documented algorithm | ✅ Editorial guidelines | ✅ IFCN code | ❌ Proprietary | ❌ Proprietary |

---

## DATA & INTEGRATION FEATURES

### Data Sources

| Feature | Truth | Maltego | Gotham | SpiderFoot | Hunchly |
|---------|-------|---------|--------|-----------|---------|
| **Integrated Data Sources** | ⚠️ Manual + API (Aleph, Datashare) | ✅ 40+ direct | ✅ Classified | ✅ 200+ modules | ✅ Web capture |
| **Custom Data Import** | ✅ CSV/JSON + API | ✅ Transforms | ✅ Data connectors | ✅ Python modules | ❌ Browser only |
| **Real-time Sync** | ✅ Supabase webhooks | ⚠️ Scheduled | ✅ Live feeds | ⚠️ Manual refresh | ✅ Continuous capture |
| **Database Support** | ✅ Supabase (PostgreSQL) | ⚠️ Custom | ✅ Proprietary | ❌ File-based | ❌ Browser extension |

### Export & Compatibility

| Feature | Truth | Gephi | Neo4j | Cytoscape | Observable |
|---------|-------|-------|-------|-----------|-----------|
| **GraphML Export** | ✅ (Sprint 6B planned) | ✅ Native | ✅ Export | ✅ Yes | ⚠️ Manual JSON |
| **GML/SIF Format** | ✅ (Planned) | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **JSON-LD Schema.org** | ✅ ClaimReview (Sprint 6B) | ❌ No | ❌ No | ❌ No | ⚠️ Custom |
| **CSV/Spreadsheet** | ✅ Nodes + links CSV | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Visualization Export** | ✅ Flourish/Observable embeds | ✅ PNG/SVG | ✅ Neo4j Bloom | ⚠️ SVG | ✅ Web-native |
| **API Access** | ✅ PostgREST (Supabase) | ❌ Limited | ✅ Cypher API | ✅ JavaScript API | ✅ REST API |

---

## USER EXPERIENCE FEATURES

### Interface Design

| Feature | Truth | Gephi | Maltego | Datashare | Flourish |
|---------|-------|-------|---------|-----------|----------|
| **No-Code UX** | ✅ Drag-drop nodes, point-click links | ⚠️ Some code needed | ✅ Point-click | ✅ Upload + search | ✅ 4-step process |
| **Mobile-Responsive** | ⚠️ Touch controls (partial) | ❌ Desktop only | ✅ Yes | ⚠️ Limited | ✅ Yes |
| **Dark Mode** | ✅ Federal Indictment aesthetic | ⚠️ Available | ⚠️ Limited | ⚠️ Limited | ✅ Yes |
| **Onboarding Tutorial** | ✅ Cinematic opening (Sprint 10) | ⚠️ Help docs | ⚠️ Help docs | ⚠️ Minimal | ✅ Interactive |
| **Keyboard Shortcuts** | ✅ ESC, Space, arrows (Sprint 6C) | ✅ Yes | ✅ Yes | ⚠️ Limited | ❌ No |
| **Searchability** | ✅ Full-text + AI | ✅ Limited | ✅ Yes | ✅ Full-text + NLP | ✅ Tag-based |

### Investigation Modes

| Feature | Truth | Gephi | Observable |
|---------|-------|-------|-----------|
| **Full Network View** | ✅ All nodes/links | ✅ Standard | ⚠️ Manual |
| **Story Spine** | ✅ Main narrative (Sprint 7) | ❌ No | ❌ No |
| **Financial Flows** | ✅ Money nodes only (Sprint 7) | ❌ No | ❌ No |
| **Evidence Map** | ✅ Heat by research (Sprint 5) | ❌ No | ❌ No |
| **Timeline Mode** | ✅ Year-range slider (Sprint 7) | ❌ No | ⚠️ Observable animation |
| **Board/Canvas** | ✅ 2D investigation board (Sprint 8) | ✅ Basic layout | ❌ No |

---

## DEPLOYMENT & SECURITY FEATURES

### Deployment Options

| Feature | Truth | Gephi | Datashare | Maltego | SecureDrop |
|---------|-------|-------|-----------|---------|-----------|
| **Cloud Hosted** | ✅ Vercel + Supabase | ⚠️ Via plugins | ⚠️ Docker | ✅ SaaS | ⚠️ Supported hosts |
| **Self-Hosted** | ✅ Docker-ready (planned) | ✅ Desktop + server | ✅ Docker | ❌ Proprietary | ✅ Yes |
| **Air-Gapped** | ⚠️ With local Supabase | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **On-Premise** | ⚠️ Via Docker | ✅ Yes | ✅ Yes | ❌ Enterprise only | ✅ Yes |

### Security & Compliance

| Feature | Truth | Maltego | Gotham | SecureDrop | OWASP |
|---------|-------|---------|--------|-----------|-------|
| **Encryption** | ✅ AES-256 (Supabase) | ✅ TLS + data enc | ✅ Military-grade | ✅ GPG | ✅ Standards |
| **Open-Source Audit** | ✅ AGPL-3.0 (full visibility) | ❌ Proprietary | ❌ Classified | ✅ Open-source | ✅ Community audit |
| **Security Audit** | ⏳ Planned (2026) | ⚠️ Limited public | ❌ Classified | ✅ Regular | ✅ Multiple |
| **GDPR Compliance** | ✅ (Supabase compliance) | ✅ Yes | ❌ US-only | ✅ Yes | ✅ Privacy-first |
| **HIPAA/SOC2** | ⏳ Via Supabase (planned) | ✅ Yes | ✅ Yes | ⚠️ Limited | ✅ Available |

---

## PRICING COMPARISON

### Cost Model

| Tool | Model | Base Price | Team License | Enterprise |
|------|-------|-----------|--------------|-----------|
| **Truth** | Open-source + optional hosting | Free | Free (self-hosted) | Custom (future) |
| **Gephi** | Open-source | Free | Free | Free |
| **Datashare** | Open-source | Free | Free | Free |
| **SecureDrop** | Open-source (self-hosted) | Free | Free | Free |
| **Neo4j Bloom** | Freemium + enterprise | Free (cloud) | $400–1000/mo | Custom |
| **Maltego** | Subscription + modules | $3500/year | $5000–15K/year | Custom |
| **Palantir Gotham** | Enterprise perpetual license | N/A | N/A | $141K+ per core |
| **Flourish** | Freemium | Free tier | $120/mo | $3K+/year |
| **Observable** | Freemium | Free tier | $299/mo | Custom |

---

## SUMMARY: UNIQUE VALUE PROPOSITIONS

### What ONLY Truth Does

| Feature | Why It Matters | Competitors |
|---------|----------------|-------------|
| **3D AI-Driven Network Exploration** | Faster pattern discovery; immersive understanding | None |
| **Integrated Journalist Protection** | Investigator safety + evidence release automation | SecureDrop (intake) + Briar (messaging) separate |
| **Shamir's Secret Collective Shield** | No single person holds keys; proof-of-life blockchain | None (novel) |
| **Evidence Confidence Visualization** | Transparent epistemology; reader trust | Snopes/IFCN but no network integration |
| **Collaborative Link Voting** | Community consensus on connections; prevent bias | Wikipedia talk pages; no graph integration |
| **Investigation Lens System** | 5 ways to see same network (story/money/time/evidence/board) | None (panoramic analysis) |
| **Open-Source + Auditable** | Journalists trust = security through transparency | Maltego/Gotham proprietary; Datashare/Gephi separate |

---

## RECOMMENDATION

**Project Truth is the only platform combining:**

1. ✅ Immersive 3D visualization (modern UX)
2. ✅ AI conversation (faster analysis)
3. ✅ Journalist protection (safe operation)
4. ✅ Evidence epistemology (transparent methodology)
5. ✅ Open-source (auditable code)

**Market position:** *"For investigative journalists who want immersive, AI-powered, protected network investigation"*

**Competitive window:** 6–18 months before ICIJ/Neo4j/startups copy.

**Strategic focus:** Partner with Bellingcat + ICIJ early; lock in adoption before competitors emerge.

---

**Appendix:** Detailed feature comparison table created March 8, 2026. Data source: Public documentation, feature lists, pricing pages, and 60+ competitor analysis.
