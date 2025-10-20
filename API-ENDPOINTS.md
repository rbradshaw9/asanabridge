# AsanaBridge API Endpoints

## 📋 Current Endpoint Status (v2.2.1)

### ✅ Core Authentication Endpoints (KEEP)
| Method | Endpoint | Purpose | Used By |
|--------|----------|---------|---------|
| POST | `/api/auth/register` | User registration | Web |
| POST | `/api/auth/login` | Web login | Web |
| POST | `/api/auth/app-login-direct` | macOS app direct login | macOS App |
| GET | `/api/auth/validate` | Token validation | macOS App |
| GET | `/api/auth/me` | Get user info | macOS App, Web |
| GET | `/api/auth/profile` | Get user profile | Web |
| PATCH | `/api/auth/profile` | Update user profile | Web |
| PATCH | `/api/auth/password` | Change password | Web |

**Status:** All needed and actively used.

---

### ✅ Download Endpoints (CONSOLIDATED)
| Method | Endpoint | Purpose | Used By | Status |
|--------|----------|---------|---------|--------|
| GET | `/api/auth/app/download/latest` | Public DMG download | Website links, Direct links | ✅ ACTIVE |
| GET | `/api/download/agent` | Authenticated DMG download | Dashboard | ✅ ACTIVE |

**Current Setup:**
- Both serve `AsanaBridge-Latest.dmg` (488K with icon + Applications folder)
- No version number in filename
- `/api/auth/app/download/latest` - Public (no auth required)
- `/api/download/agent` - Requires authentication

**Recommendation:** Keep both for flexibility (one public, one authenticated).

---

### ⚠️ Legacy Browser Auth Flow (CONSIDER REMOVING)
| Method | Endpoint | Purpose | Used By | Status |
|--------|----------|---------|---------|--------|
| POST | `/api/auth/app-session` | Create browser auth session | macOS App (old flow) | 🟡 LEGACY |
| GET | `/api/auth/app-session` | Poll auth session status | macOS App (old flow) | 🟡 LEGACY |
| GET | `/api/auth/app-login` | Browser auth page | macOS App (old flow) | 🟡 LEGACY |
| POST | `/api/auth/app-authorize` | Complete browser auth | macOS App (old flow) | 🟡 LEGACY |

**Current Usage:** Not actively used - replaced by direct login (`/api/auth/app-login-direct`)

**Recommendation:** 
- ❌ REMOVE - The app now uses direct login dialog (no browser required)
- These endpoints add complexity and are not used
- Keeping them maintains unused code and session management overhead

---

### ✅ Agent Communication (KEEP)
| Method | Endpoint | Purpose | Used By |
|--------|----------|---------|---------|
| POST | `/api/agent/register` | Register agent with server | macOS App |
| POST | `/api/agent/heartbeat` | Send heartbeat (5min) | macOS App |

**Status:** Essential for agent tracking and dashboard status display.

---

### ✅ App Metadata (KEEP)
| Method | Endpoint | Purpose | Used By |
|--------|----------|---------|---------|
| GET | `/api/auth/app/version-check` | Check for updates | macOS App |
| GET | `/api/auth/app/changelog/:version?` | Get version changelog | macOS App |

**Status:** Needed for update notifications and version management.

---

### ❓ Debug/Utilities (REVIEW)
| Method | Endpoint | Purpose | Used By | Status |
|--------|----------|---------|---------|--------|
| POST | `/api/auth/debug/reset-rate-limit` | Reset rate limits | Development | 🔴 REMOVE for production |

**Recommendation:** Remove or protect with admin auth in production.

---

### ✅ Download Instructions (KEEP - USEFUL)
| Method | Endpoint | Purpose | Used By |
|--------|----------|---------|---------|
| GET | `/api/download/instructions` | Get setup instructions | Web, Docs |
| GET | `/api/download/setup` | Setup wizard HTML | Web |

**Status:** Helpful for users, minimal overhead.

