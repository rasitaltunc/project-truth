# KAYNAKLAR VE BİBLİYOGRAFYA
## Project Truth AI Hallucination Research - Tüm Kaynaklar

---

## 1. FUNDAMENTAL RESEARCH (Hallucination İmkânsızlığı)

### A. Mathematical Proofs
- **Paper:** "On the Inevitability of Hallucinations in Large Language Models"
- **Authors:** OpenAI Research Team
- **Published:** September 2025
- **Key Finding:** Next-token prediction objectives create inherent hallucination risk
- **URL:** https://www.emergentmind.com/topics/inevitable-hallucination-of-llms
- **Impact:** Proves zero hallucination is mathematically impossible

### B. Benchmarking (State of the Art - April 2025)
- **Source:** Vectara Hallucination Benchmark
- **Finding:** Google Gemini 2.0-Flash-001 = 0.7% hallucination rate (best)
- **Baseline:** Groq llama-3.3-70b ≈ 1.8%
- **URL:** https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models
- **Implication:** Even best models have residual risk

### C. Harvard Analysis
- **Paper:** "LLMs and the Misinformation Ecosystem"
- **Published:** Harvard Misinformation Review, 2025
- **Key Insight:** Transparent uncertainty > impossible zero-risk
- **URL:** https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models
- **Lesson:** Design for acceptable risk, not impossible perfection

---

## 2. HALLUCINATION DETECTION SOTA (2025-2026)

### A. Semantic Entropy (Nature 2024 - BEST OVERALL)
- **Paper:** "Detecting hallucinations in large language models using semantic entropy"
- **Published:** Nature, June 2024, Vol 630
- **Authors:** Sebastian Farquhar, Jannik Kossen, Lorenz Kuhn, Yarin Gal (Oxford)
- **URLs:**
  - https://www.nature.com/articles/s41586-024-07421-0
  - https://oatml.cs.ox.ac.uk/blog/2024/06/19/detecting_hallucinations_2024.html
  - https://arxiv.org/abs/2406.15927
- **Key Method:** Semantic (meaning-level) entropy vs token-level
- **Accuracy:** 92% F1 score
- **Advantage:** Zero-resource, task-agnostic, generalizes well

### B. SelfCheckGPT (Zero-Resource)
- **Paper:** "SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection"
- **Published:** ACL EMNLP 2023
- **GitHub:** https://github.com/potsawee/selfcheckgpt
- **Method:** Sample 10x, compare consistency
- **Accuracy:** 85-90% F1
- **Cost:** 10x API calls
- **Latest:** FactSelfCheck (March 2025) - fact-level granularity
- **URL:** https://arxiv.org/abs/2503.17229

### C. HaluGate (Production 2025)
- **Source:** vLLM Blog, December 2025
- **URL:** https://blog.vllm.ai/2025/12/14/halugate.html
- **Feature:** Token-level hallucination detection for production LLMs
- **Method:** NLI classification with conditional verification
- **Status:** Production-ready framework

### D. HaluMap (ACL 2025 Findings)
- **Paper:** "HaluMap: Explainable Hallucination Detection Through NLI Mapping"
- **Published:** ACL 2025 Findings
- **URL:** https://aclanthology.org/2025.findings-acl.96/
- **Method:** Map entailment/contradiction relations between source and output
- **Advantage:** Explainable (shows why hallucination detected)

---

## 3. RETRIEVAL-AUGMENTED GENERATION (RAG)

### A. Overview & Hallucination Mitigation
- **Title:** "Hallucination Mitigation for RAG Systems - A Review"
- **Published:** MDPI Mathematics, 2024
- **URL:** https://www.mdpi.com/2227-7390/13/5/856
- **Coverage:** Constrainted decoding, output filtering, guided generation
- **Key Tools:** Outlines (grammar-constrained), NeMo Guardrails

