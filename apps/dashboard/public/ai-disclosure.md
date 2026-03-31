# AI Limitations & Disclosure — Project Truth

*Last updated: March 31, 2026*
*Version: 1.0*

## How AI Is Used on This Platform

Project Truth uses artificial intelligence as a **research assistant**, not as a decision-maker. AI helps extract information from documents and suggest connections, but **every AI output must be verified by humans** before it appears on the network.

## AI Model

- **Provider:** Groq
- **Model:** llama-3.3-70b-versatile
- **Purpose:** Entity extraction, relationship suggestion, chat-based investigation, intent classification
- **Training data cutoff:** The model's knowledge has a training cutoff and may not reflect the most recent events

## What AI Can Do

1. **Extract entities** (names, organizations, dates, locations) from uploaded documents
2. **Suggest relationships** between entities found in the same document
3. **Answer questions** about the network based on existing verified data
4. **Classify user intent** to suggest relevant network views
5. **Generate investigation labels** for nodes based on context

## What AI Cannot Do

1. **Verify information.** AI cannot determine if a claim is true or false. All verification is done by human reviewers.
2. **Access external sources in real-time.** AI works only with the data available on the platform and in the document being analyzed.
3. **Guarantee accuracy.** AI may produce incorrect extractions, miss entities, or suggest relationships that do not exist. This is why all AI output enters quarantine.
4. **Make editorial decisions.** AI does not decide what appears on the network. Humans make all final decisions.
5. **Self-assess confidence reliably.** AI-reported confidence scores are not calibrated. We use external composite scoring instead.

## Known Limitations and Risks

### Hallucination Risk
AI models can generate plausible-sounding but factually incorrect information. This is called "hallucination." On Project Truth:

- AI extractions are quarantined and require 2 independent human reviews
- AI-generated labels are marked as "AI-extracted" with a distinct visual indicator
- If AI cannot find a source for a claim, it is instructed to say "I don't know" rather than guess

### Bias
AI models reflect biases present in their training data. This may manifest as:

- Overrepresentation of English-language sources
- Potential disparate impact across demographic groups
- Variable accuracy across different document types and languages

We monitor for bias through regular testing and encourage users to report perceived bias through our error reporting system.

### Context Limitations
AI processes documents individually and may miss connections that span multiple documents. Cross-document analysis is supported but may not capture all relevant relationships.

### Language Limitations
While the platform supports multiple languages (English, Turkish), AI performance may vary across languages. Entity extraction accuracy is generally higher for English-language documents.

## Confidence Scoring

We do **not** rely on AI self-reported confidence. Instead, we use a post-hoc composite scoring system that considers:

1. **Document type** — Court records score higher than news articles
2. **Source hierarchy** — Primary sources score higher than secondary or tertiary
3. **Cross-reference count** — Entities mentioned in multiple independent sources score higher
4. **Community verification** — Peer-reviewed items score higher than unreviewed
5. **Temporal consistency** — Dates and timelines that align score higher

This approach is based on academic research showing that LLM self-confidence is poorly calibrated (Expected Calibration Error of 0.3-0.7).

## Your Rights

### Right to Explanation
You have the right to understand why a particular connection or entity appears on the network. Every item includes a provenance chain showing: source document → AI extraction → quarantine → peer review → network.

### Right to Dispute
You can dispute any AI-generated or human-verified content using our error reporting system. Disputed items are flagged for re-review.

### Right to Human Review
No content enters the public network without human review. AI suggestions that are not reviewed remain in quarantine and are not visible to other users.

### GDPR Article 22
In compliance with GDPR Article 22, no significant decisions about individuals are made solely based on automated processing. All AI outputs are reviewed by humans before publication.

## Transparency Commitment

- The AI model used is publicly known (not a black box)
- Extraction prompts are designed for precision over recall (we prefer missing information over false information)
- All AI interactions on the platform are logged in our transparency system
- We publish regular reports on AI accuracy and error rates

## Reporting AI Errors

If you believe AI has produced incorrect information:

1. Use the "Report Error" button on any node, link, or evidence item
2. Select "AI Error" as the reason
3. Provide details about what is incorrect
4. Our review team will investigate within 72 hours

## Contact

For questions about our AI practices: **ai@projecttruth.org**

---

*"AI is a tool, not a source. It suggests; humans verify."*
