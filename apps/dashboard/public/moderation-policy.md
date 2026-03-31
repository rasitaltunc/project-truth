# Moderation Policy — Project Truth

*Last updated: March 31, 2026*
*Version: 1.0*

## 1. Our Commitment

Project Truth is a platform for mapping documented connections between public figures, institutions, and events. We are committed to accuracy, transparency, and the responsible presentation of information.

We are **not** a news publisher. We are an infrastructure provider — a search and visualization engine for publicly available records. Every connection displayed on the platform must be backed by verifiable evidence.

## 2. What We Are and What We Are Not

**We are:**
- A visualization tool for documented relationships
- A community-driven verification platform
- An infrastructure for investigative transparency

**We are not:**
- A news publisher or editorial outlet
- A platform for unverified accusations
- A tool for harassment, doxxing, or vigilante action

## 3. Content Standards

### 3.1 Evidence Requirements

Every node (person, organization, event) and every link (connection) on the platform must meet one of these evidence thresholds:

| Level | Label | Requirement |
|-------|-------|-------------|
| 1 | **Verified** | Official court records, government documents, or verified institutional sources |
| 2 | **Documented** | Published investigative journalism from credible outlets, with source attribution |
| 3 | **Under Review** | Community-submitted with at least 2 independent peer reviews pending |
| 4 | **Unverified** | Clearly labeled as unverified; quarantined until reviewed |

Content that cannot meet Level 4 (no source at all) will not be displayed.

### 3.2 Language Policy

The platform uses **legally safe language** at all times:

- **Never:** "criminal", "guilty", "corrupt", "mastermind"
- **Always:** "documented connection", "alleged", "according to [source]", "court filing states"

AI-generated labels and annotations follow the same standard. If our AI cannot attribute a label to a specific source, it will not generate one.

### 3.3 Prohibited Content

The following content is prohibited and will be immediately removed:

- **Unverified accusations of criminal activity** without source attribution
- **Private information** of non-public figures (addresses, phone numbers, family members not involved in public events)
- **Victim identification** in cases of sexual assault, trafficking, or exploitation
- **Content designed to harass, threaten, or intimidate** any individual
- **Deliberately fabricated evidence** or manipulated documents
- **Content that endangers** the physical safety of any person
- **Hate speech** targeting individuals or groups based on protected characteristics

### 3.4 Special Categories

**Living individuals:** Connections involving living persons require higher evidence thresholds (Level 1 or 2 only for direct accusations).

**Minors:** No minor (under 18) will be identified by name on the platform under any circumstances, regardless of public court records. Minors are represented as anonymized codes (e.g., "Minor-DOE-001").

**Sealed records:** Information from sealed court proceedings will not be displayed. If a record is later unsealed, it enters the standard verification pipeline.

## 4. The Quarantine System

All new information enters the platform through a quarantine process:

1. **Submission** → Content is submitted (via AI scan, community contribution, or document upload)
2. **Quarantine** → Content is held in a separate queue, invisible to the public network
3. **Peer Review** → At least 2 independent reviewers (who did not submit the content) evaluate it
4. **Verification** → If approved by reviewers, content moves to the network with appropriate evidence labels
5. **Dispute** → Any user can dispute content at any time, triggering re-review

**AI-extracted content** requires 2 independent human reviews before entering the network.
**Structural data** from verified sources (court records, ICIJ databases) requires 1 review.

## 5. Dispute Resolution

### 5.1 Content Disputes

Any user can dispute any piece of information on the platform:

1. Click "Report" on any node, link, or evidence item
2. Select the dispute reason (inaccurate, outdated, lacks evidence, harmful, other)
3. Provide evidence supporting the dispute
4. The disputed item is flagged for re-review
5. A review panel (Tier 3+ users) evaluates the dispute within 72 hours

### 5.2 Subject Disputes

If you are a person or representative of an organization featured on the platform:

1. Contact us at **disputes@projecttruth.org** (or use the in-platform form)
2. Identify the specific content you dispute
3. Provide evidence or context that warrants correction
4. We will review within 5 business days
5. If the dispute is valid, content will be corrected, labeled, or removed

