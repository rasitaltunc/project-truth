# ZERO HALLUCINATION RESEARCH SOURCES
## Complete Reference Library (2025-2026 SOTA)

---

## AREA 1: GROUNDED ENTITY EXTRACTION

### Core Research

**[1] Combining NER and RAG to Spot Hallucinations in LLM**
- **Conference:** SemEval-2025 Task 3
- **Link:** https://aclanthology.org/2025.semeval-1.160.pdf
- **Key Finding:** NER + RAG integration detects hallucinated entities with 95%+ accuracy
- **Use for:** Entity extraction validation

**[2] Advancing Grounded Multimodal Named Entity Recognition via LLM-Based Reformulation**
- **Authors:** Li et al.
- **Semantic Scholar:** https://www.semanticscholar.org/paper/Advancing-Grounded-Multimodal-Named-Entity-via-and-Li-Li/ddc9ace77727d8dd57ecd643f7477753d6498fd2
- **Key Technique:** RiVEG framework — joint MNER-VE-VG reformulation
- **Relevance:** Visual grounding for multimodal documents (photos + text)

**[3] Deepchecks ORION: SOTA Detection of Hallucinations**
- **Link:** https://www.deepchecks.com/deepchecks-orion-sota-detection-hallucinations/
- **Status:** Production-ready commercial + open-source versions
- **Performance:** Outperforms proprietary solutions
- **Cost:** ~$0.50/document (commercial) or free (open-source)
- **Integration:** Post-extraction validation for high-risk entities

**[4] Reducing Hallucinations via Hierarchical Semantic Piece**
- **Source:** Complex & Intelligent Systems, Springer Nature
- **Link:** https://link.springer.com/article/10.1007/s40747-025-01833-9
- **Technique:** HSP extraction + evidence matching via embedding cosine similarity
- **Benefit:** 30% token reduction + better hallucination detection
- **Complexity:** Medium (embedding-based approach)

**[5] How Much Do LLMs Hallucinate in Document Q&A? 172-Billion-Token Study**
- **Link:** https://arxiv.org/html/2603.08274v1
- **Sample Size:** 172B tokens, 35 models, 3 hardware platforms
- **Finding:** Grounding ≠ low fabrication (independent capabilities)
- **Importance:** Baseline fabrication rates for open-weight LLMs (late 2025)

---

## AREA 2: FAITHFUL RAG & GROUNDED Q&A

### Core Research

**[6] Toward Faithful Retrieval-Augmented Generation with Sparse Autoencoders**
- **arXiv:** https://arxiv.org/abs/2512.08892
- **Published:** December 2025
- **Innovation:** RAGLens — lightweight hallucination detector using mechanistic interpretability
- **Mechanism:** SAEs identify features triggered during RAG hallucinations
- **Status:** Research, but moving toward production (2026)

**[7] Hallucination Mitigation for Retrieval-Augmented Large Language Models: A Review**
- **Source:** MDPI Mathematics, Vol. 13, No. 5
- **Link:** https://www.mdpi.com/2227-7390/13/5/856
- **Scope:** Comprehensive review of mitigation techniques
- **Coverage:** Knowledge FFN overemphasis, Copying Head failures, conflict resolution

**[8] ReDeEP: Detecting Hallucination via Mechanistic Interpretability**
- **Link:** https://openreview.net/forum?id=ztzZDzgfrh
- **Approach:** Track internal model activations during generation
- **Advantage:** Real-time hallucination detection during inference
- **Timeline:** Experimental now, production 2026-2027

**[9] MEGA-RAG: Multi-Evidence Guided Answer Refinement**
- **Source:** PMC
- **Link:** https://pmc.ncbi.nlm.nih.gov/articles/PMC12540348/
- **Domain:** Public health (easily generalizable)
- **Performance:** Significant hallucination mitigation through multi-evidence routing

**[10] Ontology-Grounded Knowledge Graphs for Clinical Q&A**
- **Source:** ScienceDirect
- **Link:** https://www.sciencedirect.com/science/article/abs/pii/S1532046426000171
- **Result:** 98% accuracy, 1.7% hallucination rate (vs. 48-63% for GPT/DeepSeek)
- **Lesson:** Ontology constraints are POWERFUL for domain-specific Q&A
- **Applicable to:** Project Truth's domain ontology (person, organization, event, etc.)

**[11] RAG Evaluation: A Complete Guide for 2025**
- **Link:** https://www.getmaxim.ai/articles/rag-evaluation-a-complete-guide-for-2025/
- **Content:** Practical RAG evaluation methodology
- **Key Metrics:** Retrieval relevance + generation faithfulness (joint measurement)

