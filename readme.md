# Bambu Farm 🎋
> Campus Centralized 3D Printing Management System (Industrial Sci-Fi Edition)

A full-stack platform to manage a fleet of 20+ Bambu Lab printers in a school environment.

## Features
- **Teacher Cockpit**: High-density "HUD" style dashboard to monitor 20 printers at once.
- **Student Portal**: Immersive "Launch Wizard" for uploading `.3mf` files.
- **Industrial Sci-Fi UI**: Dark mode, neon accents, real-time charts.
- **Automated Queue**: FIFO scheduling with priority overrides (Mocked logic).

## Tech Stack
- **Frontend**: Next.js 15, Tailwind v4, Shadcn/UI, Recharts, Framer Motion.
- **Backend**: NestJS, Prisma (SQLite), REST API.
- **Infrastructure**: Docker (PostgreSQL, Redis, Go2RTC - *Optional for Dev*).

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database** (First time only)
   ```bash
   # Create SQLite DB and Seed data
   cd apps/server
   npx prisma migrate dev --name init
   npx ts-node prisma/seed.ts
   cd ../..
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   - **Frontend**: [http://localhost:8071](http://localhost:8071)
   - **Backend API**: [http://localhost:8070](http://localhost:8070)

## Documentation
- [Requirements](docs/1_requirements.md)
- [Architecture](docs/2_architecture.md)
- [Frontend Design](docs/4_frontend_design.md)
