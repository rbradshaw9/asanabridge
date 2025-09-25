# AsanaBridge

Two-way sync service between Asana and OmniFocus (3 & 4) - designed for DigitalOcean deployment.

## 🏗️ Current Status

**✅ Completed:**
- Production-ready TypeScript backend with Express
- Prisma ORM with PostgreSQL schema for users, tokens, sync mappings
- Structured logging with Winston
- Environment validation with Zod  
- JWT authentication service (crypto-based hashing)
- Complete Asana API integration with OAuth flow
- Docker setup optimized for DigitalOcean
- Database models for sync tracking and user management

**🔧 Next Up:**
- OmniFocus integration via local agent
- Sync engine with conflict resolution
- React frontend dashboard
- User registration/auth endpoints
- Stripe subscription integration

## 🚀 Tech Stack

**Backend:** Node.js + TypeScript + Express + Prisma  
**Database:** PostgreSQL (DigitalOcean Managed Database)  
**Auth:** JWT + OAuth (Asana)  
**Deployment:** Docker on DigitalOcean Droplet  
**Domain:** asanabridge.com

## 📋 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to dist/
npm start           # Run production server
npm run db:generate # Generate Prisma client
npm run db:migrate  # Run database migrations
npm run db:push     # Push schema changes to DB
npm run db:studio   # Open Prisma Studio
```

## 🔧 Setup

1. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Development:**
   ```bash
   npm install
   npm run db:generate
   npm run dev
   ```

3. **Docker (Production):**
   ```bash
   docker-compose up --build
   ```

## 🌐 API Endpoints

**Core:**
- `GET /health` - Health check with DB connection test
- `GET /api/status` - Service status and version

**Asana OAuth:**
- `GET /api/oauth/asana/authorize` - Get auth URL (requires JWT)
- `GET /api/oauth/asana/callback` - OAuth callback handler
- `GET /api/oauth/asana/status` - Connection status (requires JWT)
- `DELETE /api/oauth/asana/disconnect` - Disconnect account (requires JWT)
- `GET /api/oauth/asana/projects` - List projects (requires JWT)
- `GET /api/oauth/asana/projects/:id/tasks` - Get project tasks (requires JWT)

## 🗄️ Database Schema

- **Users** - User accounts with plan info (FREE/PRO)
- **AsanaTokens** - OAuth tokens with auto-refresh
- **OmniFocusSetup** - Local agent configuration
- **SyncMappings** - Project mapping between Asana ↔ OmniFocus
- **SyncLogs** - Sync history and error tracking

## 🚢 Deployment (DigitalOcean)

The project is optimized for DigitalOcean:
- Single droplet deployment with Docker
- Managed PostgreSQL database
- Domain configuration for asanabridge.com
- Health checks and logging

## 📝 License

TBD
# Deployment test Thu Sep 25 11:27:15 AST 2025
