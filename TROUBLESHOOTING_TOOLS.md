# AsanaBridge Troubleshooting & Diagnostic Tools

**Version:** 2.2.1  
**Created:** ${new Date().toISOString()}  
**Purpose:** Comprehensive diagnostic and troubleshooting infrastructure for production debugging

## Overview

This document describes the diagnostic and troubleshooting tools implemented in AsanaBridge to help identify and resolve issues quickly, especially in production environments.

## Diagnostic API Endpoints

### 1. System Health Check
**Endpoint:** `GET /api/diagnostics/health`  
**Authentication:** Required (Bearer token)  
**Description:** Comprehensive system health check returning detailed diagnostics

**Response Structure:**
```json
{
  "success": true,
  "diagnostics": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "2.2.1",
    "user": {
      "id": "user_id",
      "email": "user@example.com"
    },
    "system": {
      "nodeVersion": "v18.x.x",
      "platform": "darwin",
      "arch": "x64",
      "uptime": 123456,
      "memory": {
        "total": 17179869184,
        "free": 2147483648,
        "used": 15032385536,
        "processUsage": {...}
      },
      "cpu": 8,
      "hostname": "server-hostname",
      "environment": "production"
    },
    "database": {
      "status": "connected",
      "responseTime": 15,
      "user": {
        "exists": true,
        "plan": "FREE",
        "hasAsanaToken": true,
        "hasAgentSetup": true,
        "memberSince": "2024-01-01T00:00:00.000Z"
      }
    },
    "files": {
      "dmg": {
        "path": "/path/to/AsanaBridge-2.2.1.dmg",
        "exists": true,
        "size": 184320,
        "sizeHuman": "180KB"
      }
    },
    "agent": {
      "registered": true,
      "active": true,
      "agentKey": "SET",
      "version": "3",
      "lastSeen": "2024-01-15T10:25:00.000Z"
    },
    "sync": {
      "mappingsCount": 3,
      "activeMappings": 2,
      "mappings": [
        {
          "id": "mapping_id",
          "asanaProject": "project_id",
          "omnifocusProject": "Work Projects",
          "active": true,
          "lastSync": "2024-01-15T10:00:00.000Z"
        }
      ],
      "recentSyncs": [
        {
          "time": "2024-01-15T10:00:00.000Z",
          "status": "success",
          "direction": "asana_to_omnifocus",
          "itemsSynced": 5,
          "error": null
        }
      ]
    },
    "connectivity": {
      "asana": "CONNECTED",
      "omnifocus": "NOT_TESTED"
    },
    "errors": []
  },
  "summary": {
    "healthy": true,
    "errorCount": 0,
    "criticalIssues": 0
  }
}
```

**Health Checks Performed:**
- ✅ System information (Node version, platform, memory, CPU)
- ✅ Database connectivity and response time
- ✅ User account status and integrations
- ✅ DMG file existence and integrity
- ✅ Agent registration and activity status
- ✅ Sync mappings and recent sync history
- ✅ Asana API connectivity test
- ✅ Error detection and categorization

