# 🔀 PROJECT TRUTH: AI FLOW DIAGRAMS
**Veri akışı ve halüsinasyon propagation haritası**

---

## 1. CHAT ENGINE FLOW (Highest Risk)

```
User Query
    ↓
[ChatPanel.tsx]
    ↓
sendMessage(question, nodes, links)
    ↓
POST /api/chat
├─ Input Validation: ✅ chatSchema
├─ Rate Limit Check: ✅ CHAT_RATE_LIMIT
└─ Groq Call:
    ├─ System Prompt: 147-line detailed rules
    ├─ Messages: [SYSTEM, CONTEXT, HISTORY, QUESTION]
    ├─ Model: llama-3.3-70b-versatile
    ├─ Temperature: 0 (deterministic)
    ├─ Format: json_object
    └─ Max Tokens: 1024
        ↓
    Response JSON:
    {
      "narrative": "✅ Gazetecilik dili",
      "highlightNodeIds": ["uuid-1", "uuid-2"],
      "annotations": {
        "uuid-1": "🔴 RECRUITED AGE 15",     ← AI-GENERATED
        "uuid-2": "🔴 $150M SETTLEMENT"      ← AI-GENERATED
      },
      "focusNodeId": "uuid-1"
    }
        ↓
    JSON Parse + Validation:
    ├─ highlightNodeIds filter (UUID check) ✅
    ├─ annotations dict → DIRECT (no filtering) ❌
    └─ narrative string → DIRECT ❌
        ↓
useChatStore.ts (Zustand)
├─ messages array += ChatMessage
├─ highlightedNodeIds = Array
├─ annotations = Dict
└─ PERSIST: localStorage (optional)
        ↓
[ChatPanel.tsx] Render
├─ narrative text displayed ✅
├─ each annotation rendered
└─ clickable node references
        ↓
[Truth3DScene.tsx] 3D Render
├─ highlightNodeIds loop
├─ For each: create sprite
├─ Sprite text = annotations[nodeId]
│  └─ 🔴 NO VALIDATION
├─ Canvas render
└─ User sees on screen
```

