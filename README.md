# SkillForge

SkillForge is an evidence-backed developer credibility platform. It helps technical candidates present what they can actually do, not just what they claim on a resume or LinkedIn.

The product combines:

- a visual skill graph
- GitHub-verified proof for skills
- trust scoring and evidence summaries
- peer vouching with eligibility constraints
- complement matching between developers
- XP and level progression

The current application runs on Next.js, TypeScript, Prisma, and PostgreSQL while preserving the original legacy UI through a migration wrapper.

## Why SkillForge Exists

Traditional hiring artifacts are weak at representing technical depth:

- resumes are static and compressed
- LinkedIn is broad, self-reported, and keyword-heavy
- recruiters often lack a fast way to distinguish evidence-backed skills from inflated claims

SkillForge addresses that problem by turning a candidate profile into a structured skill system:

- skills are displayed as a connected graph instead of a flat list
- public GitHub proof is used to verify and score skill claims
- trust signals are visible to profile viewers
- peer endorsements are restricted to people qualified to vouch for that skill
- complement matching helps surface team fit, not just individual similarity

## Current Product Scope

### User-facing pages

- `Landing page`
  - DB-backed hero stats
  - featured profile and sample tree
  - activity ticker
  - testimonials
- `Discover page`
  - search by name, role, and skill
  - sorting by level, vouches, newest, and match score
  - public browsing with optional auth-enhanced match data
- `Profile page`
  - skill tree rendering
  - evidence-backed skills
  - trust indicators
  - vouches
  - owner-only skill and edge management

### Core platform features

- JWT authentication
- registration, login, and `me` endpoint
- skill CRUD
- skill graph edges between skills
- GitHub proof verification for supported skills
- structured evidence records per skill
- evidence-derived levels
- trust scoring and verification summaries
- vouching with skill-level eligibility checks
- complement matching between developers
- XP and level progression

### Platform and operational features

- admin content endpoints for featured user and testimonials
- analytics event tracking and admin analytics summary endpoint
- upload endpoint with virus-scan hook support
- SendGrid notification queue support
- Algolia search sync queue support
- Server-Sent Events endpoint for realtime notifications
- CI, security docs, validation, rate limiting, and security headers

## Tech Stack

### Application

- Next.js 16 App Router
- React 19
- TypeScript

### Data and persistence

- PostgreSQL
- Prisma 7
- `@prisma/adapter-pg`

### Security and validation

- JWT
- bcrypt
- Zod

### Integrations

- GitHub API
- SendGrid
- Algolia
- Server-Sent Events

### Tooling

- ESLint
- Prettier
- Husky
- lint-staged
- Jest
- ts-jest
- Playwright

## Architecture

SkillForge is currently a modern monolith.

### Frontend architecture

The visual product experience is still delivered through the original legacy HTML/CSS/JS pages:

- `frontend/LandingPage.html`
- `frontend/Discover.html`
- `frontend/profile.html`

These pages are mounted into Next.js using:

- `src/components/legacy/LegacyPage.tsx`
- `src/lib/legacy-pages.ts`
- `src/app/legacy-scripts/[page]/route.ts`

This preserves the existing UI while allowing the backend, routing, and platform services to live inside the Next.js application.

### Backend architecture

All backend behavior is implemented as Next.js route handlers under `src/app/api`.

Key API groups:

- `auth`
- `discover`
- `skills`
- `vouches`
- `match`
- `users`
- `site-content`
- `analytics`
- `admin`
- `uploads`
- `realtime`

### Service layer

Business logic is separated into service modules under `src/lib`.

Examples:

- `auth.ts` for auth helpers
- `jwt.ts` for token generation and verification
- `github-proof.ts` for GitHub proof parsing and verification
- `matches.ts` for complement scoring and cache recomputation
- `progress.ts` for XP and level updates
- `skill-levels.ts` for evidence-derived levels
- `skill-signals.ts` for trust and verification summaries
- `validation.ts` for request validation
- `analytics.ts` for usage tracking
- `email.ts` for notification queueing
- `search.ts` for search indexing queueing
- `uploads.ts` for file storage and scan orchestration
- `realtime.ts` for SSE event broadcasting

## Data Model

The Prisma schema defines the following main entities:

- `User`
- `Skill`
- `SkillEvidence`
- `SkillEdge`
- `Vouch`
- `Match`
- `SiteSetting`
- `Testimonial`
- `Upload`
- `Notification`
- `AnalyticsEvent`
- `SearchIndexJob`
- `ContentAuditLog`

High-level relationships:

- a user has many skills
- a skill has many evidence records
- a user can connect skills via edges
- users can vouch for another user’s specific skill
- complement matches are cached between user pairs
- landing page content is DB-backed

## Skill Verification and Trust Model

The credibility layer is the central differentiator in SkillForge.

### Current verification flow

When a user adds a supported skill with public GitHub proof:

1. the system validates the GitHub URL
2. the proof must point to a public GitHub resource
3. the system checks ownership/identity consistency
4. evidence is extracted and normalized
5. a skill level is derived from the verified evidence
6. trust signals are computed and exposed on the profile

### Trust signals exposed on skills

- `proof_url`
- `primary_proof_url`
- `evidence_count`
- `verified_evidence_count`
- `verification_status`
- `verification_summary`
- `trust_score`
- `level_source`