### B. MEGA-RAG (Multi-Evidence Grounded)
- **Paper:** "MEGA-RAG: Multi-Evidence Guided Answer Refinement"
- **Focus:** Public health, applicable to any domain
- **URL:** https://pmc.ncbi.nlm.nih.gov/articles/PMC12540348/
- **Innovation:** 3-layer retrieval (dense + BM25 + KG) + reranking + discrepancy module

### C. Structured Output RAG
- **Paper:** "Reducing hallucination in structured outputs via RAG"
- **Published:** ACL 2024 (NAACL Industry Track)
- **URLs:**
  - https://arxiv.org/abs/2404.08189
  - https://aclanthology.org/2024.naacl-industry.19/
- **Method:** JSON schema enforcement with retrieval grounding

---

## 4. GROUNDED GENERATION & ATTRIBUTION

### A. Survey: "Attribution, Citation, and Quotation"
- **Title:** "Evidence-based Text Generation with LLMs"
- **URL:** https://arxiv.org/html/2508.15396v1
- **Scope:** Complete overview of grounding techniques
- **Key Concept:** Every claim must link to source evidence

### B. Citation-Grounded Code Comprehension
- **Paper:** "Citation-Grounded Code Comprehension: Hybrid Retrieval + Graph-Augmented"
- **URL:** https://arxiv.org/abs/2512.12117
- **Achievement:** 92% citation accuracy, ZERO hallucinations
- **Method:** Combines code graph structure with retrieval

### C. Researcher's Guide to LLM Grounding
- **Source:** Neptune AI Blog
- **URL:** https://neptune.ai/blog/llm-grounding
- **Practical:** Implementation guidelines for production

### D. Anonymization for Grounding (2025)
- **Paper:** "Improving LLM Attachment to External Knowledge via Entity Anonymization"
- **URL:** https://arxiv.org/html/2511.11946
- **Insight:** Anonymizing entities reduces internal knowledge interference

---

## 5. NATURAL LANGUAGE INFERENCE (NLI)

### A. HaluMap (2025 ACL)
- **Already listed above**
- **Key:** NLI as hallucination detector
- **Tools:** distilbert-base-uncased-xnli (free)

### B. Hierarchical NLI
- **Title:** "Reducing hallucinations via hierarchical semantic piece"
- **URL:** https://link.springer.com/article/10.1007/s40747-025-01833-9
- **Method:** Multi-level semantic consistency checking

---

## 6. FORMAL VERIFICATION

### A. LLM Causal Expression Verification
- **Paper:** "A Formal Verification Framework for LLM-Generated Causal Expressions"
- **URL:** https://openreview.net/forum?id=hCCCOtPQYJ
- **Method:** Formal logic checking via do-calculus semantics

### B. Logical Reasoning Enhancement
- **Title:** "Empowering LLMs with Logical Reasoning"
- **URL:** https://arxiv.org/pdf/2502.15652
- **Scope:** Comprehensive survey of logical frameworks

### C. Consistency Checking
- **Paper:** "Consistency is the Key: Detecting Hallucinations via Inconsistencies"
- **URL:** https://arxiv.org/html/2511.12236
- **Method:** Fact-to-fact consistency verification

### D. Global Consistency (Noisy Oracles)
- **Paper:** "Foundations of Global Consistency Checking with Noisy LLM Oracles"
- **URL:** https://arxiv.org/html/2601.13600
- **Algorithm:** Adaptive divide-and-conquer for hitting-set repair

---

## 7. CONFIDENCE CALIBRATION (2025-2026)

### A. Comprehensive Survey (June 2025)
- **Title:** "Uncertainty Quantification and Confidence Calibration in LLMs"
- **URLs:**
  - https://arxiv.org/abs/2503.15850
  - https://dl.acm.org/doi/full/10.1145/3744238
- **Taxonomy:** 4 uncertainty types (input, reasoning, parameter, prediction)
- **Status:** SOTA techniques catalogued