**[12] Legal RAG Hallucinations Study**
- **Source:** Stanford, Journal of Empirical Legal Studies
- **Link:** https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf
- **Domain:** Legal documents (closest to Project Truth use case)
- **Findings:** Baseline hallucination rates in legal Q&A systems

---

## AREA 3: RELATIONSHIP INFERENCE & UNCERTAINTY

### Core Research

**[13] GLR: Graph Chain-of-Thought with LoRA Fine-Tuning and Confidence Ranking**
- **Source:** MDPI Applied Sciences, Vol. 15, No. 13
- **Link:** https://www.mdpi.com/2076-3417/15/13/7282
- **Published:** June 2025
- **Innovation:** P(True)-based confidence evaluation mechanism
- **Use Case:** Knowledge graph completion with uncertainty quantification
- **Result:** Enhanced reasoning + prediction reliability
- **Directly Applicable:** Project Truth's proposed_links system

**[14] Uncertainty Management in Knowledge Graph Construction: A Survey**
- **Dagstuhl Research Online Publication Service**
- **Link:** https://drops.dagstuhl.de/storage/08tgdk/tgdk-vol003/tgdk-vol003-issue001/TGDK.3.1.3/TGDK.3.1.3.pdf
- **Scope:** Comprehensive taxonomy of uncertainty sources in KG
- **Relevance:** Applicable to relationship inference pipeline

**[15] Knowledge Graph Completion: Rule-Based Approaches**
- **Link:** https://drops.dagstuhl.de/storage/01oasics/oasics-vol138-rw2024+rw2025/OASIcs.RW.2024-2025.1/OASIcs.RW.2024-2025.1.pdf
- **Technique:** Rule-based completion (alternative to pure ML)
- **Advantage:** Interpretable, explainable inferences

**[16] Google Enterprise Knowledge Graph: Confidence Scores**
- **Link:** https://cloud.google.com/enterprise-knowledge-graph/docs/confidence-score
- **Production System:** Google's actual KG confidence scoring methodology
- **Lesson:** How real systems handle uncertainty at scale

---

## AREA 4: FAITHFUL SUMMARIZATION

### Core Research

**[17] Hallucination Detection and Mitigation Framework for Faithful Summarization**
- **Source:** Scientific Reports (Nature), 2025
- **Link:** https://www.nature.com/articles/s41598-025-31075-1
- **Framework:** Q-S-E methodology (Questions-Sorting-Evaluation)
- **Mechanism:** Iterative hallucination detection → resolution
- **Effectiveness:** Quantitative hallucination detection with transparency
- **Directly Applicable:** Document summarization pipeline

**[18] A Survey on Hallucination in Large Language Models**
- **Source:** ACM Transactions on Information Systems
- **Link:** https://dl.acm.org/doi/10.1145/3703155
- **Scope:** Taxonomy, challenges, open questions on hallucination
- **Reference:** Foundational survey for understanding hallucination types

**[19] ROUGE, FactCC, and BertScore Comparison**
- **Source:** EdinburghNLP awesome-hallucination-detection
- **Link:** https://github.com/EdinburghNLP/awesome-hallucination-detection
- **Metrics Covered:** ROUGE-L, FactCC, BertScore, BartScore comparisons
- **Use:** Automated evaluation of summary faithfulness

**[20] FactScore: Fine-Grained Factual Evaluation**
- **Reference:** Mentioned in multiple papers (Nature, ACL papers)
- **Method:** Decomposes text into atomic facts, scores each independently
- **Use Case:** Spot-check high-risk documents

**[21] Quantifying Hallucination in Faithfulness Evaluation**
- **Source:** ACL Findings NAACL 2025
- **Link:** https://aclanthology.org/2025.findings-naacl.433.pdf
- **Key Insight:** How to measure hallucination in evaluation itself (meta-problem)

---

## AREA 5: EVIDENCE-GROUNDED CLASSIFICATION

### Core Research

**[22] CLAIMCHECK: Evaluating Grounded LLM Critiques**
- **Source:** ACL 2025
- **Link:** https://aclanthology.org/2025.findings-emnlp.1185.pdf
- **Technique:** Framework for assessing groundedness of LLM classifications
- **Finding:** LLMs struggle grounding weaknesses to claims
- **Application:** Validate annotation labels

**[23] INTEGROUND: Verification and Retrieval Planning**
- **Source:** ACL 2025
- **Link:** https://aclanthology.org/2025.findings-emnlp.732.pdf
- **Framework:** Multi-stage verification + evidence retrieval
- **Relevance:** Methodologically similar to Project Truth's verification layer

