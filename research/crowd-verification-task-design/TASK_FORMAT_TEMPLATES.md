# PRACTICAL TASK TEMPLATES FOR LEGAL DOCUMENT VERIFICATION
## Copy-paste ready formats for Project Truth

**Purpose:** Specific, tested task formats that balance engagement, quality, and speed
**Duration Goal:** 45-90 seconds per task including context
**Audience:** Users with zero legal background
**Quality Target:** 85%+ accuracy with 3-person consensus

---

## TEMPLATE 1: EXISTENCE VERIFICATION (Tier 1)

### Task Interface Layout
```
┌─────────────────────────────────────────┐
│ TASK 3 OF 10 | Maxwell Indictment     │
├─────────────────────────────────────────┤
│ WHAT: Find a person in court documents │
│ YOUR JOB: 15 seconds                    │
│                                         │
│ DOCUMENT EXCERPT:                       │
│ "The defendant, Jeffrey Epstein,        │
│  met with co-conspirator Ghislaine      │
│  Maxwell on March 15, 1991 at..."       │
│                                         │
│ QUESTION:                               │
│ Does "Ghislaine Maxwell" appear         │
│ in this excerpt?                        │
│                                         │
│ [ YES, I SEE IT  ] [ NO, NOT HERE ]    │
│ [ CAN'T READ IT  ]                     │
│                                         │
│ ← Back    SUBMIT →                     │
└─────────────────────────────────────────┘
```

### Code Structure (React)
```javascript
export const ExistenceVerificationTask = ({ person, documentExcerpt }) => {
  const [answer, setAnswer] = useState(null);

  const handleSubmit = () => {
    // Send: { task_id, person, answer, duration, user_fingerprint }
    submitVerification({
      taskType: 'existence',
      person,
      documentId: currentDocument.id,
      userAnswer: answer,
      timestamp: Date.now(),
      duration: Date.now() - taskStartTime
    });
  };

  return (
    <div className="task-container">
      <TaskProgress current={3} total={10} />
      <TaskTimer duration={15} />

      <DocumentExcerpt text={documentExcerpt} highlight={person} />

      <Question text={`Does "${person}" appear in this text?`} />

      <ButtonGroup>
        <Button onClick={() => setAnswer('yes')}>Yes, I see it</Button>
        <Button onClick={() => setAnswer('no')}>No, not here</Button>
        <Button onClick={() => setAnswer('unclear')}>Can't read it</Button>
      </ButtonGroup>

      <SubmitButton onClick={handleSubmit} disabled={!answer} />
    </div>
  );
};
```

### Quality Control
- **Honeypot:** Every 10th task uses known-answer (e.g., name clearly in excerpt)
- **Consensus:** 3 different users verify same task
- **Escalation:** If 2/3 disagree, escalate to Tier 2 review
- **Accuracy Tracking:** Show user their % correct in real-time

### Expected Performance
- Completion rate: 95%+
- Accuracy: 92%+
- Time: 15-20 seconds
- User quit rate: <5%

---

## TEMPLATE 2: DETAIL MATCHING (Tier 1-2, Conditional)

### When It Appears
Only shown if user answered "YES" in Template 1

### Task Interface
```
┌─────────────────────────────────────────┐
│ TASK 3B OF 10 | Detail Check            │
├─────────────────────────────────────────┤
│ YOU FOUND: "Ghislaine Maxwell"          │
│ in court document, page 5                │
│                                         │
│ NEXT STEP: Verify details               │
│ Are these the same person?              │
│                                         │
│ DOCUMENT SHOWS:                         │
│ Name: Ghislaine Maxwell                 │
│ Title: Co-conspirator                   │
│ Date: March 15, 1991                    │
│                                         │
│ OUR DATABASE HAS:                       │
│ Name: Ghislaine Maxwell                 │
│ Known roles: Recruiter, Financier       │
│ Dates active: 1985-2003                 │
│                                         │
│ MATCH CHECK:                            │
│ ✓ Names identical                       │
│ ? Title matches role → [LIKELY/NO]      │
│ ? Date in active period → [YES/NO]      │
│                                         │
│ IS THIS THE SAME PERSON?                │
│ [ SAME ] [ DIFFERENT ] [ UNSURE ]      │
│                                         │
│ WHY? (optional)                         │
│ [text field - max 2 sentences]          │
│                                         │
│ CONFIDENCE: [slider 1-5]                │
│                                         │
│ ← Back    SUBMIT →                     │
└─────────────────────────────────────────┘
```

