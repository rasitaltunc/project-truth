# Zero-Knowledge Professional Verification — Quick Reference Guide
## For Truth Platform Implementation

**Last Updated:** March 22, 2026
**For:** Raşit + Development Team
**Status:** Ready to implement

---

## TL;DR

**Can you verify someone is a journalist WITHOUT storing their identity?**

✅ **YES.** Technology exists today. Recommended approach:

```
SecureDrop (anonymous tips)
    ↓
W3C VC 2.0 + Polygon ID (journalist proves credential)
    ↓
Pseudonym System (reputation accumulates anonymously)
    ↓
Result: Verified journalist, anonymous contributor
```

**Timeline:** 8 weeks to launch
**Cost:** $5-25K
**Privacy:** Maximum (zero PII storage)
**Risk:** Low (proven technologies)

---

## 1. IMPLEMENT FIRST (This Week)

### Option A: Polygon ID (Recommended for Speed)

**What:** Journalist generates cryptographic proof of credentials without revealing identity

**Setup (4 hours):**
```
1. Create Truth Platform DID: did:polygonid:...
2. Request DIDs from 3 partner journalist associations
3. Integrate Polygon ID SDK (npm install @0xpolygonid/...)
4. Test credential issuance on Mumbai testnet

Code sketch:
  const PolygonID = require('@0xpolygonid/js-sdk');
  const proof = await PolygonID.generateProof({
    credential: journalistVC,
    statement: "I am a journalist"
  });
  const verified = await verifyProof(proof);
```

**Cost:** $2K
**Learn:** https://docs.privado.id/
**Time to first working version:** 8 hours

### Option B: W3C VC 2.0 (Most Standard-Compliant)

**What:** Standardized credential format that any issuer/verifier can use

**Setup (4 hours):**
```
1. Create issuer DID (use did:key or did:web)
2. Design credential schema (JSON-LD)
3. Sign credentials (EdDSA signature)
4. Verify signatures on Truth Platform

Code sketch:
  const vc = {
    "@context": "https://www.w3.org/2018/credentials/v1",
    "type": ["VerifiableCredential", "JournalistCredential"],
    "issuer": "did:example:swedjournalists",
    "credentialSubject": {
      // NO IDENTITY HERE - just attributes
      "profession": "Journalist",
      "active": true
    },
    "proof": { /* issuer's signature */ }
  };
```

**Cost:** $1K
**Learn:** https://www.w3.org/TR/vc-overview/
**Time to first working version:** 6 hours

### Option C: IRMA (Most Private)

**What:** Selective disclosure—reveal only "journalist" attribute, nothing else

**Setup (2 hours):**
```
1. Partner journalist association creates IRMA credential
2. Journalist installs IRMA wallet (mobile app)
3. Platform requests: "Are you a journalist?"
4. Journalist's wallet reveals ONLY: yes

Platform learns: Journalist status verified
Platform learns NOT: Name, license number, expiry, country
```

**Cost:** $0 (open-source)
**Learn:** https://credentials.github.io/docs/irma.html
**Time to first working version:** 4 hours
**Limitation:** Requires issuer cooperation (not mainstream yet)

---

## 2. ADD SECOND (Week 2)

### Idena: Proof of Personhood (Sybil Resistance)

**Why:** Prevents one person from creating multiple journalist accounts

**What:** Monthly human validation ceremony (flip tests—images hard for bots)

**Setup (2 hours):**
```
1. Verify journalist has passed Idena ceremony
2. Query Idena API: isPersonVerified(address)
3. Require BOTH Idena proof + journalist credential

Result: One person = one verified journalist account
```

**Cost:** $0
**Learn:** https://www.idena.io/
**Added benefit:** Protects entire platform against Sybil attacks

### Idena + Polygon ID Combined

```
Journalist workflow:
  1. Pass Idena ceremony (monthly)     → Proof of one human
  2. Request journalist credential     → From journalist association
  3. Generate Polygon ID proof         → Proves credential without revealing identity
  4. Contribute to Truth Platform      → Verified human + verified journalist + anonymous

Platform benefit: Strongest Sybil resistance + highest privacy
```

---

## 3. ANONYMOUS REPUTATION (Build Parallel)

**Problem:** How to accumulate reputation WITHOUT revealing identity?