**[24] KG-Grounded Narrative Extraction with LLM Ensembles**
- **Source:** MDPI Applied Sciences, Vol. 16, No. 4
- **Link:** https://www.mdpi.com/2076-3417/16/4/1962
- **Technique:** Ensemble LLMs with knowledge graph grounding
- **Use Case:** Extract entities/events/relationships from text

**[25] FACTS Grounding Leaderboard**
- **Link:** https://storage.googleapis.com/deepmind-media/FACTS/FACTS_grounding_paper.pdf
- **Public Benchmark:** 860 examples of long-form grounding
- **Use:** Benchmark Project Truth's annotation accuracy

**[26] Harnessing LLM Ensembles for KG-Grounded Extraction**
- **Technique:** Multiple LLMs voting on classifications
- **Advantage:** Reduces individual model biases
- **Cost:** 3x API calls but higher confidence

---

## AREA 6: TRANSLATION & MULTILINGUAL

### Core Research

**[27] Hallucinations in Large Multilingual Translation Models**
- **Source:** MIT Transactions of the ACL
- **Link:** https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00615/118716/Hallucinations-in-Large-Multilingual-Translation
- **Finding:** Different hallucination rates across language pairs
- **Relevance:** Back-translation validation for EN↔TR

**[28] Understanding and Detecting Hallucinations in Neural Machine Translation**
- **Source:** MIT TACL
- **Link:** https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00563/116414/Understanding-and-Detecting-Hallucinations-in
- **Technique:** Model introspection to detect translation hallucinations
- **Practical:** Framework for detecting meaning-changing mistranslations

**[29] LLM Translation Hallucination Index 2026**
- **Link:** https://www.analyticsinsight.net/llm/llm-translation-hallucination-index-2026-which-models-add-drop-or-rewrite-meaning-most-ranked/
- **Ranking:** Which models hallucinate least in translation
- **Key Finding:** Gemini-2.0-Flash: 0.7% hallucination rate (best in class)

**[30] How AI Hallucinations Undermine Translation**
- **Source:** Brightlines Translation Services
- **Link:** https://brightlinestranslation.com/how-ai-hallucinations-undermine-translation/
- **Practical Guide:** Types of translation hallucinations + examples

---

## GENERAL ANTI-HALLUCINATION TECHNIQUES

### Chain-of-Verification & Self-Consistency

**[31] Chain-of-Verification Reduces Hallucination**
- **arXiv:** https://arxiv.org/abs/2309.11495
- **ACL 2024 Findings:** https://aclanthology.org/2024.findings-acl.212.pdf
- **Result:** 23% F1 score improvement through self-critique
- **Mechanism:** Draft → Verify questions → Answer → Refine
- **Cost:** 1 additional API call per query

**[32] Self-Consistency Checking for LLMs**
- **Technique:** Generate 3 independent responses, check agreement
- **Effectiveness:** Catches 60%+ of hallucinations
- **Cost:** 3x API calls
- **Best for:** High-stakes questions only

### Constitutional AI & RLHF

**[33] Constitutional AI Explained: Beyond RLHF**
- **Source:** Medium, February 2026
- **Link:** https://medium.com/predict/constitutional-ai-explained-the-next-evolution-beyond-rlhf-for-safe-and-scalable-llms-8ec31677f959
- **Innovation:** AI self-critique against written principles
- **Advantage:** Scales human feedback through constitutional principles

**[34] Constitutional AI: Harmlessness from AI Feedback**
- **Source:** Anthropic
- **Link:** https://www-cdn.anthropic.com/7512771452629584566b6303311496c262da1006/Anthropic_ConstitutionalAI_v2.pdf
- **Technique:** Two-phase training (critique + revision)
- **Use:** Foundation for system prompts with TRUTH_CONSTITUTION

**[35] RLHF & Constitutional AI: How AI Learns Human Values**
- **Link:** https://learn-prompting.fr/blog/rlhf-constitutional-ai-guide
- **Comparison:** RLHF vs. Constitutional AI trade-offs

### Citation-Required Generation

**[36] Exploring LLM Citation Generation in 2025**
- **Source:** Medium, Preston Blackburn
- **Link:** https://medium.com/@prestonblckbrn/exploring-llm-citation-generation-in-2025-4ac7c8980794
- **Overview:** State of citation generation in 2025