**Usage:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://asanabridge.com/api/diagnostics/health
```

### 2. Crash Reporter
**Endpoint:** `POST /api/diagnostics/crash-report`  
**Authentication:** None (for crash reporting before auth possible)  
**Description:** Receives and logs crash reports from the Swift app

**Request Body:**
```json
{
  "appVersion": "2.2.1",
  "error": "Fatal error: Unexpectedly found nil while unwrapping an Optional value",
  "stackTrace": "Thread 0 Crashed...",
  "deviceInfo": {
    "os": "macOS 14.1",
    "device": "MacBook Pro",
    "architecture": "arm64"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Crash report received"
}
```

**Features:**
- Logs crash details to server logs
- Stores crash reports in database (crash_reports table)
- Deduplicates identical crash reports
- Provides timestamp and version tracking

### 3. App Diagnostics
**Endpoint:** `POST /api/diagnostics/app-diagnostics`  
**Authentication:** Required (Bearer token)  
**Description:** Receives diagnostic information from the Swift app and provides analysis

**Request Body:**
```json
{
  "logs": [
    "✅ Status item created successfully",
    "✅ Authenticated as user@example.com",
    "❌ Failed to connect to OmniFocus: Connection refused"
  ],
  "state": {
    "statusItemCreated": true,
    "authenticated": true,
    "asanaConnected": true,
    "omnifocusConnected": false
  },
  "version": "2.2.1"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "issues": [
      "1 error(s) detected in logs",
      "OmniFocus not connected"
    ],
    "recommendations": [
      "Make sure OmniFocus is installed and running",
      "Check the app logs for detailed error messages"
    ],
    "healthy": false
  }
}
```

**Analysis Features:**
- Parses logs for error and warning patterns
- Checks app state for missing components
- Generates actionable recommendations
- Provides health status summary

**Recommendations Generated:**
- Menu bar icon issues → Check System Settings > Login Items
- Authentication issues → Log in again through app menu
- Asana connection issues → Reconnect in dashboard
- OmniFocus issues → Ensure OmniFocus is installed and running
- Generic errors → Check app logs

## Swift App Integration (Planned)

### File-Based Logging
**Location:** `~/Library/Logs/AsanaBridge/`  
**Files:**
- `app.log` - General application logs
- `sync.log` - Sync operation logs
- `error.log` - Error and crash logs

**Log Format:**
```
[2024-01-15 10:30:00] [INFO] Status item created successfully
[2024-01-15 10:30:15] [ERROR] Failed to connect to OmniFocus: Connection refused
[2024-01-15 10:30:30] [SYNC] Started sync: Asana → OmniFocus (5 items)
```

### Crash Recovery
- Detect uncaught exceptions
- Save crash state to file
- Send crash report to backend
- Attempt graceful recovery
- Display user-friendly error message

### Diagnostic State Tracking
```swift
struct DiagnosticState {
    var statusItemCreated: Bool
    var authenticated: Bool  
    var asanaConnected: Bool
    var omnifocusConnected: Bool
    var lastSyncTime: Date?
    var errorCount: Int
    var warningCount: Int
}
```

### Periodic Health Reporting
- Every 5 minutes: Send diagnostics to backend
- On error: Immediate diagnostic report
- On crash: Crash report with full context
- On sync: Sync success/failure report

## Database Schema

### Crash Reports Table
```sql
CREATE TABLE crash_reports (
    id SERIAL PRIMARY KEY,
    app_version VARCHAR(20),
    error_message TEXT,
    stack_trace TEXT,
    device_info JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Monitoring & Alerts

### Error Patterns to Monitor
1. **Menu Bar Icon Disappearing**
   - Pattern: `statusItem.menu = nil`
   - Alert: Menu bar icon cleanup happening too early
   - Fix: Use delayed cleanup

2. **String Interpolation Issues**
   - Pattern: `\\(variable)` in logs
   - Alert: Escaped string interpolation
   - Fix: Remove extra backslashes

3. **Authentication Failures**
   - Pattern: 401 responses from backend
   - Alert: Invalid or expired tokens
   - Fix: Re-authenticate user

4. **OmniFocus Connection Issues**
   - Pattern: Connection refused errors
   - Alert: OmniFocus not running or AppleScript disabled
   - Fix: Prompt user to open OmniFocus

5. **Database Errors**
   - Pattern: Prisma errors, connection timeouts
   - Alert: Database connectivity issues
   - Fix: Check DATABASE_URL, restart database

## Usage Examples

### Check System Health (Dashboard)
```typescript
const response = await fetch('/api/diagnostics/health', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { diagnostics, summary } = await response.json();

if (!summary.healthy) {
  console.error(`System has ${summary.errorCount} errors`);
  diagnostics.errors.forEach(err => {
    console.error(`${err.component}: ${err.error}`);
  });
}
```

### Send App Diagnostics (Swift App)
```swift
func sendDiagnostics() {
    let diagnostics: [String: Any] = [
        "logs": diagnosticLogs,
        "state": [
            "statusItemCreated": statusItem != nil,
            "authenticated": authToken != nil,
            "asanaConnected": isAsanaConnected,
            "omnifocusConnected": isOmniFocusConnected
        ],
        "version": appVersion
    ]
    
    // Send to backend
    apiClient.post("/api/diagnostics/app-diagnostics", body: diagnostics)
}
```

### Report Crash (Swift App)
```swift
func reportCrash(error: Error) {
    let crashReport: [String: Any] = [
        "appVersion": appVersion,
        "error": error.localizedDescription,
        "stackTrace": Thread.callStackSymbols.joined(separator: "\n"),
        "deviceInfo": [
            "os": ProcessInfo.processInfo.operatingSystemVersionString,
            "device": "Mac",
            "architecture": "arm64"
        ],
        "timestamp": ISO8601DateFormatter().string(from: Date())
    ]
    
    apiClient.post("/api/diagnostics/crash-report", body: crashReport)
}
```

## Production Deployment Checklist

Before deploying to production:

1. ✅ **Diagnostic Endpoints Ready**
   - `/api/diagnostics/health` - Comprehensive health check
   - `/api/diagnostics/crash-report` - Crash reporting
   - `/api/diagnostics/app-diagnostics` - App diagnostic analysis

2. ⏳ **Swift App Logging** (TODO)
   - Implement file-based logging
   - Add crash recovery
   - Periodic health reporting
   - Error tracking and categorization

3. ⏳ **Monitoring Setup** (TODO)
   - Server-side error alerts
   - Crash report notifications
   - Health check monitoring
   - Performance metrics

4. ⏳ **Database Migration** (TODO)
   - Create crash_reports table
   - Add indexes for performance
   - Set up log rotation

5. ✅ **Documentation**
   - API endpoints documented
   - Usage examples provided
   - Integration guide complete

## Troubleshooting Workflow

### When User Reports Issue:

1. **Request Diagnostic Report**
   ```
   Go to AsanaBridge menu → Send Diagnostic Report
   ```

2. **Check Health Endpoint**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     https://asanabridge.com/api/diagnostics/health
   ```

3. **Review Error Logs**
   - Check server logs for crash reports
   - Review diagnostic submissions
   - Analyze error patterns

4. **Identify Root Cause**
   - Database connectivity issues?
   - API authentication problems?
   - OmniFocus connection failures?
   - Menu bar icon issues?

5. **Apply Fix**
   - Guide user through resolution
   - Deploy hotfix if needed
   - Monitor for recurrence

### Common Issues & Solutions

| Issue | Diagnostic Signal | Solution |
|-------|------------------|----------|
| Menu bar icon disappears | `statusItemCreated: false` | Check `statusItem.menu = nil` timing |
| App crashes on launch | Crash report received | Check stack trace, review initialization |
| Sync fails | `sync.status: "failed"` | Check Asana/OmniFocus connectivity |
| Authentication fails | `authenticated: false` | Re-login, check token expiration |
| Dashboard shows wrong version | Version mismatch in diagnostics | Check DMG version, clear cache |

## Next Steps

### Phase 1: Enhanced Logging (Current)
- ✅ Diagnostic API endpoints
- ⏳ Swift app logging system
- ⏳ Crash recovery mechanism

### Phase 2: Monitoring & Alerts
- ⏳ Server-side monitoring
- ⏳ Email/Slack alerts for crashes
- ⏳ Performance metrics tracking

### Phase 3: User Self-Service
- ⏳ In-app diagnostic viewer
- ⏳ "Send Diagnostic Report" menu item
- ⏳ Automated troubleshooting suggestions

### Phase 4: Analytics
- ⏳ Error rate tracking
- ⏳ Feature usage analytics
- ⏳ Performance benchmarking

## Contact & Support

For issues with diagnostic tools:
- GitHub Issues: [asanabridge/issues](https://github.com/yourusername/asanabridge/issues)
- Support Email: support@asanabridge.com
- Dashboard: https://asanabridge.com/support

---

**Last Updated:** ${new Date().toISOString()}  
**Maintained By:** AsanaBridge Development Team