**Solution:** One-time pseudonym per action

```
Action 1:
  - Generate keypair: (pub1, priv1)
  - Sign contribution with priv1
  - Platform stores reputation under hash(pub1)
  - Reputation: +5 points → pseudonym1_hash

Action 2:
  - Generate NEW keypair: (pub2, priv2)
  - Sign contribution with priv2
  - Platform stores reputation under hash(pub2)
  - Reputation: +3 points → pseudonym2_hash

But same user keeps using pseudonym1 for reputation accumulation:
  - Action 3: Sign with priv1 again
  - Platform adds reputation to pseudonym1_hash
  - User's reputation persists if they keep the same pseudonym

If user switches to new pseudonym:
  - All reputation left behind
  - Prevents switching to escape bad reputation
  - Detects Sybil (many pseudonyms from same identity)
```

**Database:**
```sql
CREATE TABLE reputation_ledger (
  action_id UUID,
  pseudonym_hash BYTEA,     -- Hash of public key (changes per action if user wants)
  action_type VARCHAR(50),  -- "evidence_submitted", etc.
  reputation_delta INTEGER, -- +5, -2, etc.
  created_hour TIMESTAMP    -- 2026-03-22T14:00:00Z (hour granularity, no exact minute)

  -- NO: user_id, name, email, IP, session_id, fingerprint
);
```

**Privacy guarantee:** Platform sees reputation trends, NOT identity

---

## 4. MINIMUM DATA ARCHITECTURE

**Core principle:** Don't store identity. Store only proofs.

```
STORES:
  ✅ Credential proofs (from issuer)
  ✅ Issuer signatures (verification key)
  ✅ Credential expiry dates
  ✅ Pseudonym hashes (one-way, cannot reverse)
  ✅ Reputation scores (pseudonymous)
  ✅ Hour-granular timestamps (not minute-precise)

DOES NOT STORE:
  ❌ Name
  ❌ Email
  ❌ Phone
  ❌ IP address
  ❌ Browser fingerprint
  ❌ Session cookies
  ❌ User account details
  ❌ Precise timestamps
  ❌ User IDs

RESULT:
  If platform is breached: Attacker gets reputation scores + pseudonym hashes
  Attacker cannot: Determine who anyone is
  Platform cannot be subpoenaed: "We don't have that data"
```

---

## 5. ANONYMITY SOURCES

### For Intake: SecureDrop

**Setup (2 hours):**
```bash
# Deploy existing SecureDrop instance
git clone https://github.com/freedomofpress/securedrop.git
cd securedrop
./quickstart.sh

# Now you have anonymous document submission
# Access via Tor: https://truth-platform.onion
```

**What journalist sees:**
```
URL: https://truth-platform.onion/
Form:
  [Upload document]
  [Codename: ________]
  [Optional message]

They submit → Document encrypted → Stored in journalist-only area
Truth operator downloads → Decrypts locally → Reviews
```

