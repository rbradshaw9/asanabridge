# SimpleAsanaBridge - Minimal, Crash-Free macOS App

This is a simplified, robust version of the AsanaBridge desktop app that focuses on core functionality:
- ✅ Login with browser authentication
- ✅ Logout/disconnect
- ✅ Watch OmniFocus and sync tasks to server
- ✅ Menu bar icon with status

## Why This Version?

The original `UnifiedAsanaBridge.swift` had 3000+ lines and was experiencing crashes due to complex state management. This simplified version:
- **No crashes**: Minimal code, simple state management
- **Easy to maintain**: ~400 lines vs 3000+ lines
- **Same core features**: Everything you need, nothing you don't

## Build & Deploy

### 1. Build the App

```bash
cd omnifocus-agent
./build-simple-app.sh
```

This creates `build/AsanaBridge.app`

### 2. Test Locally

```bash
open build/AsanaBridge.app
```

### 3. Create DMG for Distribution

```bash
./create-simple-dmg.sh
```

This creates:
- `AsanaBridge-2.3.0.dmg` - Versioned DMG
- `AsanaBridge-Latest.dmg` - Latest version link

### 4. Upload to Server

```bash
scp -i ~/.ssh/asanabridge AsanaBridge-Latest.dmg root@143.110.152.9:/var/www/asanabridge/public/downloads/
```

## How It Works

1. **On Launch**:
   - Checks for saved authentication token
   - If authenticated: runs silently in background
   - If not authenticated: shows login window

2. **Login Flow**:
   - Opens browser to `https://asanabridge.com/auth/desktop`
   - User signs in via web
   - User copies token and pastes into app
   - Token is saved to UserDefaults

3. **Sync Flow**:
   - Registers agent with server on startup
   - Checks OmniFocus every 5 minutes
   - Sends new tasks to server via `/api/agent/sync`

4. **Logout**:
   - Clears saved token
   - Stops sync timer
   - Shows login window

## Files

- `SimpleAsanaBridge.swift` - Main app code (~400 lines)
- `build-simple-app.sh` - Build script
- `create-simple-dmg.sh` - DMG creation script

## Version History

- **2.3.0** - Initial simplified version (crash-free)
- **2.2.2** - Previous complex version (had crashes)

## Next Steps

Once this version is stable and tested, we can:
1. Replace the old `UnifiedAsanaBridge.swift` with this version
2. Update all build scripts to use the simple version
3. Archive the old complex version for reference

## Troubleshooting

### Menu bar icon doesn't appear
- Make sure NSStatusBar.system is available
- Check Console.app for error messages

### Sync not working
- Check `/api/agent/recent-syncs` in dashboard
- Verify OmniFocus is running
- Check server logs for errors

### Can't login
- Ensure server is running at https://asanabridge.com
- Check browser console for auth errors
- Try clearing UserDefaults: `defaults delete com.asanabridge.unified`