### Vouching rules

Vouching is intentionally constrained:

- you cannot vouch your own skill
- you must hold the same skill yourself
- your level must be equal to or higher than the target skill level

This makes vouches closer to qualified endorsements than generic likes.

## Complement Matching

SkillForge includes a cached complement-matching system.

The current matching model:

- compares two users based on non-overlapping skills
- rewards complementarity rather than sameness
- stores a cached score in the database
- powers private match lists for authenticated users

This helps users identify:

- collaborators
- co-founders
- missing team capabilities
- technically complementary candidates

## Security and Hardening

The current codebase includes the following production-readiness measures:

- Zod request validation on critical write paths
- JWT auth for protected endpoints
- bcrypt password hashing
- rate limiting for auth, API, proof verification, and vouch creation
- security headers via Next middleware
- environment variable validation in production
- Husky pre-commit hooks
- Jest-based automated tests for the hardened/auth slice
- CI workflows for build, tests, and security audit

See [SECURITY.md](./SECURITY.md) for the security policy.

## Project Structure

```text
skillforge/
├── frontend/                  # legacy UI pages preserved during migration
│   ├── LandingPage.html
│   ├── Discover.html
│   ├── profile.html
│   ├── api.js
│   └── auth-modal.js
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── api/              # Next.js route handlers
│   │   ├── discover/
│   │   ├── legacy-scripts/
│   │   ├── profile/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── legacy/
│   ├── lib/                  # application services and helpers
│   ├── middleware/
│   └── tests/
├── .github/workflows/
├── package.json
├── next.config.mjs
├── prisma.config.ts
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env` and set the values you need.

Required:

- `DATABASE_URL`
- `JWT_SECRET`

Optional:

- `GITHUB_TOKEN`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY`
- `ALGOLIA_INDEX_NAME`

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Update `.env` with a valid PostgreSQL connection string and JWT secret.

### 3. Generate Prisma client

```bash
npm run db:generate
```

### 4. Push schema to the database

```bash
npm run db:push
```

### 5. Seed demo data

```bash
npm run db:seed
```

### 6. Run the app

```bash
npm run dev
```

Open:

- `http://localhost:3000`

## Demo Accounts

The seed script creates demo users. Default password:

```text
password123
```

Examples:

- `aryan@example.com`
- `lisa@example.com`
- `james@example.com`
- `yuki@example.com`
- `sofia@example.com`
- `chen@example.com`

## Scripts

### Application

```bash
npm run dev
npm run build
npm run start
```

### Database

```bash
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

### Code quality

```bash
npm run lint
npm run typecheck
npm run format
npm run format:check
```

### Tests

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:ci
npm run test:unit
npm run test:integration
npm run test:e2e
```

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Public and profile discovery

- `GET /api/site-content/landing`
- `GET /api/discover`
- `GET /api/users/:userId/profile`
- `GET /api/users/:userId/skills`
- `GET /api/users/:userId/vouches`

### Skills

- `POST /api/skills`
- `PUT /api/skills/:skillId`
- `DELETE /api/skills/:skillId`
- `POST /api/skills/edges`
- `DELETE /api/skills/edges/:edgeId`

### Vouches

- `POST /api/vouches`
- `DELETE /api/vouches/:vouchId`

### Matching

- `GET /api/match/:userId`

### Platform services

- `POST /api/analytics/events`
- `GET /api/realtime/events`
- `POST /api/uploads`

### Admin

- `GET /api/admin/analytics`
- `GET /api/admin/content`
- `PUT /api/admin/content`

## Testing Status

The repository currently includes:

- Jest-based unit and route tests for the hardened/auth slice
- CI-oriented coverage checks
- Playwright configuration for end-to-end testing

Current automated verification used in development:

- `npm run typecheck`
- `npm test`
- `npm run test:ci`
- `npm run build`

## Current Product Status

SkillForge is functional and usable for the current core flows:

- auth
- profile browsing
- discover browsing
- skill creation with GitHub proof verification
- skill graph management
- vouching
- match viewing

At the same time, some platform pieces are still infrastructure-first rather than fully productized in the UI:

- uploads exist as an API capability, not yet a polished end-user proof upload flow
- SendGrid and Algolia are wired as service integrations, but require real production credentials and operational wiring
- admin and analytics currently exist at the API level rather than as a complete frontend dashboard
- the visual UI is intentionally preserved through the legacy wrapper rather than fully rewritten as React components

## Design Direction

The visual design is intentionally distinctive. Instead of a generic SaaS dashboard, SkillForge uses a manga/comic-inspired interface with:

- bold typography
- thick ink borders
- speech-bubble motifs
- animated reveals and motion accents
- a high-contrast editorial look

That UI is preserved during the migration so product behavior can evolve without losing the original visual identity.

## Notes for Contributors

- do not commit secrets or `.env` files
- prefer `rg` for search and `apply_patch`-style edits for targeted changes
- treat the legacy UI as production behavior unless a redesign is explicitly intended
- when updating business rules, keep API behavior, trust signals, and seeded demo flows consistent

## License

No license has been added to this repository yet. If this project is intended for public distribution, add an explicit license before release.
