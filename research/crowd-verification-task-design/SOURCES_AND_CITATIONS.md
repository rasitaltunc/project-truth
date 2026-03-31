# SOURCES AND CITATIONS
## Complete Reference List for Crowd-Sourced Verification Task Design Research

**Research Period:** March 25, 2026
**Total Sources Reviewed:** 50+ platforms, academic papers, and practical implementations
**Coverage:** 10 major platforms + academic research on micro-tasks, gamification, and crowd verification

---

## PLATFORM DOCUMENTATION & OFFICIAL SOURCES

### Zooniverse (Citizen Science Platform)

**Official Resources:**
- [What's going on with the classify interface? Part One | Zooniverse Blog](https://blog.zooniverse.org/2018/06/04/whats-going-on-with-the-classify-interface-part-one/)
- [Galaxy Zoo Classify Interface](https://www.zooniverse.org/projects/zookeeper/galaxy-zoo/classify)
- [Example Project - Zooniverse Help](https://help.zooniverse.org/getting-started/example/)
- [The two-and-a-bit page guide to running a Zooniverse project](https://static.zooniverse.org/www.citizensciencealliance.org/downloads/zooniverse_guide.pdf)
- [Zooniverse Design Blog](https://blog.zooniverse.org/tag/design/)
- [Galaxy Zoo - Wikipedia](https://en.wikipedia.org/wiki/Galaxy_Zoo)
- [Galaxy Zoo Results & Publications](https://www.zooniverse.org/projects/zookeeper/galaxy-zoo/about/results)
- [Galaxy Zoo Project Blog](https://blog.galaxyzoo.org/)

**Key Finding:** Zooniverse uses confidence sliders (post-2018 redesign) to capture annotator uncertainty, improving learning efficiency. Conditional branching reduces cognitive load (ask follow-up questions only if initial answer meets condition).

**Snapshot Serengeti (Zooniverse Sub-Project):**
- [Snapshot Serengeti Project Blog](https://blog.snapshotserengeti.org/)
- [Computer Vision: Serengeti | Zooniverse](https://www.zooniverse.org/projects/alexbfree/computer-vision-serengeti)
- [Zooniverse Blog: Snapshot Serengeti Launch](https://blog.zooniverse.org/2012/12/11/snapshot-serengeti-2/)
- [FAQ | Snapshot Serengeti](https://www.zooniverse.org/projects/zooniverse/snapshot-serengeti/about/faq)
- [Snapshot Serengeti - Scientific Data (Nature Publishing)](https://www.nature.com/articles/sdata201526)
- [Can citizen science analysis of camera trap data be used to study reproduction? | Wildlife Biology](https://bioone.org/journals/wildlife-biology/volume-2021/issue-2/wlb.00833/)

**Key Finding:** Simple consensus algorithm (if disagreement detected, show image to more people) scales quality control dynamically. 28,000 registered users generated 10.8M classifications with >92% accuracy on consensus decisions.

---

### Wikipedia - Articles for Deletion Process

**Official Documentation:**
- [Wikipedia:Articles for deletion (AfD How-To)](https://en.wikipedia.org/wiki/Wikipedia:AFDHOWTO)
- [Wikipedia:Articles for deletion (Main Policy)](https://en.wikipedia.org/wiki/Wikipedia:Articles_for_deletion)
- [Wikipedia AfD: How Articles for Deletion Works | Reputation X](https://blog.reputationx.com/articles-for-deletion)
- [Wikipedia:Deletion process](https://en.wikipedia.org/wiki/Wikipedia:Deletion_process)
- [Wikipedia:Guide to deletion](https://en.wikipedia.org/wiki/Wikipedia:Guide_to_deletion)
- [Template:AfD in 3 steps](https://en.wikipedia.org/wiki/Template:AfD_in_3_steps)
- [How Wikipedia Handles Deletion: Speedy, Proposed, and AfD | Remove Digital](https://removedigital.com.au/how-wikipedia-handles-deletion-speedy-proposed-and-afd/)

**Academic Analysis:**
- [Deletion Discussions in Wikipedia: Decision Factors and Outcomes | Jodi Schneider](https://jodischneider.com/pubs/wikisym2012.pdf)
- [Analyzing Wikipedia Deletion Debates with a Cost-Sensitive Learning Approach | Carnegie Mellon (Mayfield & Black, 2019)](https://www.cs.cmu.edu/~awb/papers/2019_Mayfield_CSCW.pdf)
- [What's in the Content of Wikipedia's Article for Deletion Discussions? | ACM Digital Library](https://dl.acm.org/doi/fullHtml/10.1145/3308560.3316750)
- [Participation in Wikipedia's Article Deletion Processes | R. Stuart Geiger](https://stuartgeiger.com/papers/article-deletion-wikisym-geiger-ford.pdf)

**Key Finding:** AfD succeeds because justification/reasoning matters infinitely more than vote direction. All arguments public, signed, timestamped. Creates accountability. Admin synthesizes (doesn't count votes), respects principled minority if well-argued.

---

### ICIJ Datashare (Document Collaboration Platform)

**Official Resources:**
- [GitHub - ICIJ/datashare: A self-hosted search engine for documents](https://github.com/ICIJ/datashare)
- [About Datashare | ICIJ Datashare Gitbook](https://icij.gitbook.io/datashare)
- [Datashare Main Site](https://datashare.icij.org/)
- [Datashare: Help test and improve our latest journalism tool - ICIJ](https://www.icij.org/inside-icij/2019/02/datashare-help-test-and-improve-our-latest-journalism-tool/)
- [Datashare platform to keep growing with new focus on collaboration - ICIJ](https://www.icij.org/inside-icij/2021/02/icijs-datashare-platform-to-keep-growing-with-new-focus-on-collaboration/)
- [What is Datashare? FAQs | ICIJ](https://www.icij.org/inside-icij/2019/11/what-is-datashare-frequently-asked-questions-about-our-document-analysis-software/)
- [Datashare's new plug-in helps investigative journalists connect the dots | ICIJ](https://www.icij.org/inside-icij/2024/02/datashares-new-plug-in-helps-investigative-journalists-connect-the-dots-with-graphs/)
- [ICIJ/datashare Wiki - GitHub](https://github.com/ICIJ/datashare/wiki/Home)

**Key Finding:** Asynchronous collaboration (star, tag, annotate) with lightweight friction. No formal voting/consensus needed—expert journalists trust each other. Named entity extraction automatic. Links between entities "carefully reviewed by ICIJ's data team" (expert curation).

---

### Bellingcat (Open Source Investigation Community)

**Official Resources:**
- [The Bellingcat Open Source Challenge is Back (2025)](https://www.bellingcat.com/resources/2025/03/03/the-bellingcat-open-source-challenge-is-back/)
- [Bellingcat's Online Investigation Toolkit](https://bellingcat.gitbook.io/toolkit)
- [Bellingcat Guides & Handbooks](https://bellingcat.gitbook.io/toolkit/resources/guides-and-handbooks)
- [Bellingcat Main Site - Home of Online Investigations](https://www.bellingcat.com/)
- [Bellingcat OpenStreetMap Search Tool](https://bellingcat.gitbook.io/toolkit/more/all-tools/openstreetmap-search-tool)
- [Open Source Investigation @ Brown Institute](https://brown.columbia.edu/open-source-investigation/)

**Key Findings:**
- 35,000 participants in recent challenges (2024-2025)
- Challenges test: geolocation, chronolocation, shiptracking, satellite imagery, image verification, flight tracking
- Leaderboards public, real-time. Top submissions featured in published Bellingcat reports
- Global Authentication Project: volunteer community explores and verifies stories
- Ground truth scoring: users immediately know if answer right/wrong + why

---

### Fact-Checking Organizations

**Teyit.org (Turkey-based):**
- [Teyit Main Site](https://www.teyit.org/)
- [About Teyit | IFCN Signatory](https://www.teyit.org/)

**Snopes (USA-based):**
- [Snopes Main Site](https://www.snopes.com/)
- [How Snopes fact-check process works | Factually.co](https://factually.co/fact-checks/media/how-snopes-fact-check-process-works-6a9a31)

**Full Fact (UK-based):**
- [Full Fact Main Site](https://fullfact.org/)

**Academic Analysis:**
- [List of fact-checking websites - Wikipedia](https://en.wikipedia.org/wiki/List_of_fact-checking_websites)
- [The Fact-Check Industry - Columbia Journalism Review](https://www.cjr.org/special_report/fact-check-industry-twitter.php)
- [Cross-checking journalistic fact-checkers | PMC/NIH](https://pmc.ncbi.nlm.nih.gov/articles/PMC10368232/)
- [Show Me the Work: Fact-Checkers' Requirements for Explainable Automated Fact-Checking | CHI 2025](https://dl.acm.org/doi/full/10.1145/3706598.3713277)
- [Fact Check (ClaimReview) Markup for Search | Google Developers](https://developers.google.com/search/docs/appearance/structured-data/factcheck)

**Key Finding:** Professional fact-checkers use expert assignment (not crowdsourcing). Multiple verification techniques per claim type. Nuanced rating scales (True, Mostly True, Mixture, Mostly False, False) + context labels (Outdated, Miscaptioned, Satire). Show all sources/reasoning publicly.

---

### DocumentCloud (Journalist Document Collaboration)

**Official Resources:**
- [DocumentCloud Main Site](https://www.documentcloud.org/home/)
- [About DocumentCloud](https://www.documentcloud.org/about/)
- [DocumentCloud FAQ](https://next.www.documentcloud.org/help/faq/)
- [DocumentCloud on Wikipedia](https://en.wikipedia.org/wiki/DocumentCloud)
- [10 Years of Turning Documents into Data: Q&A | Knight Foundation](https://knightfoundation.org/articles/10-years-of-turning-documents-into-data-a-q-a-with-documentcloud/)
- [How journalists are using DocumentCloud | American Press Institute](https://americanpressinstitute.org/how-journalists-are-using-documentcloud-to-support-facts-in-their-stories/)
- [Pinpoint vs DocumentCloud | The Media Copilot](https://mediacopilot.ai/google-pinpoint-vs-documentcloud-investigative-journalism/)
- [DocumentCloud at collaborative reporting | MuckRock](https://www.muckrock.com/news/archives/2023/jun/07/collaborative-journalism-summit-23/)
- [Getting the most out of DocumentCloud | MuckRock](https://www.muckrock.com/news/archives/2018/sep/24/dc-features/)

**Key Finding:** Annotation-first workflow. Public notes (visible to all) + private notes (personal). Collaborative markup = transparent sourcing. Used in Panama Papers investigation. No formal voting/consensus—expert journalists coordinate directly.

---

### FoldIt & EyeWire (Gamified Science)

**FoldIt:**
- [FoldIt - Wikipedia](https://en.wikipedia.org/wiki/Foldit)

**EyeWire:**
- [An investigation of player motivations in Eyewire | ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0747563216309037)

**General Gamification in Science:**
- [Serious Games for Opening Up Scientific Discovery | Wilson Center](https://www.wilsoncenter.org/blog-post/serious-games-opening-scientific-discovery/)
- [Gamifying Engagement in Spatial Crowdsourcing | MDPI 2024](https://www.mdpi.com/2079-8954/13/7/519)
- [Motivation to participate in FoldIt (PDF) | Academia.edu](https://www.academia.edu/20411864/Motivation_to_participate_in_an_online_citizen_science_game_a_study_of_Foldit)
- [Expertise and Engagement: Re-Designing Citizen Science Games | PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6884330/)
- [Do games attract or sustain engagement in citizen science? | Academia.edu](https://www.academia.edu/3564990/Do_games_attract_or_sustain_engagement_in_citizen_science_a_study_of_volunteer_motivations)
- ["A Game Without Competition Is Hardly a Game": Impact of Competitions | Semantic Scholar](https://www.semanticscholar.org/paper/%22A-Game-Without-Competition-Is-Hardly-a-Game%22:-The-Reeves-West/325d53cf71e858b10e65d33a34777fc5fdaade51)

**Key Findings:**
- What attracts: Contributing to real science (not game mechanics)
- What sustains: Points, leaderboards, community, peer learning
- Game elements alone ≠ attraction, but sustain engagement
- Optimal: Real science + game elements + community
- Failure: Too simple (boring), too hard (frustrating), pay-to-win (distrust)

---

### Ushahidi & Crisis Mapping

**Official Resources:**
- [Ushahidi Main Site](https://www.ushahidi.com/)
- [Ushahidi - Wikipedia](https://en.wikipedia.org/wiki/Ushahidi)
- [Ushahidi Crisis Preparedness Platform](https://www.ushahidi.com/in-action/crisis-preparedness-platform/)
- [Ushahidi in Crisis - Open Health News](https://www.openhealthnews.com/hotnews/ushahidi-open-source-disaster-crisis-management-mapping-tool/)
- [Crowdsourcing Crisis Information in Disaster-Affected Haiti | Preparedness Center](https://preparecenter.org/sites/default/files/crowdsourcing_crisis_information_in_disaster-affected_haiti.pdf)
- [Ushahidi: Crowdsourcing, Crisis Mapping and Elections](https://www.ushahidi.com/about/blog/an-update-crowdsourcing-crisis-mapping-and-elections/)
- [Power of crisis crowdsourcing & media broadcasting | Ushahidi Blog](https://www.ushahidi.com/about/blog/power-of-crisis-crowdsourcing-media-broadcasting-3-key-roles-for-mapping-emergencies-live/)
- [Crisis mapping - Wikipedia](https://en.wikipedia.org/wiki/Crisis_mapping)
- [Data Protection Protocols for Crisis Mapping | iRevolutions](https://irevolutions.org/2013/04/11/data-protection-for-crisis-mapping/)

**Key Findings:**
- Haiti earthquake: 40,000 reports → 4,000 mapped distinct events
- Tiered verification: low entry barrier (accept all) + selective expert verification (only critical claims) + community correction (crowd corrects crowd)
- No reward system; purely altruistic (crisis urgency)
- Crowd naturally corrects false reports (self-correction mechanism)

---

### reCAPTCHA & hCAPTCHA (Micro-Task Extraction)

**reCAPTCHA Research:**
- [reCAPTCHA: Human-based character recognition via Web security | ResearchGate](https://www.researchgate.net/publication/23171401_reCAPTCHA_Human-based_character_recognition_via_Web_security_measures)

**Comparison Articles:**
- [hCaptcha vs hCaptcha Enterprise | DEV Community](https://dev.to/scraping_eng/hcaptcha-vs-hcaptcha-enterprise-what-changes-for-your-scraper-32a8)
- [reCAPTCHA vs hCAPTCHA: How Do They Differ?](https://fluentsmtp.com/articles/recaptcha-vs-hcaptcha/)
- [reCaptcha vs hCaptcha: A Guide to Choose the Right CAPTCHA | Fluent Forms](https://fluentforms.com/recaptcha-vs-hcaptcha/)
- [hCaptcha vs reCAPTCHA: 6 Differences | Radware](https://www.radware.com/cyberpedia/bot-management/hcaptcha-vs-recaptcha/)
- [hCAPTCHA vs reCAPTCHA: A Comparison | Arkose Labs](https://www.arkoselabs.com/blog/hcaptcha-vs-recaptcha-a-comparison/)
- [hCaptcha 101: The Privacy-Focused CAPTCHA | Formspree](https://formspree.io/blog/hcaptcha/)
- [An Empirical Study & Evaluation of Modern CAPTCHAs | ArXiv](https://arxiv.org/pdf/2307.12108)

**Key Finding:** CAPTCHAs use 3-person consensus for reliability measurement. Users know if they're "correct" (can access site). Problem: No context = boring. Useful for scale (millions of users), but humans hate them.

---

### Amazon Mechanical Turk (Micro-Task Best Practices)

**Official Documentation:**
- [Amazon Mechanical Turk Best Practices](https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMechanicalTurkRequester/IntroBestPractices.html)
- [Qualifications and Worker Task Quality | MTurk Blog](https://blog.mturk.com/qualifications-and-worker-task-quality-best-practices-886f1f4e03fc)
- [Amazon Mechanical Turk Requester Best Practices Guide (PDF) | Oregon State](https://web.engr.oregonstate.edu/~burnett/CS589empirical/CS589-statisticalStudies/mechTurk_BestPractices-Amazon.pdf)
- [Developer Guide - Amazon Mechanical Turk API 2017 (PDF)](https://docs.aws.amazon.com/pdfs/AWSMechTurk/latest/AWSMechanicalTurkRequester/amt-dg.pdf)
- [Modifying HITs - AWS Documentation](https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMechanicalTurkRequester/mturk-modifying-hits.html)

**Academic Research:**
- [Confusing the Crowd: Task Instruction Quality on Amazon Mechanical Turk | AAAI](https://cdn.aaai.org/ojs/13317/13317-64-16834-1-2-20201228.pdf)
- [Reputation as a sufficient condition for data quality on MTurk | Springer](https://link.springer.com/article/10.3758/s13428-013-0434-y)
- [Quality Management on Amazon Mechanical Turk (PDF) | ResearchGate](https://www.researchgate.net/publication/228897427_Quality_Management_on_Amazon_Mechanical_Turk)

**Key Findings:**
- ⚠️ CRITICAL: Financial incentive kills quality (people optimize for speed, not accuracy)
- Gold standard (known-answer) tasks: identify workers who pass, route future work to them
- Qualifications: pre-screen workers by reputation
- Multiple assignments: route same task to 3+ workers, compare
- Attention checks: catch low-effort workers
- High-reputation workers produce 2-3x higher quality data

---

## ACADEMIC RESEARCH ON MICRO-TASKS, GAMIFICATION, CROWDSOURCING

### Micro-Task Design & Document Annotation

- [Annotation QA: Best Practices for ML Model Quality | LabelYourData](https://labelyourdata.com/articles/data-annotation/quality-assurance)
- [Data Annotation for AI: A Complete Guide | Digital Bricks](https://www.digitalbricks.ai/blog-posts/data-annotation)
- [Ensuring Quality in Data Annotation | Keymakr](https://www.keymakr.com/blog/ensuring-quality-in-data-annotation/)
- [Data labeling quality (2025) | TaskMonk](https://www.taskmonk.ai/blogs/guide-to-data-labeling-quality-2025)
- [Annotation Metrics · Prodigy](https://prodi.gy/docs/metrics)
- [Best Practices for Managing Data Annotation Projects (PDF) | Bloomberg](https://assets.bbhub.io/company/sites/40/2020/09/Annotation-Best-Practices-091020-FINAL.pdf)
- [Consensus Stage for QA: Tutorial and Use Cases | V7 Labs](https://www.v7labs.com/blog/consensus-stage)
- [Task agreement in Label Studio Enterprise | Docs](https://docs.humansignal.com/guide/stats.html)
- [Quality Assurance Techniques in Data Annotation | iMerit](https://imerit.net/resources/blog/quality-assurance-techniques-in-data-annotation/)
- [Annotator Agreement Metrics at Scale | Clever X](https://cleverx.com/blog/annotator-agreement-metrics-measuring-and-maintaining-annotation-quality-at-scale)

### Crowd-Sourced Document Verification

- [6. Putting the Human Crowd to Work | DataJournalism.com](https://datajournalism.com/read/handbook/verification-1/putting-the-human-crowd-to-work/6-putting-the-human-crowd-to-work)
- [Crowdsourced Fact-checking: Does It Actually Work? | ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0306457324001523)
- [Enhancing Fact-Checking: From Crowdsourced | CEUR](https://ceur-ws.org/Vol-3802/paper13.pdf)
- [VERIFICATION GAMES: CROWD-SOURCED FORMAL VERIFICATION (PDF) | DTIC](https://apps.dtic.mil/sti/tr/pdf/AD1006471.pdf)
- [Automated Validation of Crowdsourced Data | IEEE](https://ieeexplore.ieee.org/document/8711108)
- [Crowdsourcing in the Document Processing Practice | Springer](https://link.springer.com/chapter/10.1007/978-3-642-16985-4_36)
- [The Challenge of Verifying Crowdsourced Information | CJR](https://www.cjr.org/behind_the_news/the_challenge_of_verifying_cro.php)
- [Crowdsourcing - Wikipedia](https://en.wikipedia.org/wiki/Crowdsourcing)

### Citizen Science Task Engagement & Fatigue

- [Dynamics of Engagement in Citizen Science: "Yes, I do!"-Project | Citizen Science Theory & Practice](https://theoryandpractice.citizenscienceassociation.org/articles/10.5334/cstp.212)
- [Goals and Tasks: Two Typologies of Citizen Science Projects | ResearchGate](https://www.researchgate.net/publication/254051843_Goals_and_Tasks_Two_Typologies_of_Citizen_Science_Projects)
- [Human-machine-learning integration and task allocation | Nature](https://www.nature.com/articles/s41599-022-01049-z)
- [CONQUERING FATIGUE: THE BATTLE FOR ENGAGEMENT (PDF) | Erasmus University](https://repub.eur.nl/pub/93180/JF-Hopstaken-Conquering-fatigue.pdf)
- [Coordinating Advanced Crowd Work: Extending Citizen | CSTP](https://theoryandpractice.citizenscienceassociation.org/articles/10.5334/cstp.166)
- [Regular short-duration breaks and mental fatigue | ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0167876023000612)
- [Citizen science participant motivations and behaviour | ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0006320723001805)
- [Meeting volunteer expectations in citizen science | Taylor & Francis Online](https://www.tandfonline.com/doi/full/10.1080/09640568.2020.1853507)
- [Enhancing crowdsourcing through skill-aligned task assignment | ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S157411922500001X)

### Gamification in Journalism & Fact-Checking

- [Tips for Gamifying Your Next Investigation | GIJN](https://gijn.org/stories/tips-for-gamifying-your-next-investigation/)
- [How to gamify your investigative reporting | International Journalists' Network](https://ijnet.org/en/story/how-gamify-your-investigative-reporting/)
- [Exploring Gamification in Online Journalism | MDPI 2024](https://www.mdpi.com/2673-5172/6/3/151)
- [The Gamification of Digital Journalism | Routledge](https://www.routledge.com/The-Gamification-of-Digital-Journalism-Innovation-in-Journalistic-Storytelling/Dowling/p/book/9780367076252)
- [The gamification of journalism: a new research report | LSE Polis](https://blogs.lse.ac.uk/polis/2022/02/24/the-gamification-of-journalism/)
- [Collaborative fact-checking through participatory journalism | HAL Archive](https://hal.science/hal-03982828v1)
- [Success stories of gamification in Latin American journalism | LatAm Journalism Review](https://latamjournalismreview.org/articles/colombian-and-peruvian-news-outlets-bet-on-gamification-to-attract-young-audiences-and-make-an-impact/)
- [The Gamification of journalism (PDF) | ResearchGate](https://www.researchgate.net/profile/Raul-Ferrer-Conill-2/publication/279963059_The_Gamification_of_Journalism/)
- [Gamified Journalism: How Interactive Storytelling is Evolving | Gamification Nation](https://gamificationnation.com/blog/gamified-journalism-how-interactive-storytelling-is-evolving-the-news/)
- [Digital Journalism's Gamification | Springer](https://link.springer.com/chapter/10.1007/978-981-99-6675-2_28)

---

## KEY FINDINGS SUMMARY (By Principle)

### 1. Context Reduces Quit Rate
- **Zooniverse Galaxy Zoo:** Context = understand astronomy + contribute to science → 10.8M classifications
- **CAPTCHA:** No context = human hates it → necessary friction
- **Lesson:** Always show why this task matters

### 2. Consensus Over Voting
- **Wikipedia AfD:** Justification > votes; admin synthesizes → nuanced decisions
- **Zooniverse:** Dynamic consensus (more votes if disagreement) → scales automatically
- **MTurk:** 3-person routing + majority vote → 85%+ accuracy
- **Lesson:** Don't average opinions; require reasoning; escalate disagreement

### 3. Reputation > Money
- **FoldIt/EyeWire:** Leaderboards, recognition, real science → 40%+ retention
- **MTurk:** Financial incentive → speed optimization → quality collapse
- **Bellingcat:** Top submissions featured in reports → motivation
- **Lesson:** Recognition + opportunity > money

### 4. Task Duration Matters
- **Cognitive fatigue:** >60 minutes continuous work → quality drops
- **Optimal:** 3-7 minutes (MTurk), 30-90 seconds (reCAPTCHA), 45-90 seconds (Zooniverse)
- **Lesson:** Batch tasks; enforce breaks after 30-session task

### 5. Honeypots Catch Gaming
- **MTurk:** Gold standard tasks identify quality workers
- **reCAPTCHA:** Known-answer checks reliability
- **Lesson:** Embed 10% known-answer tasks; track accuracy

### 6. Gamification Sustains, Doesn't Attract
- **FoldIt:** Real science attracts; game elements sustain engagement
- **Wikipedia:** No games; structure + reputation sustains
- **Lesson:** Game mechanics are auxiliary; core mission drives participation

---

**END OF SOURCES AND CITATIONS**