**[37] CiteLab: Developing and Diagnosing LLM Citation**
- **Source:** ACL Demo 2025
- **Link:** https://aclanthology.org/2025.acl-demo.47.pdf
- **Tool:** Interactive platform for evaluating citation quality
- **Metric:** Generation-time vs. post-hoc citation

**[38] Generation-Time vs. Post-hoc Citation: Holistic Evaluation**
- **arXiv:** https://arxiv.org/html/2509.21557
- **PDF:** https://www.arxiv.org/pdf/2509.21557v2
- **Comparison:** Two paradigms for citation-augmented generation
- **Finding:** 30-50% of responses unsupported even in GPT-4o with web search

**[39] Attribution, Citation, and Quotation Survey**
- **arXiv:** https://arxiv.org/html/2508.15396v1
- **Scope:** Evidence-based text generation taxonomy
- **Techniques:** FRONT, LongCite, Self-Cite, ReCLAIM, Chain-of-Thought Citation

### Confidence Calibration & Uncertainty Quantification

**[40] Uncertainty Quantification and Confidence Calibration in LLMs: Survey**
- **arXiv:** https://arxiv.org/abs/2503.15850
- **ACM KDD 2025:** https://dl.acm.org/doi/10.1145/3711896.3736569
- **Published:** March 2025
- **Scope:** Comprehensive taxonomy of UQ methods
- **Key Finding:** Traditional methods struggle; new taxonomy proposed

**[41] Tutorial: UQ and Confidence Calibration in LLMs (KDD 2025)**
- **Link:** https://xiao0o0o.github.io/2025KDD_tutorial/
- **Format:** Interactive tutorial with code examples
- **Topics:** Input, reasoning, parameter, prediction uncertainty

**[42] Benchmarking UQ Methods: LM-Polygraph**
- **Source:** MIT TACL
- **Link:** https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00737/128713/Benchmarking-Uncertainty-Quantification-Methods
- **Tool:** LM-Polygraph benchmark suite
- **Use:** Evaluate and calibrate confidence scores

**[43] Cycles of Thought: Measuring LLM Confidence**
- **arXiv:** https://arxiv.org/html/2406.03441v1
- **Technique:** Stable explanations → confidence measurement
- **Metric:** Consistency of reasoning reveals confidence

**[44] Quantifying LLMs Uncertainty with Confidence Scores**
- **Source:** Capgemini Invent Lab
- **Link:** https://medium.com/capgemini-invent-lab/quantifying-llms-uncertainty-with-confidence-scores-6bb8a6712aa0
- **Practical:** How to extract and use confidence scores

**[45] TopologyUQ: Graph-Based Uncertainty**
- **Technique:** Extract explanations, structure as graphs, measure graph-edit distances
- **Use:** Quantify reasoning uncertainty

### Human-in-the-Loop & Verification Workflows

**[46] Human-in-the-Loop for Hallucination Mitigation (2025)**
- **Link:** https://www.indium.tech/blog/ai-hallucinations/
- **Framework:** HITL workflow design
- **Effectiveness:** Up to 99.8% accuracy with human oversight

**[47] Human in the Loop: Verifying AI Citation Trust**
- **Source:** Medium
- **Link:** https://medium.com/@barrettrestore/what-is-human-in-the-loop-verifying-ai-citation-trust-2f51a41647ec
- **Focus:** Citation verification workflows

**[48] Generative AI Hallucination Detect: LLM Methods & Human Loop**
- **Link:** https://futureagi.com/blogs/detect-hallucination-generative-ai-2025
- **2025 Methods:** Layered detection + human intervention

**[49] What is Human-in-the-Loop in Agentic AI**
- **Link:** https://blog.anyreach.ai/what-is-human-in-the-loop-in-agentic-ai-building-trust-through-intelligent-fallback/
- **Focus:** Intelligent fallback to humans

**[50] Human-in-the-Loop Review Workflows for LLM Applications**
- **Source:** Comet.ml
- **Link:** https://www.comet.com/site/blog/human-in-the-loop/
- **Implementation:** Practical workflow patterns

### Constrained Generation & Structured Output

**[51] Constrained Decoding for Structured LLM Output**
- **Blog:** Michael Brenndoerfer
- **Link:** https://mbrenndoerfer.com/writing/constrained-decoding-structured-llm-output
- **Technique:** Grammar-guided generation using EBNF/regex/JSON schema
- **Benefit:** Prevents hallucinated output formats

**[52] Output Constraints as Attack Surface (Security Note)**
- **arXiv:** https://arxiv.org/html/2503.24191v1
- **Warning:** Constrained decoding can be jailbroken
- **Lesson:** Layer multiple constraints, don't rely on single guard

---