### B. Confidence-First Paradigm (March 2026 - CUTTING EDGE)
- **Paper:** "Confidence Before Answering: Paradigm Shift for Efficient UQ"
- **URL:** https://arxiv.org/abs/2603.05881
- **Method:** CoCA - Confidence-Calibration + Answer (GRPO RL framework)
- **Innovation:** Confidence estimated BEFORE generating answer
- **Impact:** Recent & advanced

### C. Calibration with Distractors
- **Paper:** "Calibrating Verbalized Confidence with Self-Generated Distractors"
- **URL:** https://openreview.net/forum?id=pZs4hhemXc
- **Method:** Generate false options to measure real confidence

---

## 8. MULTI-AGENT VERIFICATION

### A. LoCal Framework (ACM Web Conference 2025)
- **Title:** "LoCal: Logical and Causal Fact-Checking with LLM-Based Multi-Agents"
- **URL:** https://dl.acm.org/doi/10.1145/3696410.3714748
- **Status:** Published at top-tier conference (March 2025)

### B. Tool-MAD (Diverse Tool-Augmented Debate)
- **Paper:** "Tool-MAD: Multi-Agent Debate Framework for Fact Verification"
- **URL:** https://arxiv.org/abs/2601.04742
- **Innovation:** Adaptive query refinement during debate
- **Components:** Multiple agents + heterogeneous tools + consensus mechanism

### C. DelphiAgent (Trustworthy Framework)
- **Title:** "DelphiAgent: Trustworthy Multi-Agent Verification Framework"
- **URL:** https://www.sciencedirect.com/science/article/abs/pii/S0306457325001827
- **Method:** Emulates Delphi method for transparency

### D. A-HMAD (Adaptive Heterogeneous Multi-Agent Debate)
- **URL:** https://link.springer.com/article/10.1007/s44443-025-00353-3
- **Features:** Diverse roles + dynamic routing + learned consensus

### E. Improving Factuality via Debate
- **URL:** https://composable-models.github.io/llm_debate/
- **Paper:** Shows multi-agent debate significantly improves mathematical + factual reasoning

---

## 9. INFORMATION EXTRACTION (NER)

### A. Document-Level NER (Graph-Based)
- **Title:** "From local to global: Leveraging document graph for NER"
- **URL:** https://www.sciencedirect.com/science/article/abs/pii/S0950705125000656
- **Method:** Span graph + global dependencies

### B. Biomedical NER Survey
- **Title:** "NER and Relationship Extraction for Biomedical Text - Survey"
- **URL:** https://www.sciencedirect.com/science/article/abs/pii/S0925231224019428
- **SOTA Benchmarks:** 84-92% F1 on standard datasets

### C. Multi-Domain Extraction
- **Title:** "Information Extraction from Multi-Domain Scientific Documents"
- **URL:** https://www.mdpi.com/2076-3417/15/16/9086
- **Models Tested:** BERT, LLaMA, GLiNER, spaCy

### D. GPT-NER (LLM-Based with Verification)
- **Insight:** Prompts LLM to verify entities after extraction
- **Reduces:** Over-confident entity predictions

---

## 10. SPAN-BASED & EXTRACTIVE METHODS

### A. Span-Oriented Information Extraction
- **Paper:** "Span-Oriented Information Extraction: A Unifying Perspective"
- **URL:** https://arxiv.org/abs/2403.15453
- **Concept:** Extractive (safe) vs Abstractive (hallucination-prone)

### B. NLI + RAG + NER Integration
- **Paper:** "Combining NER and RAG to Spot Hallucinations"
- **Published:** SemEval 2025
- **URL:** https://aclanthology.org/2025.semeval-1.160.pdf
- **Method:** Extract entities, aggregate via RAG, verify with LLM

### C. Extractive Fact Decomposition
- **Paper:** "Extractive Fact Decomposition for Interpretable NLI"
- **URL:** https://arxiv.org/abs/2509.18901
- **Advantage:** Fact-by-fact traceability

