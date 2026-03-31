# FINANCIAL INTELLIGENCE EXTRACTION — QUICK REFERENCE CARD
## For AI Document Analysis Systems (Project Truth TARA Protocol)

---

## SECTION A: DOCUMENT TYPES & WHAT TO EXTRACT

| Document | Key Data Points | Priority | Red Flags to Watch |
|----------|-----------------|----------|-------------------|
| **Indictment** | Defendant, charges, monetary figures, accounts, companies, properties | CRITICAL | Vague language, partial amounts, allegations without proof |
| **Sentencing Memo** | Total proceeds, asset list, forfeiture amount, victim loss | CRITICAL | Estimated vs. verified amounts, gaps in accounting |
| **Bank Statements** | Account #, balance, transaction date/amount, recipient, purpose | CRITICAL | Structuring patterns, round amounts, vague purposes |
| **Wire Transfers** | Amount, date, from/to entity, purpose, SWIFT code | CRITICAL | Foreign jurisdiction, no supporting docs, same-day reversal |
| **Tax Returns** | Income reported, deductions, capital gains, Schedule K-1 | HIGH | Zero reported income, high expenses; missing returns |
| **Property Deeds** | Address, purchase price, date, owner, financing method | HIGH | All-cash purchase, nominee buyer, below-market price |
| **Corporate Filings** | Officers, directors, ownership %, capitalization | MEDIUM | Offshore jurisdiction, nominee directors, recent formation |
| **PowerPoint of Attorney** | Principal, agent, scope, date, jurisdiction | HIGH | Broad authority, recent execution, spouse as agent |
| **Trust Documents** | Settlor, trustee, beneficiary, corpus, jurisdiction | HIGH | Undisclosed beneficiary, foreign trustee, trust protector |

---

## SECTION B: CRITICAL EXTRACTION CHECKLIST

**For Every Transaction Extract:**
- [ ] DATE (YYYY-MM-DD)
- [ ] AMOUNT ($X in currency Y)
- [ ] FROM (entity, account number if available)
- [ ] TO (entity, account number if available)
- [ ] PURPOSE (exact language from document)
- [ ] DOCUMENT SOURCE (page X of docket entry Y)

**For Every Entity Extract:**
- [ ] NAME (legal name)
- [ ] TYPE (person, corporation, LLC, trust, etc.)
- [ ] JURISDICTION (state or country)
- [ ] IDENTIFIED OWNER (from documents)
- [ ] INFERRED BENEFICIAL OWNER (from money flows)
- [ ] CONFIDENCE SCORE (0-100)

**For Every Property Extract:**
- [ ] ADDRESS
- [ ] PURCHASE PRICE & DATE
- [ ] OWNER OF RECORD
- [ ] FINANCING METHOD (cash / mortgage / other)
- [ ] CURRENT VALUE (if stated)
- [ ] ANNUAL INCOME (if rental)

---

## SECTION C: RED FLAG SCORING MATRIX

**Add points for each indicator present. Score ≥12 = QUARANTINE FOR REVIEW**

| Red Flag | Points | Example |
|----------|--------|---------|
| **Structuring** (multiple <$10K) | 10 | 5 deposits of $9,999 each |
| **Same-day reversal** | 8 | $100K in, $100K out within hours |
| **No docs** (large transfer, no invoice) | 10 | $1M wire with purpose "fee" only |
| **Round amount** ($10K, $100K, $1M) | 5 | Transfer of exactly $500,000 |
| **Offshore destination** | 5 | Wire to Cayman Islands, BVI |
| **Vague purpose** (<10 chars) | 5 | "Fee" or "retainer" with no detail |
| **Nominee structure** | 8 | Person A owns LLC, Person B controls |
| **Timing anomaly** (arrest date ±30d) | 6 | Asset transfer week of indictment |
| **Beneficial owner hidden** | 8 | "Beneficial owner unknown" stated |
| **Trust with unknown beneficiary** | 7 | "Discretionary trust" no names |
| **Cash purchase** (>$500K property) | 4 | Real estate, all-cash, no mortgage |
| **Activity spike** (3x normal) | 6 | Suddenly 10x usual transaction volume |