### Code Structure
```javascript
export const DetailMatchingTask = ({ person, documentDetails, dbEntry }) => {
  const [answer, setAnswer] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(3);

  // Calculate match score (visual feedback)
  const matchScore = calculateNameSimilarity(
    documentDetails.name,
    dbEntry.name
  );

  return (
    <div className="task-container">
      <TaskProgress current={3} total={10} />

      <SideBySideComparison>
        <Column title="Document">
          <Detail label="Name">{documentDetails.name}</Detail>
          <Detail label="Role">{documentDetails.role}</Detail>
          <Detail label="Date">{documentDetails.date}</Detail>
        </Column>

        <Column title="Our Database">
          <Detail label="Name">{dbEntry.name}</Detail>
          <Detail label="Known roles">{dbEntry.roles.join(', ')}</Detail>
          <Detail label="Active period">{dbEntry.period}</Detail>
        </Column>
      </SideBySideComparison>

      <MatchDetails>
        <MatchLine
          field="Names"
          matchPercent={matchScore}
          status={matchScore > 0.95 ? 'match' : 'mismatch'}
        />
        <MatchLine
          field="Role consistency"
          status={roleMatches ? 'match' : 'uncertain'}
        />
        <MatchLine
          field="Date overlap"
          status={dateMatches ? 'match' : 'mismatch'}
        />
      </MatchDetails>

      <Question text="Is this the same person?" />

      <ButtonGroup>
        <Button onClick={() => setAnswer('same')}>
          Same person
        </Button>
        <Button onClick={() => setAnswer('different')}>
          Different people
        </Button>
        <Button onClick={() => setAnswer('unsure')}>
          Unsure - flag for expert
        </Button>
      </ButtonGroup>

      <TextArea
        placeholder="Why? (optional - 1 sentence)"
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        maxLength={150}
      />

      <ConfidenceSlider
        value={confidence}
        onChange={setConfidence}
        labels={['Guess', '', 'Maybe', '', 'Sure']}
      />

      <SubmitButton onClick={handleSubmit} disabled={!answer} />
    </div>
  );
};
```

### Quality Control
- **Reference**: Show database entry alongside document (reduces mental load)
- **Match visualization**: Color-coded fields (green match, red mismatch, yellow uncertain)
- **Reasoning capture**: Optional 1-sentence explanation (helps debug disagreements)
- **Confidence slider**: Calibration metric (track if "sure" users are actually right)

### Expected Performance
- Completion: 90%+
- Accuracy: 88%+ (harder than Template 1)
- Time: 45-60 seconds
- User quit rate: 8-12%

---

## TEMPLATE 3: RELATIONSHIP VERIFICATION (Tier 2+)

### Prerequisite
- User has 20+ correct existence verifications
- Shown only for flagged relationships or user-proposed connections

### Task Interface
```
┌─────────────────────────────────────────┐
│ TASK 7 OF 10 | Relationship              │
├─────────────────────────────────────────┤
│ NETWORK CONTEXT:                        │
│ You've verified 15 people.               │
│ Now: Connect Person A → Person B        │
│                                         │
│ PERSON A: Jeffrey Epstein               │
│ PERSON B: Ghislaine Maxwell             │
│                                         │
│ EVIDENCE:                               │
│ Email dated March 15, 1991:             │
│ "Meeting with GM at 3pm"                │
│                                         │
│ EVIDENCE TYPE:                          │
│ ☐ Direct communication                  │
│ ☑ Meeting/presence (checked)            │
│ ☐ Financial transfer                    │
│ ☐ Shared location                       │
│ ☐ Third-party reference                │
│                                         │
│ CONFIDENCE IN SOURCE:                   │
│ ☐ Primary (official document)           │
│ ☑ Secondary (cited in court)            │
│ ☐ Tertiary (claim needs verification)   │
│                                         │
│ QUESTION:                               │
│ Did these two people know each other?   │
│                                         │
│ [ DEFINITELY YES ] [ PROBABLY ]        │
│ [ PROBABLY NO ] [ DEFINITELY NO ]      │
│ [ NEED MORE INFO ]                     │
│                                         │
│ BRIEF EXPLANATION:                      │
│ [text field]                            │
│                                         │
│ ← Back    SUBMIT →                     │
└─────────────────────────────────────────┘
```