---

## 🎯 Recommended Cleanup Actions

### 1. Remove Browser Auth Flow (Save ~200 lines of code)
```typescript
// DELETE from src/routes/auth.ts:
- POST /api/auth/app-session
- GET /api/auth/app-session  
- GET /api/auth/app-login
- POST /api/auth/app-authorize
- appSessions Map (in-memory storage)
- sessionAttempts Map (rate limiting)
- Related cleanup intervals
```

**Impact:** 
- ✅ Removes ~200 lines of unused code
- ✅ Simplifies auth flow (one method instead of two)
- ✅ Removes in-memory session storage
- ✅ No breaking changes (app uses direct login)

### 2. Remove Debug Endpoint
```typescript
// DELETE from src/routes/auth.ts:
- POST /api/auth/debug/reset-rate-limit
```

**Impact:**
- ✅ Removes security risk (exposed in production)
- ✅ Rate limiting still works normally

### 3. Keep Current Download Setup
- Both endpoints serve same file (`AsanaBridge-Latest.dmg`)
- One public, one authenticated
- Clear separation of concerns

---

## 📊 Endpoint Usage Summary

### Active & Essential (17 endpoints)
1. **Auth (8):** register, login, app-login-direct, validate, me, profile, profile (PATCH), password
2. **Downloads (2):** app/download/latest, download/agent  
3. **Agent (2):** register, heartbeat
4. **Metadata (2):** version-check, changelog
5. **Instructions (2):** download/instructions, download/setup
6. **Admin:** Various admin endpoints (kept in admin.ts)

### Redundant/Legacy (5 endpoints - CAN REMOVE)
1. app-session (POST)
2. app-session (GET)
3. app-login (GET)
4. app-authorize (POST)
5. debug/reset-rate-limit (POST)

---

## 🚀 Migration Plan

### Phase 1: Mark as Deprecated (Current)
- Add deprecation warnings to legacy endpoints
- Monitor logs to ensure no usage

### Phase 2: Remove (Next Release)
```bash
# Remove from auth.ts:
1. Browser auth session management code (~150 lines)
2. Debug endpoints (~20 lines)
3. Related types and cleanup intervals
```

### Phase 3: Update Documentation
- Remove legacy endpoints from API docs
- Update client libraries
- Update TESTING-CHECKLIST.md

---

## 🔍 Download Endpoint Details

### Current Working Setup

**Dashboard Download (Authenticated):**
```
GET /api/download/agent
Authorization: Bearer <token>
Response: AsanaBridge.dmg (488K)
```

**Public Download (No Auth):**
```
GET /api/auth/app/download/latest
Response: AsanaBridge.dmg (488K)
```

**Both serve the same file:**
```
/var/www/asanabridge/public/downloads/AsanaBridge-Latest.dmg
```

**File Contents:**
- ✅ Branded app icon (372KB .icns)
- ✅ Applications folder symlink
- ✅ README.txt instructions
- ✅ 488K total size

---

## 📝 Testing Commands

### Test Download Endpoints
```bash
# Public download (no auth)
curl -I https://asanabridge.com/api/auth/app/download/latest

# Authenticated download
curl -H "Authorization: Bearer <token>" \
  https://asanabridge.com/api/download/agent
```

### Test Agent Endpoints
```bash
# Register agent
curl -X POST https://asanabridge.com/api/agent/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"agentType":"omnifocus","version":"2.2.1"}'

# Send heartbeat
curl -X POST https://asanabridge.com/api/agent/heartbeat \
  -H "Authorization: Bearer <token>"
```

### Test Auth Endpoints
```bash
# Direct login (macOS app method)
curl -X POST https://asanabridge.com/api/auth/app-login-direct \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Validate token
curl -H "Authorization: Bearer <token>" \
  https://asanabridge.com/api/auth/validate
```

---

**Last Updated:** October 20, 2025  
**Version:** 2.2.1  
**Status:** All active endpoints verified working
