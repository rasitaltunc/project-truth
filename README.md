# Project Truth

A 3D network visualization platform for investigative journalism and evidence-based storytelling.

![Project Truth](docs/screenshot.png)

## About

Project Truth is an open-source platform that transforms fragmented information into meaningful visual narratives. Built for investigative journalists, researchers, and truth-seekers, it combines 3D network visualization with AI-driven analysis to map complex connections, evidence chains, and investigative networks.

## Key Features

- **3D Network Visualization** — Interactive three-dimensional graph visualization with tier-based layout, evidence-driven physics, and cinematic camera controls
- **Evidence-Based Connections** — Layer evidence types, confidence scores, and source provenance directly onto relationship links with epistemological color-coding
- **Multi-Lens Analysis** — Switch between 5 intelligent viewing modes (full network, main story, follow-money, evidence map, timeline) with AI-powered recommendations
- **Community Intelligence** — Peer nomination system, reputation staking, badge tiers, and collective gap-filling with transparent verification layers
- **Journalist Protection** — Dead man switch safeguard, secure media upload with metadata stripping, and cryptographic evidence timestamping
- **Open Source & Federated** — AGPL-3.0 licensed, extensible REST API, GraphML export for academic use, and protocol-ready for decentralized verification networks

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Supabase account (free tier eligible)
- Groq API key (free tier eligible)

### Installation

```bash
# Clone repository
git clone https://github.com/rasitaltunc/ai-os.git
cd ai-os

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase + Groq credentials

# Start development server
pnpm run dev
```

Navigate to `http://localhost:3000/truth` to explore the Epstein network demo.

## Architecture

```
ai-os/
├── apps/
│   ├── dashboard/         # Project Truth 3D Dashboard (Next.js)
│   │   ├── src/
│   │   │   ├── app/       # App router + API routes
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/     # Custom React hooks
│   │   │   ├── lib/       # Utilities + Supabase client
│   │   │   └── store/     # Zustand state management
│   │   └── public/        # Static assets
│   ├── bot/               # Atlas Telegram Bot (Telegraf)
│   ├── truth-bot/         # Truth Telegram Bot
│   ├── web/               # Marketing website
│   └── miniapp/           # Telegram mini app
├── CLAUDE.md              # Development context
├── CONTRIBUTING.md        # Contribution guidelines
└── package.json           # Monorepo configuration
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 16.1.6 |
| UI Framework | React | 19 |
| 3D Engine | Three.js + React Three Fiber | Latest |
| State Management | Zustand | Latest |
| Styling | Tailwind CSS | Latest |
| Backend | Supabase (PostgreSQL) | Latest |
| AI | Groq SDK | llama-3.3-70b |
| Bot Framework | Telegraf | Latest |
| Database Sync | Supabase Realtime | Latest |

## Development

```bash
# Start all apps
pnpm run dev

# Run dashboard only
cd apps/dashboard && pnpm run dev

# Run tests
pnpm run test

# Build for production
pnpm run build

# Lint code
pnpm run lint
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style and conventions
- Git workflow
- Pull request process
- Community standards

## Issues & Support

Found a bug? Have a feature idea? 
- [Report a bug](https://github.com/rasitaltunc/ai-os/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/rasitaltunc/ai-os/issues/new?template=feature_request.md)
- [Start a discussion](https://github.com/rasitaltunc/ai-os/discussions)

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.

This project is open source and community-driven. Commercial licensing available upon request.

## Citation

If you use Project Truth in academic research, please cite:

```bibtex
@software{project_truth_2026,
  title = {Project Truth: Open Source Network Visualization for Investigative Journalism},
  author = {Altunç, Raşit},
  year = {2026},
  url = {https://github.com/rasitaltunc/ai-os},
  license = {AGPL-3.0}
}
```

## Creator

**Raşit Altunç** — rasitaltunc@gmail.com

Vision: Transform fragmented information into meaningful visual narratives. Make truth discoverable.

---

**Status**: Active Development (Sprint 11+)  
**Last Updated**: March 7, 2026