---

## SECTION D: OFFSHORE JURISDICTION FLAGS

**Highest Risk (All-cash + nominee buyer = CRITICAL):**
- Cayman Islands, British Virgin Islands, Panama
- Luxembourg, Jersey, Nevis

**High Risk:**
- Singapore, Hong Kong, UAE
- Switzerland (if new account post-investigation)

**Moderate Risk:**
- UK, Ireland, Canada (if unusual structure)

**Legitimate International:**
- Germany (GmbH = standard corporate form)
- Canada (business norm)

---

## SECTION E: BENEFICIAL OWNERSHIP DECISION TREE

```
Account has primary signer?
  ├─ YES, signer controls all transactions?
  │  ├─ YES → Signer is beneficial owner (90% confidence)
  │  └─ NO → Different person controls → they're beneficial owner (80% confidence)
  │
  └─ NO → Look at fund SOURCE
     ├─ Source = Person A → A likely beneficial owner (70% confidence)
     ├─ Source = Unknown → FLAG AS "BENEFICIAL OWNER UNCLEAR" (50% confidence)
     └─ Source = Trust/LLC → Dig into trust/LLC structure recursively

Trust or LLC with vague structure?
  ├─ Settlor named → Settlor likely beneficial owner
  ├─ Trustee is professional → Look at discretionary distribution patterns
  └─ Beneficiary unknown → UNCERTAIN until documents found
```

---

## SECTION F: MONEY LAUNDERING STAGE DETECTION

### PLACEMENT (Illicit funds enter system)
**Red Flags:** Cash deposit, high-cash business, bulk transfer from criminal source
**Key Question:** Where did the large deposit come from?
**AI Action:** Extract source of funds, cross-check against legitimate income

### LAYERING (Obscure the source)
**Red Flags:** Multiple transfers, offshore routing, round-trip transactions, shell companies
**Key Question:** Does the transfer serve any legitimate business purpose?
**AI Action:** Map transaction chain, look for complexity, identify gaps in documentation

### INTEGRATION (Repatrient as legitimate)
**Red Flags:** Property purchase with criminal proceeds, business income generated from illicit funds
**Key Question:** Are expenditures justified by documented income?
**AI Action:** Compare lifestyle/assets vs. documented income source

---

## SECTION G: COMMON DOCUMENT RED FLAGS

### Indictment Red Flags:
- [ ] "Proceeds were concealed..."
- [ ] "...accounts in the names of..."
- [ ] "...transferred through multiple..."
- [ ] "...nominee..."
- [ ] "...Cayman", "...BVI", "...Panama"
- [ ] Dollar amounts followed by "est." or "approximately"
- [ ] Properties listed without mortgages mentioned

### Bank Statement Red Flags:
- [ ] Multiple accounts, same person
- [ ] Frequent large round-number transfers
- [ ] Purpose lines shorter than 5 words
- [ ] Same amount in → opposite amount out (same day)
- [ ] Transfer to company name unrelated to stated business
- [ ] Wire to jurisdiction where no known business interest

### Tax Return Red Flags:
- [ ] Itemized deductions >60% of gross income
- [ ] No Schedule C but Schedule K-1 income (pass-through entity)
- [ ] Capital gains reported but no corresponding asset sales documented
- [ ] Zero rental income from properties known to be rental (Form 1040-SE)
- [ ] Missing years (did not file)
- [ ] Significant amendments (Form 1040-X)

### Property Deed Red Flags:
- [ ] Purchase price is round number ($1,000,000 exactly)
- [ ] Buyer is LLC with no documented business
- [ ] "No mortgage" mentioned or obvious from deed of trust absence
- [ ] Property value >$500K, buyer has no documented income
- [ ] Quitclaim deed (unusual transfer method)
- [ ] Transfer to trust <90 days from arrest