### Code Structure
```javascript
export const RelationshipVerificationTask = ({
  personA,
  personB,
  evidence,
  previousVerifications
}) => {
  const [answer, setAnswer] = useState(null);
  const [evidenceType, setEvidenceType] = useState([]);
  const [sourceConfidence, setSourceConfidence] = useState(null);
  const [explanation, setExplanation] = useState('');

  // Show network context
  const networkContext = buildNetworkContext(
    previousVerifications,
    personA,
    personB
  );

  return (
    <div className="task-container">
      <TaskProgress current={7} total={10} />

      <NetworkContext network={networkContext} />

      <Section title="PEOPLE TO CONNECT">
        <PersonCard person={personA} />
        <Arrow>→</Arrow>
        <PersonCard person={personB} />
      </Section>

      <Section title="EVIDENCE">
        <EvidenceCard
          content={evidence.text}
          source={evidence.source}
          date={evidence.date}
          highlight={[personA.name, personB.name]}
        />
      </Section>

      <Section title="EVIDENCE TYPE (select all that apply)">
        <Checkbox
          label="Direct communication (email, call, message)"
          checked={evidenceType.includes('communication')}
          onChange={() => toggleEvidenceType('communication')}
        />
        <Checkbox
          label="Meeting/presence in same place"
          checked={evidenceType.includes('meeting')}
          onChange={() => toggleEvidenceType('meeting')}
        />
        <Checkbox
          label="Financial transfer"
          checked={evidenceType.includes('financial')}
          onChange={() => toggleEvidenceType('financial')}
        />
        <Checkbox
          label="Shared location/company"
          checked={evidenceType.includes('shared_location')}
          onChange={() => toggleEvidenceType('shared_location')}
        />
        <Checkbox
          label="Third-party reference"
          checked={evidenceType.includes('third_party')}
          onChange={() => toggleEvidenceType('third_party')}
        />
      </Section>

      <Section title="SOURCE CONFIDENCE">
        <RadioGroup>
          <Radio
            label="Primary source (court records, official documents)"
            value="primary"
            selected={sourceConfidence === 'primary'}
            onChange={() => setSourceConfidence('primary')}
          />
          <Radio
            label="Secondary (cited in news, indictment refers to it)"
            value="secondary"
            selected={sourceConfidence === 'secondary'}
            onChange={() => setSourceConfidence('secondary')}
          />
          <Radio
            label="Tertiary (claim that needs verification)"
            value="tertiary"
            selected={sourceConfidence === 'tertiary'}
            onChange={() => setSourceConfidence('tertiary')}
          />
        </RadioGroup>
      </Section>

      <Question text={`Did ${personA.name} and ${personB.name} know each other?`} />

      <ButtonGroup>
        <Button onClick={() => setAnswer('definitely_yes')}>
          Definitely yes
        </Button>
        <Button onClick={() => setAnswer('probably_yes')}>
          Probably yes
        </Button>
        <Button onClick={() => setAnswer('probably_no')}>
          Probably no
        </Button>
        <Button onClick={() => setAnswer('definitely_no')}>
          Definitely no
        </Button>
        <Button onClick={() => setAnswer('need_more')}>
          Need more info
        </Button>
      </ButtonGroup>

      <TextArea
        placeholder="Why did you choose that answer?"
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        required
      />

      <SubmitButton onClick={handleSubmit} disabled={!answer || !explanation} />
    </div>
  );
};
```

### Quality Control
- **Evidence type classification**: Multi-select reduces ambiguity
- **Source ranking**: NATO Admiralty Code style (primary > secondary > tertiary)
- **Mandatory explanation**: Reasoning required (helps detect pattern errors)
- **Nuanced scale**: Not binary (definitely/probably/probably not/definitely)

### Expected Performance
- Completion: 85%+
- Accuracy: 78%+ (complex relationships; more disagreement OK)
- Time: 60-90 seconds
- User quit rate: 15-20% (harder task)

---

## TEMPLATE 4: DISPUTED VERIFICATION REVIEW (Tier 3, Expert)

### When It Appears
- 2/3 users disagreed on a previous task, OR
- 1/3 chose "unsure", OR
- User is Tier 3+ (expert invited to review escalations)

### Task Interface
```
┌─────────────────────────────────────────┐
│ EXPERT REVIEW | Escalated Task           │
├─────────────────────────────────────────┤
│ WHAT: Multiple users disagreed           │
│ YOUR ROLE: Make final decision            │
│                                         │
│ COMMUNITY RESPONSES:                    │
│ User 1: SAME PERSON (confidence 5)       │
│ User 2: SAME PERSON (confidence 3)       │
│ User 3: UNSURE (confidence 2)            │
│ → Consensus: 2/3 say YES, 1 unsure       │
│                                         │
│ EVIDENCE:                               │
│ [Full document excerpt]                 │
│ [Database entry]                        │
│ [Reasoning from users who chose YES]   │
│                                         │
│ YOUR ANALYSIS:                          │
│ Based on the evidence, are these        │
│ the same person?                        │
│                                         │
│ [ YES ] [ NO ] [ AMBIGUOUS (needs claim fact-check, not verification) ]
│                                         │
│ YOUR REASONING:                         │
│ [longer text field]                     │
│                                         │
│ DECISION CONFIDENCE:                    │
│ [slider 1-5]                            │
│                                         │
│ ← Back    SUBMIT (BINDING) →            │
└─────────────────────────────────────────┘
```