## STATE OF HALLUCINATION IN 2026

### Meta-Analysis & Trends

**[53] LLM Hallucinations in 2026: Understanding AI's Most Persistent Quirk**
- **Source:** Lakera (AI Safety)
- **Link:** https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models
- **2026 Status:** Hallucinations reduced but not eliminated
- **Strategy:** Managed uncertainty, not zero hallucination

**[54] AI Hallucination Rates Across Models 2026**
- **Link:** https://www.aboutchromebooks.com/ai-hallucination-rates-across-different-models/
- **Baseline:** Current state-of-the-art rates
- **Key Finding:** Gemini-2.0-Flash-001: 0.7% (best public)

**[55] It's 2026. Why Are LLMs Still Hallucinating?**
- **Source:** Duke University Libraries Blogs
- **Link:** https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/
- **Analysis:** Fundamental limitations + current solutions

**[56] Mitigating Hallucination in LLMs: Application-Oriented Survey**
- **arXiv:** https://arxiv.org/abs/2510.24476
- **HTML:** https://arxiv.org/html/2510.24476v1
- **Scope:** RAG, Reasoning, Agentic Systems
- **Timeline:** Published late 2025, encompasses 2025-2026 methods

**[57] Large Language Modeling of Hallucination Mitigation**
- **Source:** ScienceDirect
- **Link:** https://www.sciencedirect.com/science/article/abs/pii/S0893608025008779
- **Topic:** Emotion-wheel framework for understanding hallucinations

**[58] Understanding LLM Hallucinations and Mitigation Strategies**
- **Source:** Kili Technology
- **Link:** https://kili-technology.com/blog/understanding-llm-hallucinations-and-them
- **Guide:** Practical mitigation handbook

**[59] Reducing Hallucinations with Amazon Bedrock Agents**
- **Source:** AWS
- **Link:** https://aws.amazon.com/blogs/machine-learning/reducing-hallucinations-in-large-language-models-with-custom-intervention-using-amazon-bedrock-agents/
- **Platform:** Production implementation guide

**[60] Survey: Hallucinations and Attribution to Prompting Strategies**
- **Source:** Frontiers in AI
- **Link:** https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1622292/full
- **PMC:** https://pmc.ncbi.nlm.nih.gov/articles/PMC12518350/
- **Finding:** Hallucinations ≠ just prompting; model-level issue

---

## KEY BENCHMARKS & LEADERBOARDS

1. **Vectara Hallucination Benchmark** — Current state-of-the-art ranking
   - Gemini-2.0-Flash-001: 0.7% (April 2025)
   - Monitor at: vectara.com/benchmark

2. **FACTS Grounding Leaderboard** — 860 grounding examples
   - Public benchmark for evaluating faithfulness
   - Link: deepmind.com/facts-grounding

3. **RIKER Methodology** — Ground-truth-first evaluation
   - 35 models tested across 3 platforms
   - Distinguishes grounding from fabrication resistance

4. **ACL/EMNLP 2025** — Recent publications on hallucination
   - Track papers from: https://aclanthology.org
   - Keywords: hallucination, faithfulness, grounding

---

## RECOMMENDED READING ORDER

1. **Start here:** Papers [17, 31, 40] — Understand current SOTA techniques
2. **Then:** Papers [6, 7, 8] — Mechanistic interpretability frontier
3. **Application:** Papers [13, 22, 34] — Specific to Project Truth domains
4. **Validation:** Papers [38, 42, 43] — How to measure success
5. **Deep dive:** Papers [1-5, 10] — Foundation knowledge

---

## STAY UPDATED

### Conferences & Venues
- **ACL 2026** (May 2026) — Upcoming papers on hallucination
- **NeurIPS 2025** (December 2025) — Recent advances in interpretability
- **ICLR 2025** (May 2025) — Published papers on grounding
- **arXiv** — Daily papers on hallucination (search: "hallucination LLM")

### Researchers to Follow
- **Anthropic** (Constitutional AI pioneers)
- **DeepSeek** (claims very low hallucination in R1)
- **Google DeepMind** (FACTS grounding, mechanistic interp.)
- **OpenAI** (latest updates on o1, reasoning models)

### Tools & Libraries
- **Deepchecks** — Hallucination detection (ORION)
- **LM-Polygraph** — UQ benchmarking
- **Comet.ml** — HITL workflow management
- **Langchain/LlamaIndex** — RAG framework integration

---

**Last Updated:** March 13, 2026
**Next Review:** May 15, 2026 (post-launch evaluation)
**Maintained By:** Claude (AI Research Agent)
