# Dvideo — Cybersecurity Investigation Platform

Professional cybersecurity investigation and telemetry platform with seamless destination URL wrapping.

## Features
- **Secure Owner Dashboard**: JWT authenticated investigation management.
- **Dvideo Link Generator**: Generate unique tokens with optional destination URL wrappers.
- **Visitor Telemetry**: Capture screen, browser, OS, and battery diagnostics.
- **Forensic CSV Export**: Export investigation reports on demand.
- **Dynamic Configurable Base URL**: Seamlessly shareable across local network and production domains via `NEXT_PUBLIC_APP_URL`.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Initialize database:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

4. Run development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the owner dashboard.