---

## 11. GUARDRAILS & OUTPUT VALIDATION

### A. NeMo Guardrails (NVIDIA)
- **Documentation:** https://docs.nvidia.com/nemo/guardrails/
- **GitHub:** https://github.com/NVIDIA-NeMo/Guardrails
- **Paper:** https://arxiv.org/abs/2310.10501
- **Features:** Colang DSL, multiple rail types, streaming support
- **2025 Update:** Real-time hallucination detection for streaming

### B. Guardrails AI (Open Source)
- **GitHub:** https://github.com/guardrails-ai/guardrails
- **Focus:** Pydantic + RAIL specs
- **Validation:** Type + structure + content guardrails

### C. JSON Schema & Structured Generation
- **Guide:** "How to Ensure LLM Output Adheres to JSON Schema"
- **URL:** https://modelmetry.com/blog/how-to-ensure-llm-output-adheres-to-a-json-schema
- **Tools:** Outlines, grammar-based decoding
- **Benefit:** Format certainty (hallucination-free structure)

---

## 12. TEMPERATURE & SAMPLING

### A. Temperature Effects Study
- **Paper:** "The Effect of Sampling Temperature on Problem Solving"
- **URL:** https://arxiv.org/abs/2402.05201
- **Finding:** Temperature 0-2 doesn't eliminate hallucinations

### B. Common Misconception
- **Insight:** Low temperature ≠ fewer hallucinations
- **Reality:** Removes flexibility, CAN increase hallucinations
- **Source:** https://blog.gdeltproject.org/understanding-hallucination-in-llms-a-brief-introduction/

---

## 13. DOCUMENT & VISION ANALYSIS

### A. Google Vision API Confidence
- **Study:** "Relationship between GCV Confidence and Human Agreement"
- **URL:** https://www.researchgate.net/figure/Relationship-between-Google-Cloud-Vision-GCV-confidence-and-human_fig3_345978159
- **Key:** Confidence score doesn't guarantee accuracy

### B. Vision Robustness Issues
- **Paper:** "Google's Cloud Vision API is Not Robust to Noise"
- **URL:** https://arxiv.org/abs/1704.05051
- **Problem:** Rotated images, noise → incorrect labels

### C. Countering Vision Inconsistency
- **Paper:** "Countering Inconsistent Labelling for Rotated Images"
- **URL:** https://arxiv.org/abs/1911.07201
- **Solution:** Multiple orientations + ensemble

---

## 14. QUESTION GENERATION

### A. Template-Based QG
- **Paper:** "Template-Based Question Generation from Retrieved Sentences"
- **URLs:**
  - https://arxiv.org/abs/2004.11892
  - https://github.com/awslabs/unsupervised-qa
- **Advantage:** Deterministic, zero hallucination

### B. Data-Driven vs LLM Generation
- **Review:** "A Review on Question Generation from Natural Language Text"
- **URL:** https://dl.acm.org/doi/10.1145/3468889
- **Finding:** Template > LLM-generated for reliability

### C. Single-Choice Question Generation
- **Paper:** "Template-Based Generator for Single-Choice Questions"
- **URL:** https://link.springer.com/article/10.1007/s10758-023-00659-5

---

## 15. HUMAN-IN-THE-LOOP AI

### A. Best Practices 2025
- **Source:** Witness AI Blog
- **URL:** https://witness.ai/blog/human-in-the-loop-ai/
- **Key:** Define roles, identify checkpoints, verify outputs

### B. Identity & Auditability
- **Principle:** Every human must be authenticated
- **Goal:** No anonymous reviews, no shared logins
- **Impact:** Full traceability for journalism

### C. Active Learning Integration
- **Concept:** Human feedback → Model improvement
- **Timeline:** Continuous feedback loops

---

## 16. EU AI ACT COMPLIANCE

