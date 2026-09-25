# SolvikBrand

A modern cybersecurity investigation, link routing, and telemetry analysis platform featuring real-time visitor device diagnostics, geographic IP mapping, and forensic CSV export.

## Overview

**SolvikBrand** is an investigative intelligence platform designed to track and analyze digital engagement across custom tracking tokens. Operators can configure unique investigation campaigns, attach transparent destination URL wrappers, and inspect incoming telemetry (including screen resolution, user agent, browser engine, operating system, and geolocation coordinates) within a secure dashboard.

## Features

- **Secure Owner Authentication**: Session-based JSON Web Token (JWT) authorization using modern `jose` cryptography with HTTP-only security cookies.
- **Dynamic Link Wrapping**: Generate investigation tokens that seamlessly capture visitor metrics and redirect users toward target destinations.
- **Device & Client Diagnostics**: Automated client-side telemetry capture (viewport dimensions, pixel ratios, hardware concurrency, and user agent parsing).
- **Interactive Geospatial Visualization**: Integrated Leaflet map visualization displaying coordinate pins for logged visits.
- **Forensic CSV Export**: One-click extraction of complete investigation audit logs and timestamps for external reporting.
- **Configurable Application Domain**: Dynamic link generation adapted to local or production origins via `NEXT_PUBLIC_APP_URL`.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **ORM & Database**: Prisma ORM with SQLite database
- **Authentication**: `jose` (JWT signing & verification), `bcryptjs`
- **Mapping**: Leaflet & React Leaflet
- **Validation**: Zod schema validation
- **Language**: TypeScript

## Architecture

```
Target User (Clicks Investigation Link)
                │
                ▼
     /t/[token] Telemetry Landing Page
                │
                ├─► Client Diagnostics (Resolution, User Agent, IP)
                ├─► POST /api/visits (Prisma Database Logging)
                │
                ▼
     Automatic Redirect to Destination URL
                │
                ▼
     Admin Dashboard (/dashboard)
                │
                ├── JWT Authenticated Session
                ├── Interactive Leaflet Map Visualizer
                └── CSV Audit Log Exporter
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/            # Login and session termination routes
│   │   ├── investigations/  # Campaign CRUD & CSV export handlers
│   │   └── visits/          # Visitor telemetry ingestion endpoint
│   ├── dashboard/           # Owner metrics, campaigns, and Leaflet map views
│   ├── login/               # Administrative login form
│   ├── t/[token]/           # Public tracking redirector page
│   ├── layout.tsx           # Global shell
│   └── page.tsx             # Root redirector & public entry
├── components/
│   └── MapView.tsx          # Leaflet coordinate map visualization
├── lib/
│   ├── auth.ts              # JWT signing, cookie management, session verification
│   ├── crypto.ts            # Password hashing & comparison utilities
│   ├── db.ts                # Prisma client singleton
│   └── rateLimit.ts         # In-memory IP rate limiter
├── prisma/
│   ├── schema.prisma        # Owner, Investigation, and Visit data models
│   └── seed.ts              # Database bootstrapper and password hasher
└── .env.example             # Environment configuration template
```

## Getting Started

### Prerequisites

- Node.js 18.17+ or 20+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vardhan-billakanti/Solvikbrand.git
   cd Solvikbrand
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Initialize the database and create owner credentials:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000/login](http://localhost:3000/login) to access the owner portal.

## Available Scripts

- `npm run dev`: Start the local Next.js development server.
- `npm run build`: Generate Prisma client and compile production bundle.
- `npm run start`: Run the production Next.js server.
- `npm run lint`: Run ESLint rules.
- `npm run db:push`: Push the Prisma schema directly to SQLite.
- `npm run db:seed`: Seed the database with the administrator account.

## Security

Owner passwords are encrypted using multi-round bcrypt hashing prior to storage. Session tokens are signed using cryptographic JWTs and distributed exclusively through secure, HTTP-only browser cookies. Sensitive local database files and environment configurations are excluded from git tracking.

## Author

**Billakanti Jaya Vardhan**
- GitHub: [@vardhan-billakanti](https://github.com/vardhan-billakanti)