### Code Structure
```javascript
export const ExpertReviewTask = ({ escalationId, communityAnswers, evidence }) => {
  const [answer, setAnswer] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(3);

  // Show why community disagreed
  const disagreementAnalysis = analyzeDisagreement(communityAnswers);

  return (
    <div className="expert-review-container">
      <Section title="EXPERT REVIEW">
        <Alert type="info">
          Your decision is binding. This will be added to the verified dataset.
        </Alert>
      </Section>

      <Section title="COMMUNITY RESPONSES">
        <table>
          <tr>
            <th>User</th>
            <th>Answer</th>
            <th>Confidence</th>
            <th>Reasoning</th>
          </tr>
          {communityAnswers.map(answer => (
            <tr key={answer.userId}>
              <td>{answer.userName}</td>
              <td>{answer.answer}</td>
              <td>{answer.confidence}/5</td>
              <td>{answer.reasoning || '(none provided)'}</td>
            </tr>
          ))}
        </table>
      </Section>

      <Section title="DISAGREEMENT ANALYSIS">
        <Analysis>
          {disagre ementAnalysis.summary}
        </Analysis>
      </Section>

      <EvidenceSection evidence={evidence} />

      <Question text="Are these the same person?" />

      <ButtonGroup>
        <Button onClick={() => setAnswer('yes')}>YES</Button>
        <Button onClick={() => setAnswer('no')}>NO</Button>
        <Button onClick={() => setAnswer('ambiguous')}>
          Ambiguous (requires fact-check)
        </Button>
      </ButtonGroup>

      <TextArea
        placeholder="Your detailed reasoning (fact-checkers will read this)"
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        required
        rows={5}
      />

      <ConfidenceSlider
        value={confidence}
        onChange={setConfidence}
      />

      <SubmitButton
        onClick={handleSubmit}
        disabled={!answer || !reasoning}
        warning="This decision is final and binding."
      />
    </div>
  );
};
```

### Quality Control
- **Binding decision**: Expert answer overrides community (no further appeals)
- **Reasoning captured**: Fact-checkers read expert reasoning
- **Disagreement analysis**: Show WHY community disagreed (patterns matter)
- **Confidence recalibration**: Track if expert confidence predicts agreement with other experts

### Expected Performance
- Completion: 70%+ (expert task, not mandatory)
- Accuracy: 90%+ (selected pool of Tier 3+ experts)
- Time: 3-5 minutes
- User quit rate: N/A (experts commit to completion)

---

## TEMPLATE 5: QUICK FEEDBACK LOOP (Post-Verification)

### After Every Task
```
┌─────────────────────────────────────────┐
│ RESULT                                  │
├─────────────────────────────────────────┤
│ ✓ CORRECT!                              │
│                                         │
│ You matched with 2 other users          │
│ (Confidence: High)                      │
│                                         │
│ This added 1 person to the network.     │
│ Current network: 147 people verified    │
│                                         │
│ YOUR ACCURACY: 18/20 (90%)              │
│                                         │
│ → Ready for next task? [CONTINUE]      │
│ → See your profile [PROFILE]           │
│ → Take a break [LATER]                 │
└─────────────────────────────────────────┘
```

### Code
```javascript
export const TaskFeedback = ({ result, userStats, networkStats }) => {
  return (
    <div className="feedback-container">
      <ResultStatus status={result.status} />

      <Consensus
        agreeCount={result.agreementCount}
        totalVoters={result.totalVoters}
      />

      <NetworkImpact
        peopleAdded={result.newPeople}
        connectionsAdded={result.newConnections}
        totalPeople={networkStats.totalVerified}
      />

      <UserStats
        accuracy={userStats.accuracy}
        tier={userStats.tier}
        nextTierProgress={userStats.nextTierProgress}
      />

      <ContinueOptions>
        <Button primary onClick={nextTask}>Continue to next task</Button>
        <Button secondary onClick={goToProfile}>See your profile</Button>
        <Button secondary onClick={takeBr eak}>Take a break</Button>
      </ContinueOptions>
    </div>
  );
};
```