**🔴 PROBLEM POINTS:**
1. Line 277-282: highlightNodeIds validated, but annotations NOT
2. Annotations directly rendered to 3D (no confidence check)
3. No source field (how do we know it's correct?)
4. No fallback if AI hallucinates

**HALLUCINATION EXAMPLE:**
```
User: "Ölenler kimler?"
Nodes: [Elon Musk (death_date: NULL), Steve Jobs (death_date: 1955-02)]
AI thinks Elon is connected to Epstein network (it's not)
AI response:
{
  "highlightNodeIds": ["elon-uuid", "steve-jobs-uuid"],
  "annotations": {
    "elon-uuid": "🔴 KAÇTI TÜRK İYE",   ← COMPLETELY FALSE
    "steve-jobs-uuid": "ÖLDÜ 2011"         ← Correct
  }
}
Result: User sees "Elon Musk - KAÇTI TÜRK İYE" on 3D graph
```

---

## 2. DOCUMENT SCAN FLOW (High Risk)

```
User Upload File
    ↓
Frontend: DocumentUpload
├─ File → GCS or Supabase
└─ documentId created
    ↓
User Clicks "TARA" (Scan)
    ↓
POST /api/documents/scan?documentId=xyz
├─ Input: extracted_text or raw_content
├─ Control: documentId validation ✅
└─ Mark status: "scanning"
    ↓
Extract Document Content:
├─ SOURCE 1: extracted_text (OCR output) ✅
├─ SOURCE 2: raw_content (API fetched) ✅
├─ SOURCE 3: fetchFromProvider() (fallback)
└─ COMBINED: metadata + content + node names
    ↓
Chunk Document (if > 5K chars):
├─ Split into overlapping chunks
├─ Each chunk: 2000 char + overlap
└─ Process parallel or sequential
    ↓
FOR EACH CHUNK:
├─ Build Groq Prompt:
│  ├─ Extract entities: [{name, type, confidence}]
│  ├─ Extract relationships: [{source, target, type}]
│  ├─ Extract dates: [{date, description}]
│  ├─ Temperature: 0.05 (very strict)
│  └─ Max tokens: 2000
│
├─ Call Groq:
│  └─ llama-3.3-70b-versatile
│
└─ Response JSON:
   {
     "entities": [
       {
         "name": "John Smith",           ← 🔴 Might be placeholder
         "type": "person",
         "confidence": 0.8
       }
     ],
     "relationships": [
       {
         "sourceName": "John Smith",
         "targetName": "Company A",
         "relationshipType": "employs", ← 🔴 May not exist
         "confidence": 0.7
       }
     ],
     "summary": "..."
   }
    ↓
Deduplication (if multi-chunk):
├─ mergeChunkResults()
├─ Filter by: name.toLowerCase() + type
└─ Keep highest confidence ✅
    ↓
Filter by Confidence:
├─ < 0.5: EXCLUDE ✅
├─ 0.5-0.7: Include (but tagged)
└─ > 0.7: Include
    ↓
Create Document_Derived_Items:
├─ For each entity: {document_id, item_data, confidence}
└─ For each relationship: {source, target, confidence}
    ↓
INSERT INTO data_quarantine:
├─ If source = ICIJ/OpenSanctions: status="pending_review" (1 approval)
├─ If source = AI: status="quarantined" (2 approvals)
└─ Include: confidence, provenance_chain
    ↓
Database Update:
├─ ocr_status = "scanned"
├─ scan_result = JSON (entities, relationships, confidence)
└─ quality_score = confidence * 100
    ↓
User Sees in UI:
├─ DocumentDetailView
│  └─ AI-extracted entities listed
│  └─ "ONAYLA / REDDET" buttons
│
└─ If APPROVED (2+ peers):
   └─ Promoted to nodes/links tables
```

**🔴 PROBLEM POINTS:**
1. Line 555-563: Rules for "no hallucination" but no detection
2. "John Doe" variations not filtered (John M. Doe, J. Doe, etc.)
3. No fuzzy matching (ağdaki "Jean-Luc Brunel" ≠ "Jean Luc Brunel")
4. Relationship "employs" — how verified?
5. Confidence 0.5-0.7 edge cases unclear

**HALLUCINATION EXAMPLE:**
```
Document: "To Whom It May Concern: John Smith was a friend of..."
Groq interprets as:
{
  "entities": [
    {"name": "John Smith", "type": "person", "confidence": 0.8},
    {"name": "To Whom It May Concern", "type": "organization", ...}  ← Nonsense
  ],
  "relationships": [
    {"sourceName": "John Smith", "targetName": "To Whom It May Concern",
     "relationshipType": "friend_of", "confidence": 0.6}  ← Wrong
  ]
}

Result: "To Whom It May Concern" added as node in network
```

---

## 3. INTENT CLASSIFICATION FLOW (Low Risk)

```
User Query in Chat
    ↓
ChatPanel → useChatStore.sendMessage()
    ↓
After AI response received:
├─ classifyIntent(question) called
└─ Fire-and-forget (non-blocking)
    ↓
Client: lib/intentClassifier.ts
├─ PHASE 1: Keyword Classifier
│  ├─ Query → lowercase
│  ├─ KEYWORD_MAP check (6 lenses)
│  ├─ Score compound phrases > single words
│  └─ If confidence >= 0.75: RETURN (no LLM)  ✅
│
└─ PHASE 2: LLM Fallback (if < 0.75)
   ├─ POST /api/intent-classify
   └─ Groq call (temperature 0.1, 150 tokens)
       ↓
       LLM Response:
       {
         "intent": "follow_money" | "timeline" | ...,
         "confidence": 0.65,
         "reason": "..."
       }
       ↓
       Validation:
       ├─ validModes = [6 fixed strings]
       ├─ if (!validModes.includes(intent)): intent = 'full_network'  ✅
       └─ confidence = clamp(0, 1)
    ↓
Store Update:
├─ useViewModeStore.setAiSuggestion({
│    mode: intent,
│    confidence,
│    dismissed: false
│  })
└─ PERSIST: localStorage
    ↓
UI Display:
├─ LensSidebar.tsx
└─ AiSuggestionBanner (if confidence >= 0.75)
   └─ "Ana Hikaye modu öneriliyor?"
```

**✅ SAFE POINTS:**
1. Keyword classifier (0% AI = 100% safe)
2. 6 fixed modes (no freeform)
3. Whitelist validation ✅
4. Confidence gate 0.75 ✅
5. Fallback to full_network ✅

**Very Low Risk** — Design prevents hallucination

---

## 4. DAILY QUESTION FLOW (High Risk)

```
Frontend Init (truth/page.tsx)
    ↓
useEffect → fetchDailyQuestion(networkId)
    ↓
GET /api/daily-question?networkId=xyz
    ↓
In-Memory Cache Check:
├─ dailyCache.get(`daily_${networkId}`)
├─ If exists + NOT expired (24h): RETURN ✅
└─ Otherwise: GENERATE
    ↓
Fetch Gap Nodes:
├─ supabaseAdmin.rpc('get_gap_nodes', {networkId})
├─ Returns: unsqueried nodes
└─ If empty: use generic question ✅
    ↓
Pick Target Node:
├─ Sort by connection_count (most connected)
├─ Pick first: targetNode
└─ nodeName = targetNode.name
    ↓
AI Question Generation:
├─ Groq Call:
│  ├─ Model: llama-3.3-70b-versatile
│  ├─ Temperature: 0.8 🔴 (very creative)
│  ├─ Max Tokens: 128
│  ├─ System: "Create intriguing question"
│  └─ User: "This person [name] hasn't been researched yet.
│             Ask 1 Türkçe question."
│
└─ Response:
   "Jean-Luc Brunel'in Paris'teki modeling şirketi hangi
    billionaire'leri temsil etmiş?"
    ↓
Response JSON Parse:
├─ response.question extracted
├─ If AI fails: fallback = "[name] kimdir?" ✅
└─ Cache for 24 hours
    ↓
Store in dailyCache:
{
  question: "...",
  targetNodeId: "uuid",
  targetNodeName: "Jean-Luc Brunel",
  expiresAt: "2026-03-12T00:00:00Z"
}
    ↓
Return to Frontend
    ↓
UI: DailyQuestionBanner.tsx
├─ Display: "Jean-Luc Brunel'in Paris..."
└─ "Soruyu Sor" button
    ↓
User clicks:
├─ Question → ChatPanel input
├─ Send to /api/chat
└─ AI tries to answer
```

**🔴 PROBLEM POINTS:**
1. Temperature 0.8 = very creative (→ hallucination likely)
2. AI can imply connections: "...hangi billionaire'leri temsil etmiş?"
   (What if they didn't represent ANY?)
3. No fact-checking of the question itself
4. Fallback generic, but daily question showed to all users

**HALLUCINATION EXAMPLE:**
```
Target: "John Smith" (minor node, 3 connections)
AI (temp 0.8): "John Smith hangi ABD Başkanları ile toplantı yapmış?"
User: Searches for "John Smith president meetings"
      → Finds nothing, wastes time

Alternative bad:
AI: "John Smith'in çalıştığı terör örgütü ne?"
User: Reports as false news
```

---

## 5. GAP ANALYSIS FLOW (Medium Risk)

```
UI: GapAnalysisPanel.tsx
    ↓
useGapAnalysis(networkId)
    ↓
GET /api/node-stats/gaps?networkId=xyz
    ↓
Cache Check (10 minutes):
├─ gapCacheRef validity check
└─ If fresh: RETURN ✅
    ↓
Fetch Gap Nodes:
├─ rpc('get_gap_nodes', {networkId})
├─ Returns: 0-8 unsqueried nodes
└─ If empty: return "Tüm ağ tarandı!" ✅
    ↓
Fetch Connection Counts:
├─ rpc('get_node_connection_counts')
└─ Map: nodeId → count
    ↓
Sort by Connection Count:
├─ Most connected first
├─ Slice top 8
└─ For display
    ↓
AI Suggestions (Groq Call):
├─ Model: llama-3.3-70b-versatile
├─ Temperature: 0.7 🟡 (creative)
├─ Max Tokens: 256
├─ System: "Create intriguing Türkçe questions"
├─ User: "These persons haven't been queried:
│          - Person1 (type, N connections)
│          - Person2 (type, M connections)
│          Write 1 question each"
│
├─ Response Format:
│  {
│    "questions": [
│      "Person1 hakkında...",
│      "Person2 hakkında..."
│    ]
│  }
│
└─ If AI fails: Use template fallback ✅
   "{nodeName} kimdir ve ağla nasıl bağlantılıdır?"
    ↓
Cache (10 minutes):
├─ Store: gaps + aiSuggestions
└─ TTL: 10 minutes
    ↓
Return to Frontend:
{
  "gaps": [
    {
      "nodeId": "uuid",
      "nodeName": "Person1",
      "connectionCount": 5
    }
  ],
  "aiSuggestions": [
    "Person1 hakkında soru 1",
    "Person2 hakkında soru 2"
  ]
}
    ↓
UI Display:
├─ GapAnalysisPanel.tsx
├─ Show: 8 gap nodes
├─ Show: AI-generated suggestions
└─ "Bunu Sor →" button (sends to chat)
```

**🟡 PROBLEM POINTS:**
1. Temperature 0.7 (creative but risky)
2. AI can over-interpret person's role
3. 10-min cache may show stale suggestions
4. Fallback generic, but OK

**MEDIUM RISK** — Suggestions are exploratory, not factual

---

## 6. PROPAGATION SUMMARY

```
┌─ Chat Query ─────────────────┐
│ User Input                    │
└─────────────┬─────────────────┘
              │
         /api/chat
      (Groq + 0 temp)
              │
    ┌─────────┴─────────┐
    │                   │
narrative            annotations (UUID → Label)
(Text)               🔴 UNVALIDATED
    │                   │
    └─────────┬─────────┘
              │
      useChatStore
      (Zustand)
              │
      ┌───────┴────────┐
      │                │
  ChatPanel        Truth3DScene
  (Render text)    (Canvas sprites)
                   🔴 Direct render
                      no filtering

From annotations → 3D canvas:
✅ Good: UUID validated
❌ Bad: Label content not validated
❌ Bad: No confidence score
❌ Bad: No "AI-generated" flag

RISK PROPAGATION:
Hallucinated annotation
    → Zustand state
    → Canvas rendered
    → User sees on screen
    → User acts on it (reports, tweets, etc.)
    → Misinformation spread
```

---

## 7. QUARANTINE SYSTEM (Sprint 17)

```
Scan Results (high-risk)
    ↓
INSERT INTO data_quarantine
├─ item_type: entity | relationship
├─ item_data: {...}
├─ verification_status: quarantined | pending_review
├─ source_type: ai_extraction | structured_api
├─ required_reviews: 1 | 2 (depends on source)
└─ provenance_chain: [{action, timestamp, source}]
    ↓
UI: QuarantineReviewPanel.tsx
├─ Show pending items
├─ Display: confidence, source, provenance
└─ Buttons: ONAYLA / REDDET / REDDITLE
    ↓
Peer Review (Manual):
├─ Tier 2+ user can review
├─ Compare with original document
├─ Vote: approve / reject / skip
    ↓
After 1+ Approvals (if structured):
├─ status = "verified"
└─ Can promote to nodes/links
    ↓
After 2+ Approvals (if AI):
├─ status = "verified"
└─ Promote to nodes/links
    ↓
INSERT INTO nodes/links
├─ New network data
└─ Ready for queries
```

**✅ GOOD:** Quarantine prevents false positives entering network immediately
**⚠️ NOTE:** But it depends on peer vigilance

---

## 8. RISK MATRIX HEATMAP

```
                  Hallucination Severity
                  Low      Medium    High
High User
Impact    Chat        🟡       🔴       🔴
          Doc Scan    🟡       🔴       🔴
          Daily Q      🟡       🟡       🔴

Medium    Gap Anal    🟡       🟡       🟡
Impact    Intent      🟢       🟡       🟢

Low       OCR         🟢       🟢       🟢
Impact    Vision      🟡       🟡       🟡
```

**Strategy:**
- 🔴 High-risk items → Quarantine + 2-peer review
- 🟡 Medium → 1-peer review + confidence threshold
- 🟢 Low → Direct use (structured data)

---

**Diagrams Created:** 8
**Risk Paths Mapped:** Chat, Scan, Intent, Daily, Gap, Quarantine
**Conclusion:** Chat annotations + Entity extraction are primary hallucinaton vectors

