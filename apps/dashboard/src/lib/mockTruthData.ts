
import { NetworkNode, NetworkLink } from '@/store/truthStore';
import { EvidenceItem, TimelineEvent } from '@/store/useStore';

// Helper to create rich nodes
const createNode = (
    id: string,
    label: string,
    type: string,
    tier: number,
    risk: number,
    is_alive: boolean,
    other: any = {}
): NetworkNode & { evidence: EvidenceItem[]; timeline: TimelineEvent[]; country_tags: string[] } => ({
    id,
    label,
    type,
    tier,
    risk,
    is_alive,
    img: null, // Frontend will generate initials or define standard images later
    role: other.role || 'Associate',
    summary: other.summary || '',
    verificationStatus: other.verificationStatus || 'verified',
    evidence: other.evidence || [],
    timeline: other.timeline || [],
    country_tags: other.country_tags || [],
    ...other
});

// ==========================================
// MOCK DATA: THE LOST ARCHIVES
// ==========================================

export const MOCK_NODES = [
    // 1. JEFFREY EPSTEIN (CENTER)
    createNode('epstein', 'JEFFREY EPSTEIN', 'person', 1, 100, false, {
        role: 'FINANCIER / TRAFFICKER',
        summary: 'Jeffrey Edward Epstein was an American financier and convicted sex offender. He cultivated an elite social circle and allegedly procured underage girls for himself and his associates. Died in custody in 2019 under suspicious circumstances.',
        nationality: 'USA',
        occupation: 'Financier',
        birth_date: '1953-01-20',
        death_date: '2019-08-10',
        country_tags: ['USA', 'VIR', 'FRA'],
        evidence: [
            {
                id: 'ev-je-1',
                title: 'Palm Beach Police Report (2005)',
                evidence_type: 'legal',
                description: 'Original investigation report detailing improved solicitation of minors at Palm Beach residence.',
                source_name: 'Palm Beach PD',
                verification_status: 'verified',
                is_primary_source: true,
                source_date: '2005-11-12'
            },
            {
                id: 'ev-je-2',
                title: 'Non-Prosecution Agreement (2008)',
                evidence_type: 'legal',
                description: 'Controversial plea deal granting immunity to Epstein and potential co-conspirators.',
                source_name: 'US District Court',
                verification_status: 'verified',
                is_primary_source: true,
                source_date: '2008-09-24'
            },
            {
                id: 'ev-je-3',
                title: 'Flight Manifests (Lolita Express)',
                evidence_type: 'document',
                description: 'Logs from Boeing 727 (N908JE) showing travel with high-profile associates.',
                source_name: 'FAA Records',
                verification_status: 'verified',
                is_primary_source: true
            }
        ],
        timeline: [
            {
                id: 'tl-je-1',
                event_date: '2008-06-30',
                event_type: 'conviction',
                title: 'Guilty Plea',
                description: 'Plead guilty to state charges of solicitation of prostitution.',
                location: 'Florida',
                importance: 'critical'
            },
            {
                id: 'tl-je-2',
                event_date: '2019-07-06',
                event_type: 'arrest',
                title: 'Federal Arrest',
                description: 'Arrested at Teterboro Airport on federal sex trafficking charges.',
                location: 'New Jersey',
                importance: 'critical'
            },
            {
                id: 'tl-je-3',
                event_date: '2019-08-10',
                event_type: 'death',
                title: 'Death in Custody',
                description: 'Found unresponsive in cell at MCC New York. Ruled suicide.',
                location: 'New York',
                importance: 'critical'
            }
        ]
    }),

    // 2. GHISLAINE MAXWELL
    createNode('maxwell', 'GHISLAINE MAXWELL', 'person', 1, 95, true, {
        role: 'CO-CONSPIRATOR',
        summary: 'British socialite and daughter of media tycoon Robert Maxwell. Convicted of sex trafficking and conspiracy to commit sex trafficking in connection with Jeffrey Epstein.',
        nationality: 'GBR',
        country_tags: ['GBR', 'USA', 'FRA'],
        evidence: [
            {
                id: 'ev-gm-1',
                title: '2016 Deposition',
                evidence_type: 'legal',
                description: 'Unsealed deposition from defamation case, revealing details of recruitment operations.',
                source_name: 'US District Court/SDNY',
                verification_status: 'verified'
            }
        ],
        timeline: [
            {
                id: 'tl-gm-1',
                event_date: '2020-07-02',
                event_type: 'arrest',
                title: 'Arrested in New Hampshire',
                description: 'FBI agents raided her secluded property in Bradford, NH.',
                location: 'New Hampshire',
                importance: 'critical'
            },
            {
                id: 'tl-gm-2',
                event_date: '2021-12-29',
                event_type: 'conviction',
                title: 'Guilty Verdict',
                description: 'Found guilty on 5 of 6 counts related to sex trafficking.',
                location: 'New York',
                importance: 'critical'
            }
        ]
    }),

    // 3. PRINCE ANDREW
    createNode('andrew', 'PRINCE ANDREW', 'person', 2, 85, true, {
        role: 'ASSOCIATE',
        summary: 'Duke of York. Accused by Virginia Giuffre of sexual assault while she was a minor and being trafficked by Epstein. Settled out of court.',
        nationality: 'GBR',
        country_tags: ['GBR', 'USA'],
        evidence: [
            {
                id: 'ev-pa-1',
                title: 'Central Park Photo',
                evidence_type: 'photo',
                description: 'Photograph showing Prince Andrew walking with Epstein in Central Park after Epstein\'s 2008 conviction.',
                source_name: 'Media',
                source_date: '2010-12-01',
                verification_status: 'verified'
            },
            {
                id: 'ev-pa-2',
                title: 'Settlement Agreement',
                evidence_type: 'legal',
                description: 'Undisclosed sum paid to settle Virginia Giuffre\'s civil lawsuit.',
                source_name: 'Civil Court Filings',
                source_date: '2022-02-15',
                verification_status: 'verified'
            }
        ],
        timeline: [
            {
                id: 'tl-pa-1',
                event_date: '2019-11-16',
                event_type: 'media',
                title: 'BBC Newsnight Interview',
                description: 'Disastrous interview regarding his friendship with Epstein.',
                location: 'London',
                importance: 'high'
            }
        ]
    }),

    // 4. BILL CLINTON
    createNode('clinton', 'BILL CLINTON', 'person', 2, 60, true, {
        role: 'FORMER PRESIDENT',
        summary: '42nd President of the United States. Documented on Epstein\'s flight logs multiple times for trips to Africa and Europe.',
        nationality: 'USA',
        country_tags: ['USA'],
        evidence: [
            {
                id: 'ev-bc-1',
                title: 'Flight Logs (Africa Trip)',
                evidence_type: 'document',
                description: 'Manifests showing Clinton on N908JE for multi-day humanitarian trip.',
                source_name: 'Flight Logs',
                source_date: '2002-09-01',
                verification_status: 'verified'
            }
        ]
    }),

    // 5. DONALD TRUMP
    createNode('trump', 'DONALD TRUMP', 'person', 2, 55, true, {
        role: 'FORMER PRESIDENT',
        summary: '45th President of the United States. Longtime social acquaintance of Epstein in Palm Beach circles before reported falling out.',
        nationality: 'USA',
        country_tags: ['USA'],
        evidence: [
            {
                id: 'ev-dt-1',
                title: 'Mar-a-Lago Video (1992)',
                evidence_type: 'video',
                description: 'NBC footage showing Trump and Epstein partying together.',
                source_name: 'NBC Archives',
                source_date: '1992-11-01',
                verification_status: 'verified'
            }
        ]
    }),

    // 6. LES WEXNER
    createNode('wexner', 'LES WEXNER', 'person', 2, 70, true, {
        role: 'FINANCIER',
        summary: 'Retail tycoon (Victoria\'s Secret). Epstein\'s primary client and power of attorney holder for years. Transferred significant wealth and assets to Epstein.',
        nationality: 'USA',
        evidence: [
            {
                id: 'ev-lw-1',
                title: 'Power of Attorney',
                evidence_type: 'legal',
                description: 'Document granting Epstein full control over Wexner\'s financial affairs.',
                source_name: 'Public Records',
                source_date: '1991-07-01',
                verification_status: 'verified'
            }
        ]
    }),

    // 7. ALAN DERSHOWITZ
    createNode('dershowitz', 'ALAN DERSHOWITZ', 'person', 3, 65, true, {
        role: 'ATTORNEY',
        summary: 'Prominent lawyer who negotiated Epstein\'s 2008 non-prosecution agreement. Accused by Giuffre, denied allegations.',
        nationality: 'USA'
    }),

    // 8. LITTLE ST JAMES
    createNode('lsj', 'LITTLE ST. JAMES', 'location', 1, 90, true, {
        role: 'ISLAND',
        summary: 'Private island in USVI owned by Epstein. Alleged primary location for trafficking activities.',
        country_tags: ['VIR'],
        evidence: [
            {
                id: 'ev-lsj-1',
                title: 'Raid Footage',
                evidence_type: 'video',
                description: 'FBI raid footage showing computer equipment seizure.',
                source_name: 'FBI',
                source_date: '2019-08-12',
                verification_status: 'verified'
            }
        ]
    }),

    // 9. LEONARDO DICAPRIO (User mentioned)
    createNode('dicaprio', 'LEONARDO DICAPRIO', 'person', 4, 15, true, {
        role: 'ACTOR',
        summary: 'Mentioned in unsealed documents as someone an associate suggested contacting. No evidence of wrongdoing or visits to island.',
        nationality: 'USA',
        verificationStatus: 'unverified'
    }),

    // 10. KEVIN SPACEY
    createNode('spacey', 'KEVIN SPACEY', 'person', 3, 50, true, {
        role: 'ACTOR',
        summary: 'Mock data entry - photographed with Maxwell at Buckingham Palace.',
        nationality: 'USA'
    })
];

export const MOCK_LINKS: NetworkLink[] = [
    { source: 'epstein', target: 'maxwell', strength: 1.0, type: 'partner' },
    { source: 'epstein', target: 'andrew', strength: 0.8, type: 'associate' },
    { source: 'maxwell', target: 'andrew', strength: 0.7, type: 'associate' },
    { source: 'epstein', target: 'clinton', strength: 0.6, type: 'associate' },
    { source: 'epstein', target: 'trump', strength: 0.5, type: 'associate' },
    { source: 'epstein', target: 'wexner', strength: 0.9, type: 'financial' },
    { source: 'epstein', target: 'dershowitz', strength: 0.7, type: 'legal' },
    { source: 'epstein', target: 'lsj', strength: 1.0, type: 'ownership' },
    { source: 'epstein', target: 'spacey', strength: 0.4, type: 'associate' },
    { source: 'maxwell', target: 'spacey', strength: 0.5, type: 'associate' }
];

export const MOCK_STATS = {
    totalNodes: MOCK_NODES.length,
    totalLinks: MOCK_LINKS.length,
    totalEvidence: MOCK_NODES.reduce((acc, n) => acc + (n.evidence?.length || 0), 0)
};