---

## SECTION H: MAXWELL CASE REFERENCE AMOUNTS

**Keep these as sanity-checks:**

| Metric | Amount | Source |
|--------|--------|--------|
| Total Epstein transfers to Maxwell | $25-30M | Government sentencing documents |
| UBS Switzerland (Maxwell) | $19M | UBS subpoena |
| Manhattan townhouse value | $15M | Deed + market reports |
| New Hampshire property | $1M | Purchase records |
| Massachusetts property | $2.7M | Deed |
| Terramar Project donations (Maxwell) | $560K | IRS Form 990 |
| Total liquid assets (arrest date) | $5.3M | Bank discovery |
| Real estate holdings | $18.7M | Property records |
| **TOTAL TRACEABLE** | **$68M+** | Aggregate |

**If your extractions total <$50M, you're likely missing major assets (offshore, hidden, seized)**

---

## SECTION I: AI CONFIDENCE SCORING GUIDE

| Confidence | Meaning | How to Achieve | Action |
|-----------|---------|----------------|--------|
| **90-100%** | Bank statement, official record, court findings | Primary document + clear data | Use directly in evidence |
| **80-89%** | Multiple corroborating sources, clear extraction | 2+ documents support + high extraction confidence | Include with confidence note |
| **70-79%** | Reasonable inference, some ambiguity | Inferred from patterns + document support | Include as "LIKELY" |
| **60-69%** | Plausible but uncertain | Limited documentation + some inference | Include as "POSSIBLE" / flag for review |
| **50-59%** | Equally plausible alternatives | Genuine ambiguity in documents | Output both versions, mark UNCERTAIN |
| **<50%** | Insufficient basis | Speculation, minimal documentation | DO NOT OUTPUT / human-only review |

**Rule: Output confidence score with every fact. If ≥80%, analyst can use. If <80%, flag for human review.**

---

## SECTION J: HALLUCINATION PREVENTION CHECKLIST

Before outputting any extracted data:
- [ ] Is there a specific document source? (Not "it's known that..." but "Document X states...")
- [ ] Would I stake my career on this fact? (If no → too confident)
- [ ] Could document reasonably be interpreted another way? (If yes → confidence too high)
- [ ] Am I inventing specificity where document is vague? (If yes → STOP, output the vagueness instead)
- [ ] Is the amount I extracted exact or estimated? (Must label accordingly)
- [ ] Did I add information not in document? (If yes → DELETE)

---

## SECTION K: ESCALATION CHECKLIST

**Escalate to Forensic Accountant (Immediately) If:**
- [ ] Confidence <70% on major financial amount
- [ ] Two documents contradict each other
- [ ] Beneficial owner cannot be determined
- [ ] Monetary amounts don't reconcile ("Missing $X in accounting")
- [ ] Red flag score >25 on any single entity
- [ ] Forfeiture implications unclear
- [ ] Tax reporting inconsistent with bank records

**Escalate to Legal/Compliance (Before Trial Use) If:**
- [ ] Evidence was obtained via questionable means (admissibility risk)
- [ ] AI extraction has not been human-verified
- [ ] Defendant may challenge AI methodology
- [ ] Documents are critical to proving financial motivation

---

## SECTION L: CRITICAL DO's AND DON'Ts