---

## ANTI-GAMING MEASURES (Implementation Checklist)

### Honeypot Strategy
```javascript
// Every 10th task is a known-answer honeypot
if (taskCount % 10 === 0) {
  return generateHoneypotTask(); // Name obviously in document, etc.
}

// Track honeypot accuracy per user
if (user.honeypotAccuracy < 0.8) {
  pauseUser('Your recent answers suggest quality issues. Please review feedback.');
}
```

### Rate Limiting
```javascript
// Max 30 tasks per session
const tasksRemaining = Math.max(0, 30 - sessionTasks);

if (tasksRemaining === 0) {
  showMessage(
    'You've completed 30 tasks! ' +
    'Take a 5-minute break to stay fresh. ' +
    'Cognitive fatigue reduces accuracy around task 35.'
  );
  pauseSession(5 * 60 * 1000);
}
```

### Streak System
```javascript
// Correct streak = bonus next task
if (lastNAnswers(5).every(a => a.correct)) {
  currentTask.bonus = 2; // 1→3 points instead of 1→1
}

// One incorrect breaks streak
if (!answer.correct) {
  streakCount = 0;
}
```

### Accuracy Monitoring
```javascript
const userAccuracy = user.correctAnswers / user.totalAnswers;

if (userAccuracy < 0.65) {
  // Low accuracy mode
  showFeedback('Your accuracy is below 65%. Please review this tutorial.');
  pauseAssignments(true);
  showGuideVideo();
} else if (userAccuracy > 0.90) {
  // Unlock Tier 2 tasks
  unlockTier2();
}
```

---

## CONFIGURATION FOR YOUR SYSTEM

### Database Schema Addition
```sql
CREATE TABLE verification_tasks (
  id UUID PRIMARY KEY,
  task_type ENUM('existence', 'detail_match', 'relationship', 'expert_review'),

  -- Entity info
  primary_entity_id UUID REFERENCES nodes(id),
  secondary_entity_id UUID REFERENCES nodes(id),

  -- Evidence
  document_id UUID REFERENCES documents(id),
  document_excerpt TEXT,
  evidence_text TEXT,

  -- Quality
  consensus_target INT DEFAULT 3,
  current_votes JSONB, -- [{user_id, answer, confidence, timestamp}]

  -- Gamification
  difficulty_level INT (1-5),
  honeypot BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE user_verification_stats (
  user_id UUID PRIMARY KEY,
  tier INT (1-5),
  total_tasks_completed INT,
  correct_answers INT,
  accuracy FLOAT,
  current_streak INT,
  honeypot_accuracy FLOAT,
  last_session_tasks INT,
  last_session_date TIMESTAMP
);
```

### Task Generation Algorithm
```python
def generate_next_task(user):
    """Intelligent task selection based on user profile"""

    # Check honeypot rate
    if (user.total_tasks + 1) % 10 == 0:
        return generate_honeypot()

    # Tier-based routing
    if user.tier == 1:
        # 70% existence, 30% detail match
        return weighted_choice([
            (0.7, generate_existence_task()),
            (0.3, generate_detail_match_task())
        ])
    elif user.tier == 2:
        # 30% detail match, 60% relationships, 10% expert review
        return weighted_choice([
            (0.3, generate_detail_match_task()),
            (0.6, generate_relationship_task()),
            (0.1, generate_expert_review_task())
        ])
    elif user.tier >= 3:
        # Primarily expert reviews + complex tasks
        return weighted_choice([
            (0.5, generate_expert_review_task()),
            (0.3, generate_relationship_task()),
            (0.2, generate_complex_task())
        ])

    # Fatigue management
    if user.tasks_this_session >= 30:
        return break_recommended()

    # Difficulty matching
    recent_accuracy = calculate_recent_accuracy(user, last_5_tasks=True)
    if recent_accuracy < 0.70:
        return easier_task_pool()
    elif recent_accuracy > 0.95:
        return harder_task_pool()

    return standard_task()
```

---

## SUCCESS METRICS TO TRACK

| Metric | Target | Monitoring |
|--------|--------|------------|
| Task completion rate | >90% | Per task type |
| Accuracy (consensus) | >85% | Rolling 30-day |
| User retention (next session) | >40% | Per cohort |
| Consensus agreement (2/3) | >80% | Per task type |
| Expert escalation rate | <5% | Watch for patterns |
| User quit rate mid-session | <10% | Per task type |
| Average task duration | 45-90s | Per task type |
| Honeypot catch rate | >80% | Per user |

---

**END OF TEMPLATES**