**Privacy:**
- Journalist's IP: Hidden (Tor)
- Data: Encrypted on server (cannot read without journalist's key)
- Metadata: No IP logging, no timestamp, no user tracking

**Cost:** $0 (open-source)

---

## 6. WHO ISSUES CREDENTIALS?

**Option 1: Journalist Associations**
- Swedish Union of Journalists (SJF)
- European Federation of Journalists (EFJ)
- National journalists organizations per country

**Option 2: News Organizations**
- The Guardian, BBC, Reuters
- ProPublica, Bellingcat
- Regional investigative outlets

**Option 3: Academic Institutions**
- Specialized journalism programs
- With some criteria (published investigations, etc.)

**Setup Process:**
```
1. Organization creates DID: did:polygonid:xyz
2. Designs credential schema:
   {
     "profession": "Journalist",
     "jurisdiction": "Sweden",
     "yearActive": 2015,
     "verified": true
   }
3. Issues credentials to members
4. Journalists present proofs to Truth Platform
5. Platform verifies against organization's DID
```

---

## 7. EXPECTED PRIVACY GUARANTEES

**What Platform Knows:**
```
✓ This person is a verified journalist (from issuer's signature)
✓ Credential is not expired (time check)
✓ Credential is not revoked (revocation list check)
✓ Approximate time of contribution (hour, not minute)
✓ Quality of contribution (from content, not metadata)
✓ If contributor is repeat user (via pseudonym_hash)
```

**What Platform Does NOT Know:**
```
✗ Journalist's real name
✗ Email address
✗ Phone number
✗ IP address
✗ Location
✗ Which country they're in
✗ Which news organization they work for
✗ Relationship between different contributions (unless same pseudonym used)
✗ Which contributions from previous sessions are the same person
✗ Browser type, device type, or device fingerprint
✗ Precise time (only hour-granular)
```

**If Platform Gets Breached:**
```
Attacker has access to:
  - Credential proofs (public info, can be regenerated)
  - Pseudonym reputation table (anonymous)
  - Revocation list (public)

Attacker CANNOT determine:
  - Who made which contribution
  - Real identity of anyone
  - Linking between actions (proofs are unlinkable)

Outcome: Damage limited to reputation score manipulation
         Cannot doxx journalists or identify sources
```

---

## 8. DEPLOYMENT CHECKLIST

### Week 1
- [ ] Deploy SecureDrop instance (2 hours)
- [ ] Create Truth Platform DID (15 minutes)
- [ ] Email 3 journalist associations requesting DID + credential schema (1 hour)
- [ ] Set up development environment (Polygon Mumbai testnet account)

### Week 2
- [ ] Integrate credential issuance library (Node.js VC library)
- [ ] Build API endpoint: `/api/verify-journalist` (6 hours)
- [ ] Test with mock credentials (4 hours)
- [ ] Security review of API (4 hours)

### Week 3
- [ ] Design minimal database schema (2 hours)
- [ ] Implement pseudonym hashing system (4 hours)
- [ ] Build `/api/submit-evidence` with reputation tracking (8 hours)
- [ ] Database testing (4 hours)

### Week 4
- [ ] Build frontend: credential request form (8 hours)
- [ ] Build frontend: reputation dashboard (8 hours)
- [ ] User testing with 5 beta journalists (8 hours)
- [ ] Bug fixes (4 hours)

### Week 5-6
- [ ] Security audit by 3rd party ($2K, 2 weeks)
- [ ] Iterate on feedback (4 hours)
- [ ] Documentation (4 hours)
- [ ] Launch to 20 beta journalists

### Week 7-8
- [ ] Collect feedback
- [ ] Add Idena integration (Weeks 7-8)
- [ ] Add IRMA integration (Week 8)
- [ ] Public launch

---

## 9. COMPARATIVE COST ANALYSIS

| Technology | Setup Cost | Ongoing | Complexity | Privacy | Interop | Timeline |
|------------|-----------|---------|-----------|---------|---------|----------|
| **Polygon ID** | $2K | $100/mo | Medium | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 1 week |
| **W3C VC 2.0** | $1K | $100/mo | Low | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 1 week |
| **IRMA** | $5K | $200/mo | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐ | 2 weeks |
| **Idena** | $0 | $0 | Low | ⭐⭐⭐⭐⭐ | ⭐⭐ | 1 week |
| **SecureDrop** | $0 | $0 | Low | ⭐⭐⭐⭐⭐ | ⭐ | 2 hours |
| **Hyperledger Aries** | $8K | $500/mo | High | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 4 weeks |
| **All Combined** | $16K | $900/mo | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 8 weeks |

---

## 10. KEY TERMS GLOSSARY

**Verifiable Credential (VC):** Signed document proving a claim ("you are a journalist")

**DID (Decentralized Identifier):** Identity URL you control (did:polygonid:xyz)

**Zero-Knowledge Proof (ZKP):** Cryptographic proof of claim without revealing claim details

**Polygon ID:** Platform for issuing/verifying credentials with ZK proofs

**IRMA:** Selective disclosure—reveal only required attributes

**Idena:** Proof of personhood via human validation ceremonies

**Pseudonym:** Anonymous identity that persists (different from anonymous = no identity)

**Sybil Attack:** One person creates multiple accounts to gain fake influence

**Revocation:** Issuer can invalidate a credential (e.g., if journalist loses license)

**Unlinkability:** Cannot connect different actions to same person

**Merkle Root:** Cryptographic hash of all credentials—used to verify membership without revealing which

---

## 11. DECISION TREE

```
START: "We need professional verification without identity"
  ↓
"Do we need credentials to move between platforms?"
  YES → Use W3C VC 2.0 (standard, portable)
  NO → Can use Polygon ID (faster, specific to Polygon)
  ↓
"Do we need to prevent Sybil attacks?"
  YES → Add Idena proof-of-personhood layer
  NO → Just use credential proofs
  ↓
"Do we need ultimate privacy (granular attribute reveal)?"
  YES → Add IRMA (selective disclosure)
  NO → Polygon ID/VC 2.0 sufficient
  ↓
"Do we need anonymous document intake?"
  YES → Deploy SecureDrop
  NO → Just use credential verification
  ↓
RECOMMENDED COMBINATION:
  SecureDrop (intake) +
  W3C VC 2.0 (standard) +
  Polygon ID (efficiency) +
  Idena (Sybil resistance) +
  Custom pseudonym system (anonymous reputation)
```

---

## 12. RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Fake journalist credential | Medium | High | Require credential from trusted issuer, issuer KYC |
| Sybil attack (multiple accounts) | Medium | High | Add Idena proof-of-personhood requirement |
| Platform breach reveals identity | Low | Catastrophic | Store ZERO PII, only proof hashes |
| Credential issuer compromised | Low | High | Multi-signature requirement, monthly key rotation |
| Private key stolen | Medium | Medium | User can rotate key (start fresh with new pseudonym) |
| Man-in-the-middle attack | Low | Medium | TLS 1.3 + certificate pinning |

---

## 13. GDPR COMPLIANCE CHECKLIST

- [ ] **Data Minimization:** Only store proofs + reputation, no PII
- [ ] **Privacy by Design:** Pseudonym hashing built into schema
- [ ] **Storage Limitation:** Automatic deletion >2 years old
- [ ] **Transparency:** Privacy policy explicitly states what is NOT stored
- [ ] **User Control:** User can delete pseudonym + request data (none exists)
- [ ] **Security:** TLS 1.3 + AES-256 encryption at rest
- [ ] **Audit Trail:** Append-only log of all credential verifications
- [ ] **Right to Erasure:** User can delete (stops accepting new proofs)

---

## 14. SUCCESS METRICS (First 6 Months)

- [ ] 500+ verified journalists on platform
- [ ] 5+ journalist associations issuing credentials
- [ ] 99.9% credential verification success rate
- [ ] Zero false positives in Sybil detection
- [ ] Zero identity breaches
- [ ] Zero data minimization violations (GDPR)
- [ ] 2-3 independent audits passed

---

## 15. IMPLEMENTATION START IMMEDIATELY

**WEEK 1 ACTION ITEMS:**

```
Monday:
  [ ] Decide: Polygon ID vs W3C VC 2.0 (flip coin if unsure)
  [ ] Deploy SecureDrop instance (2 hours)
  [ ] Create Truth Platform DID (15 minutes)

Tuesday:
  [ ] Contact Swedish Union of Journalists
  [ ] Contact International Federation of Journalists
  [ ] Contact European Federation of Journalists
  [ ] Ask for: "Can you issue journalist credentials?"

Wednesday:
  [ ] Set up Polygon Mumbai testnet account
  [ ] Clone credential verification library
  [ ] First test: Can we verify a mock credential? (Yes)

Thursday:
  [ ] Design database schema (copy from research document)
  [ ] Write pseudonym_hash function
  [ ] First database test: Can we store + query reputation?

Friday:
  [ ] Review research document
  [ ] Identify blockers
  [ ] Plan Week 2
```

---

## APPENDIX: USEFUL LINKS

**W3C Standards:**
- https://www.w3.org/TR/vc-overview/
- https://w3c-ccg.github.io/did-primer/

**Implementations:**
- Polygon ID: https://docs.privado.id/
- IRMA: https://credentials.github.io/
- Idena: https://www.idena.io/

**Security:**
- SecureDrop: https://securedrop.org/
- Signal: https://signal.org/

**GDPR:**
- https://gdpr-info.eu/art-5-gdpr/

**Open Source Libraries:**
- `did-resolver` (Node.js)
- `@0xpolygonid/js-sdk` (Polygon ID)
- `vc` (Node.js Verifiable Credentials)

---

**Questions?** Refer to ZERO_KNOWLEDGE_VERIFICATION_COMPREHENSIVE_RESEARCH.md for detailed explanations.