### A. Main Regulation
- **Source:** EU Digital Strategy
- **URL:** https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- **Key Dates:**
  - August 2025: GPAI rules effective
  - August 2026: High-risk AI requirements

### B. Transparency Code (Draft 2025)
- **URL:** https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- **Requirement:** Mark AI-generated content
- **Goal:** Integrity of information ecosystem

### C. High-Risk AI Article 13
- **Document:** "Article 13: Transparency and Information to Deployers"
- **URL:** https://artificialintelligenceact.eu/article/13/
- **Requires:** Risk assessment, audit trail, instructions

---

## 17. JOURNALISM & MEDIA AI

### A. AI Impacts on Press Freedom
- **Source:** Global Investigative Journalism Network (GIJN)
- **URL:** https://gijn.org/stories/ai-impacts-press-freedom-investigative-journalism/
- **Focus:** Challenges & opportunities for journalists

### B. AI-Driven Fact-Checking Review
- **Paper:** "AI-Driven Fact-Checking in Journalism"
- **URLs:**
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5122225
  - https://www.researchgate.net/publication/390228680

### C. AI in News Generation Accountability
- **Title:** "Artificial Intelligence and Journalistic Ethics"
- **URL:** https://www.mdpi.com/2673-5172/6/3/105
- **Issue:** Responsibility when AI makes errors

### D. Public Accountability Research
- **Study:** "Public accountability and regulatory expectations for AI in journalism"
- **URL:** https://link.springer.com/article/10.1007/s00146-025-02591-5
- **Finding:** Citizens want transparency + human oversight

---

## 18. GROQ PRICING & INFRASTRUCTURE

### A. Rate Limits & Free Tier
- **Source:** Groq Console Documentation
- **URL:** https://console.groq.com/docs/rate-limits
- **Free Tier:** Sufficient for moderate usage

### B. Pricing Guide 2025
- **Source:** Eesel AI
- **URL:** https://www.eesel.ai/blog/groq-pricing
- **Model:** Pay-per-token (input + output)
- **Discounts:** Batch API (50%), Prompt caching (50%)

### C. Official Pricing
- **URL:** https://groq.com/pricing
- **On-Demand:** Token-based billing

---

## 19. MISCELLANEOUS RESOURCES

### A. Vector Databases for Retrieval
- **Implied:** FAISS, Pinecone, Supabase (vector support)
- **Use:** Dense retrieval for RAG

### B. Knowledge Graphs
- **Mentioned:** Neo4j for structured retrieval
- **Alternative:** Supabase relations

### C. BM25 Keyword Search
- **Standard:** For keyword-based retrieval layer

---

## SUMMARY BY TOPIC

### Best Sources for Each Problem

| Problem | Best Source | 2nd Best | 3rd Best |
|---------|------------|----------|----------|
| Overall hallucination | Nature 2024 (Semantic Entropy) | Lakera 2026 | OpenAI Sept 2025 |
| Detection (practical) | vLLM HaluGate | SelfCheckGPT | HaluMap (ACL 2025) |
| Grounding | MEGA-RAG paper | Citation-Grounded Code | Researcher's Guide |
| Verification | Multi-Agent Debate papers | NLI methods | Formal verification |
| Extraction | Biomedical NER survey | Document-level NER | GPT-NER pattern |
| Confidence | March 2026 CoCA paper | June 2025 Survey | Calibration with Distractors |
| Journalism | GIJN + Reuters | Ethical AI papers | Media studies |
| Compliance | EU Digital Strategy | High-Risk Article | Transparency Code |

---

**Total Sources Reviewed:** 60+
**Unique Papers:** 35+
**Frameworks Evaluated:** 10+
**Latest Update:** March 2026
**Knowledge Cutoff:** February 2025 (extended to March 2026 via web search)

---

**Note:** All links verified as of March 11, 2026. Some may require institutional access or be paywalled.