We take subject disputes seriously. Our goal is accuracy, not harm.

### 5.3 GDPR / Right to Erasure

For EU residents: You may request review of your personal data under GDPR Article 17. However, the right to erasure does not apply to data processed for journalistic purposes or in the public interest (GDPR Article 85). We evaluate each request individually.

Contact: **privacy@projecttruth.org**

## 6. User Conduct

### 6.1 Community Guidelines

Users of Project Truth agree to:

- **Verify before sharing.** Do not amplify unverified information.
- **Provide sources.** Every claim should include a source reference.
- **Respect the evidence hierarchy.** Do not present opinions as facts.
- **Engage constructively.** Disagree with evidence, not with people.
- **Protect vulnerable individuals.** Never identify victims or minors.

### 6.2 Reputation System

The platform uses a reputation system to incentivize accurate contributions:

- **Accurate contributions** increase reputation (+5 to +15 points)
- **Inaccurate contributions** decrease reputation (-10 to -30 points)
- **Verified disputes** reward the disputer (+10 points)
- **False disputes** decrease reputation (-5 points)

Reputation determines access to advanced features (progressive disclosure). Users with consistently low accuracy may have contribution privileges limited.

### 6.3 Account Actions

| Action | Trigger | Duration |
|--------|---------|----------|
| Warning | First minor violation | Permanent record |
| Contribution pause | Repeated inaccurate submissions | 7-30 days |
| Feature restriction | Pattern of low-quality contributions | Until reputation recovery |
| Account suspension | Deliberate fabrication or harassment | Permanent (appealable) |

## 7. AI Usage and Limitations

### 7.1 How AI Is Used

Project Truth uses AI (Groq llama-3.3-70b) for:

- **Entity extraction** from documents (names, organizations, dates, locations)
- **Relationship suggestion** between entities found in the same document
- **Chat-based investigation** (users can ask questions about network connections)
- **Intent classification** (determining which network view is most relevant)

### 7.2 AI Limitations

- AI extractions are **never** added directly to the network. All AI output enters quarantine.
- AI confidence scores are **not** self-reported. We use a post-hoc composite scoring system.
- AI can make mistakes. Every AI-generated suggestion is labeled as "AI-extracted" and requires human verification.
- AI does not make editorial decisions. It suggests; humans verify.

### 7.3 Transparency

- Every piece of AI-extracted information carries a provenance label indicating its source.
- Users can view the full extraction chain: document → AI extraction → quarantine → peer review → network.
- The AI's role is assistant, not authority.

## 8. Platform Transparency

### 8.1 What We Log

- Aggregate usage statistics (page views, feature usage)
- Error and performance monitoring (Sentry)
- Community health metrics (verification accuracy, dispute rates)

### 8.2 What We Do NOT Log

- Individual user browsing behavior within the platform
- IP addresses of anonymous observers
- Search queries (not tied to user identity)

### 8.3 Transparency Reports

We commit to publishing quarterly transparency reports including:

- Number of content disputes received and resolved
- Number of subject removal requests and outcomes
- Number of legal requests for data and our responses
- Platform health metrics (accuracy rates, quarantine statistics)

## 9. Legal Framework

Project Truth operates under AGPL-3.0 license as an open-source platform. Our legal posture:

- We are an **infrastructure provider**, not a publisher
- We display **documented connections**, not accusations
- We use **legally safe language** in all platform-generated content
- We maintain **comprehensive audit trails** for all data on the platform
- We carry **media liability insurance** for additional protection

For legal inquiries: **legal@projecttruth.org**

## 10. Changes to This Policy

This policy may be updated as the platform evolves. Material changes will be announced on the platform and in our transparency reports. The current version is always available at this URL.

## 11. Contact

- **General:** hello@projecttruth.org
- **Content disputes:** disputes@projecttruth.org
- **Privacy / GDPR:** privacy@projecttruth.org
- **Legal:** legal@projecttruth.org
- **Security:** security@projecttruth.org (for vulnerability reports)

---

*Project Truth is committed to accuracy over speed, transparency over secrecy, and verification over amplification.*
