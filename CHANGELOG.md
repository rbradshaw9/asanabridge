# AsanaBridge Changelog

## [2.2.1] - 2025-10-20

### 🚀 Major Release - Critical Architecture Fixes

This release addresses **9 critical categories** of issues that were preventing AsanaBridge from functioning properly. This is essentially a complete overhaul of the Swift macOS application with proper backend integration.

### ✅ **Critical Fixes**

#### 1. **Version Consistency Crisis**
- Fixed `package.json` version from `0.1.0` → `2.2.1` to match runtime versions
- Eliminated version mismatch confusion across the codebase

#### 2. **Swift Token Validation Bug** 
- Removed escaped backslashes in Bearer token header that broke API authentication
- Fixed `Bearer \\\\(token)` → `Bearer \\(token)` 

#### 3. **Missing Authentication Endpoint**
- Added `/api/auth/me` endpoint that the Swift app expects for user info
- Provides complete user profile data for desktop app authentication

#### 4. **Menu Bar Icon Disappearing Bug** 🐛
- **CRITICAL FIX**: Removed `statusItem.menu = nil` that caused menu bar icon to vanish
- Menu bar icon now stays visible after right-clicking
- Fixed fundamental misunderstanding of NSStatusItem lifecycle

#### 5. **Hardcoded Production URLs**
- Made all URLs configurable with automatic dev/prod switching
- Added `#if DEBUG` conditional compilation for localhost development
- Environment override support via UserDefaults

#### 6. **Silent Failure Error Handling**
- Added comprehensive error handling with user-friendly dialogs
- Network failures now show helpful error messages instead of silent failures
- Detailed error logging with optional technical details

#### 7. **String Interpolation Issues**
- Fixed escaped string patterns showing literal `\\(variable)` instead of values
- Corrected string interpolation in status displays and API calls

#### 8. **Missing OmniFocus Integration** 🎯
- **MASSIVE IMPLEMENTATION**: Added complete AppleScript-based OmniFocus integration
- Real task reading from OmniFocus using robust AppleScript
- Task creation in OmniFocus with project assignment and due dates
- Bidirectional sync between Asana and OmniFocus
- Proper error handling for AppleScript failures
- This was completely missing - app was essentially a UI shell before!

#### 9. **Professional Logging System**
- Replaced all print statements with professional logging framework
- Automatic log file writing to `~/Library/Application Support/AsanaBridge/`
- Log rotation when files exceed 5MB
- Debug/Info/Warning/Error log levels

### 🔧 **Technical Improvements**

- **Configurable Architecture**: Automatic localhost/production URL switching
- **Robust Error Handling**: Network failures show user dialogs with technical details
- **Professional Logging**: File-based logging with automatic rotation
- **Complete OmniFocus Integration**: AppleScript-based task synchronization
- **Better Menu Bar Behavior**: Fixed critical disappearing icon bug
- **Improved Swift Code Quality**: Fixed closure capture semantics and type annotations

### 🚀 **What This Means**

AsanaBridge v2.2.1 now:
- ✅ **Stays visible** in the menu bar after right-clicking
- ✅ **Successfully authenticates** with the backend  
- ✅ **Actually syncs tasks** between Asana and OmniFocus (this is huge!)
- ✅ **Shows helpful error messages** when things go wrong
- ✅ **Works in both** development and production environments
- ✅ **Maintains proper logs** for debugging issues

### 🎯 **Developer Notes**

- Swift app now has proper AppleScript integration for OmniFocus
- Backend has all required authentication endpoints
- Configurable URLs allow seamless development workflow
- Professional error handling and logging throughout
- Fixed all Swift compilation warnings and errors

---

## Previous Versions

### [2.2.0] - 2025-10-07
- Initial macOS app implementation
- Browser-based authentication flow
- Basic menu bar interface

### [2.1.0] - 2025-10-06  
- Backend API implementation
- User authentication system
- Database schema setup

### [2.0.0] - 2025-09-30
- Project initialization
- Basic Node.js/Express backend
- React frontend framework