### DO:
- [ ] Extract exact language from documents
- [ ] Note all assumptions clearly
- [ ] Cite source document for every fact
- [ ] Include confidence score
- [ ] Preserve document vagueness (don't invent specificity)
- [ ] Flag contradictions between documents
- [ ] Note when documents are unavailable
- [ ] Update extractions when new documents arrive
- [ ] Keep audit trail of all extractions

### DON'T:
- [ ] Invent numbers not stated in documents
- [ ] Assume beneficial owner without evidence
- [ ] Ignore redactions
- [ ] Treat estimates as verified facts
- [ ] Make conclusions beyond document scope
- [ ] Forget that absence of evidence is a red flag (not proof of innocence)
- [ ] Output without source citation
- [ ] Override expert forensic judgment
- [ ] Assume offshore = illegal (many legitimate reasons)
- [ ] Hallucinate supporting documents

---

## SECTION M: QUICK ANALYSIS WORKFLOW

**When you receive a new financial document:**

1. **CLASSIFY** — What type of document? (indictment, bank record, deed, etc.)
2. **EXTRACT** — Pull all monetary amounts, dates, entities
3. **CITE** — Note source document for every data point
4. **VERIFY** — Check amounts against prior extractions (reconciliation)
5. **FLAG** — Identify red flags (structuring, offshore, nominee, etc.)
6. **SCORE** — Assign confidence score to each extraction
7. **RELATE** — Connect to existing network (who owns what, who controls whom)
8. **ESCALATE** — If confidence <80% or major gaps, send to human
9. **ARCHIVE** — Store with full provenance chain
10. **REPORT** — Output as JSON + narrative summary for analyst

---

## SECTION N: MAXWELL CASE ANALYSIS SHORTCUT

**Start here for any Maxwell-related document:**

1. **Is money flowing FROM Epstein accounts TO Maxwell accounts?** → Money laundering indicator
2. **Is money flowing FROM Maxwell TO Terramar/properties?** → Asset integration (final stage)
3. **Is there offshore structure (UBS, BVI entities)?** → Layering indicator
4. **Is there nominee buyer or LLC?** → Identity concealment
5. **Does lifestyle match documented income?** → Income-expenditure gap = RED FLAG
6. **What is missing?** → Offshore accounts, hidden properties, travel records, email communications

---

## SECTION O: ONE-PAGE MAXWELL FINANCIAL SUMMARY

```
ILLICIT SOURCE: Epstein criminal enterprise
             ↓
TRANSFER VEHICLE: Maxwell's personal JPMorgan accounts ($25-30M)
             ↓
LAYERING METHODS:
  - Terramar Project (nonprofit cover, $560K)
  - UBS Switzerland (offshore, $19M)
  - UK property holdings
             ↓
ASSET INTEGRATION:
  - Manhattan townhouse ($15M, forfeited)
  - New Hampshire estate ($1M, seized)
  - Massachusetts property ($2.7M, joint ownership)
             ↓
LIFESTYLE EXPENDITURES: $1.2M+/year (unexplained by documented income)

FORENSIC CONCLUSION:
Classic 3-stage money laundering with emphasis on asset acquisition
(real estate integration). Complexity LOW (direct transfers, not
multiple layers), making case relatively straightforward to prove.

CONVICTION BASIS:
Proven transfer of $25M+ Epstein funds + lifestyle inconsistent
with legitimate income + acquisition of major assets + concealment
via offshore accounts = manifest money laundering + conspiracy.
```

---

## SECTION P: ALERT WORDS (Trigger Deep Analysis)

**Financial Doc Red Flags** — If document contains these words, flag for extra review:
- "offshore"
- "nominee"
- "beneficiary unknown"
- "discretionary"
- "trust"
- "structuring"
- "cash"
- "wire"
- "foreign jurisdiction"
- "bearer"
- "foundation"
- "registered agent"
- "LLC"
- "trust protector"

**Crime Indicators** — If combined with financial data:
- "conspiracy"
- "willfully"
- "concealed"
- "scheme"
- "defraud"
- "unlawfully"
- "trafficking"
- "proceeds"
- "forfeiture"
- "restitution"

---

## FINAL THOUGHT

**The goal is not to be perfect. The goal is to be honest, sourced, and transparent about uncertainty.**

If you don't know something, say "UNKNOWN". If you're inferring, mark it "INFERRED". If document is vague, preserve the vagueness.

A conservative, well-sourced analysis is worth 100x a confident hallucination.

---

**Last Updated:** March 14, 2026
**For:** Project Truth / TARA Protocol
**Status:** PRODUCTION

