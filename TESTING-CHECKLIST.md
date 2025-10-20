# AsanaBridge v2.2.1 - Testing Checklist

## ✅ Deployment Status
- **Date:** October 20, 2025
- **Version:** 2.2.1
- **Commit:** 7de0314

## 🎨 Brand Colors Applied

### macOS App Colors
- ✅ Bridge Blue (#2563EB) - Primary buttons, connecting status
- ✅ Sync Purple (#8B5CF6) - Secondary elements
- ✅ Success Green (#10B981) - Connected status, success messages
- ✅ Accent Coral (#F97316) - Highlights
- ✅ Status Yellow (#F59E0B) - Warning states
- ✅ Error Red (#EF4444) - Error states, disconnected

### Web Frontend Colors
- ✅ Brand colors added to Tailwind config
- ✅ Colors available as: `bg-bridge-blue`, `text-sync-purple`, etc.

## 📦 DMG Installer

### Current Status
- **File:** `AsanaBridge-Latest.dmg`
- **Size:** 488K (was 198K)
- **Download URL:** https://asanabridge.com/api/auth/app/download/latest
- **Status:** ✅ Live and accessible

### DMG Contents
- ✅ AsanaBridge.app with branded icon (372KB .icns)
- ✅ Applications folder symlink (drag-to-install)
- ✅ README.txt with installation instructions

## 🔌 API Endpoints

### Authentication Endpoints (all working)
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - Web login
- ✅ `POST /api/auth/app-login-direct` - macOS app direct login
- ✅ `GET /api/auth/validate` - Token validation
- ✅ `GET /api/auth/me` - Get user info
- ✅ `POST /api/auth/app-session` - Create auth session (browser flow)
- ✅ `GET /api/auth/app-session` - Check auth session status
- ✅ `GET /api/auth/app/version-check` - App version checking
- ✅ `GET /api/auth/app/download/latest` - Download latest DMG

### Agent Endpoints (all working)
- ✅ `POST /api/agent/register` - Register agent with server
- ✅ `POST /api/agent/heartbeat` - Send heartbeat (5min interval)

## 🧪 Testing Instructions

### 1. Download and Install
```bash
# Download the DMG
curl -o AsanaBridge.dmg https://asanabridge.com/api/auth/app/download/latest

# Open and verify contents
open AsanaBridge.dmg
# Should see: AsanaBridge.app, Applications folder, README.txt
```

### 2. macOS App Testing

#### Icon Verification
- ✅ App icon should show blue/purple gradient with "AB" text
- ✅ Icon should appear in: Finder, Applications folder, Dock, Alt+Tab

#### Color Verification
- Launch app
- **Setup Window:**
  - Step indicators should be Bridge Blue circles
  - "Connect to AsanaBridge" button should be Bridge Blue
- **Login Dialog:**
  - "Connecting..." status should be Bridge Blue
  - Errors should be Error Red
- **Status Page:**
  - OmniFocus "Connected" should be Success Green
  - OmniFocus "Not detected" should be Error Red
  - OmniFocus "Installed" (not running) should be Status Yellow
  - Asana connecting should be Bridge Blue
  - Asana errors should be Error Red

#### Menu Bar Testing
- ✅ Menu bar icon should appear after login
- ✅ Icon should show status: "✅ AsanaBridge" when connected
- ✅ Click menu bar → "Status" should show detailed status
- ✅ Menu should not disappear after clicking items

### 3. Authentication Testing

#### Direct Login (Preferred Method)
```bash
# Test the direct login endpoint
curl -X POST https://asanabridge.com/api/auth/app-login-direct \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your_password"
  }'

# Should return:
# {"success":true,"token":"jwt_token_here","user":{...}}
```

#### Token Validation
```bash
# Test token validation
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://asanabridge.com/api/auth/validate

# Should return:
# {"valid":true,"userId":"...","email":"..."}
```

#### Get User Info
```bash
# Test user info endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://asanabridge.com/api/auth/me

# Should return:
# {"user":{"id":"...","email":"...","name":"...","plan":"...","isAdmin":false}}
```

### 4. Agent Communication Testing

#### Register Agent
```bash
# Test agent registration (requires JWT token)
curl -X POST https://asanabridge.com/api/agent/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "omnifocus",
    "version": "2.2.1",
    "platform": "darwin",
    "omniFocusVersion": "3.14.0"
  }'

# Should return:
# {"success":true,"agent":{...},"message":"Agent registered successfully"}
```

#### Send Heartbeat
```bash
# Test heartbeat (requires JWT token)
curl -X POST https://asanabridge.com/api/agent/heartbeat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Should return:
# {"success":true,"message":"Heartbeat received"}
```

### 5. Web Frontend Testing

#### Dashboard Colors
1. Login at https://asanabridge.com
2. Check dashboard colors:
   - Primary actions should use branded colors
   - Connected status should be Success Green
   - Disconnected should be Error Red
   - Info banners should use Bridge Blue or Sync Purple

#### Responsive Design
- Test on different screen sizes
- Check mobile view
- Verify colors work in dark mode (if applicable)

## 📊 Logging Verification

### Check Server Logs
```bash
# View recent activity
ssh -i ~/.ssh/asanabridge root@143.110.152.9 \
  "tail -100 /var/www/asanabridge/logs/combined.log"

# Check agent-specific logs
ssh -i ~/.ssh/asanabridge root@143.110.152.9 \
  "tail -50 /var/www/asanabridge/logs/agent.log"

# Check authentication logs
ssh -i ~/.ssh/asanabridge root@143.110.152.9 \
  "tail -50 /var/www/asanabridge/logs/auth.log"
```

### Expected Log Entries
After app login and registration, you should see:
```
[AUTH] Direct app login successful - userId: xxx
[AGENT] Agent registered - userId: xxx, agentType: omnifocus
[AGENT] Heartbeat received - userId: xxx, agent: xxx
```

## 🚨 Known Issues & Fixes

### Menu Bar Icon Disappearing
- **Status:** Fixed in v2.2.1
- **Solution:** Don't set menu to nil; use delayed cleanup

### First-Time Security Prompt
- **Status:** Expected behavior (app not notarized)
- **Solution:** Right-click app → Open → Click "Open"
- **Future:** Consider Apple Developer Program for notarization

### Colors Not Appearing
- **If in Swift app:** Rebuild app with `./build-unified-app.sh`
- **If in web:** Rebuild frontend with `npm run build` in frontend directory
- **Verify:** Check that brand color constants are imported

## ✅ Success Criteria

### macOS App
- [x] App has branded icon (visible in Finder)
- [x] Setup wizard uses branded colors
- [x] Login dialog uses branded colors
- [x] Status indicators use correct colors
- [x] Menu bar icon appears and persists
- [x] Authentication works (direct login)
- [x] Agent registration succeeds
- [x] Heartbeat sent every 5 minutes

### Web Interface
- [x] Brand colors in Tailwind config
- [x] Dashboard uses consistent colors
- [x] Login page accessible
- [x] Token authentication working

### Backend
- [x] All endpoints responding
- [x] JWT authentication working
- [x] Agent endpoints functional
- [x] DMG download working
- [x] Logging capturing all events

## 📝 Notes

### For Users
- Download link always serves latest version
- No need to uninstall old version first
- Settings and tokens persist between updates

### For Developers
- Rebuild app after color changes: `./build-unified-app.sh`
- Recreate DMG: `./create-unified-dmg.sh`
- Deploy to production: `git push origin main` then `ssh ... git pull && npm run build && pm2 restart`

### Version History
- **v2.2.1** - Branded colors, icon, logging, agent communication
- **v2.2.0** - Direct login, persistent auth
- **v2.1.0** - Menu bar fixes
- **v2.0.0** - Initial unified app

---

**Last Updated:** October 20, 2025
**Next Review:** After first user testing session
