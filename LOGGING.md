# AsanaBridge Logging & Troubleshooting Guide

## Log Locations

### Production Server
- **Combined Log**: `/var/www/asanabridge/logs/combined.log`
- **Error Log**: `/var/www/asanabridge/logs/error.log`
- **Auth Log**: `/var/www/asanabridge/logs/auth.log`
- **Agent Log**: `/var/www/asanabridge/logs/agent.log`
- **Sync Log**: `/var/www/asanabridge/logs/sync.log`
- **PM2 Logs**: `~/.pm2/logs/asanabridge-*.log`

### macOS App (Local)
- **App Log**: `~/Library/Application Support/AsanaBridge/asanabridge.log`
- **Console.app**: Filter by "AsanaBridge"

## Viewing Logs

### Quick View (Last 50 lines)
```bash
# SSH into production
ssh -i ~/.ssh/asanabridge root@143.110.152.9

# View real-time combined logs
pm2 logs asanabridge

# View specific module logs
tail -f /var/www/asanabridge/logs/agent.log
tail -f /var/www/asanabridge/logs/auth.log
tail -f /var/www/asanabridge/logs/sync.log

# View last 100 lines of combined log
tail -100 /var/www/asanabridge/logs/combined.log

# View errors only
tail -f /var/www/asanabridge/logs/error.log
```

### Search Logs
```bash
# Find all agent registrations
grep "Agent registered" /var/www/asanabridge/logs/agent.log

# Find all authentication attempts
grep "login" /var/www/asanabridge/logs/auth.log

# Find all errors in last hour
find /var/www/asanabridge/logs/ -name "*.log" -mmin -60 -exec grep -i "error" {} \;

# Search by user ID
grep "userId.*cmgzevshc0000140c3swag2te" /var/www/asanabridge/logs/combined.log
```

## Log Modules

### [AUTH] Authentication & Authorization
**What it logs:**
- User logins/logouts
- Registration attempts
- Token validation
- JWT expiration
- Password resets
- OAuth flows

**Example entries:**
```
2025-10-20 17:37:36 INFO [AUTH][user:abc123] User logged in successfully
2025-10-20 17:38:00 WARN [AUTH] Invalid JWT token provided
2025-10-20 17:39:00 INFO [AUTH] Direct app login successful
```

### [AGENT] macOS App Communication
**What it logs:**
- Agent registration
- Heartbeat reception
- Agent version checks
- Connection status
- OmniFocus setup creation

**Example entries:**
```
2025-10-20 17:40:00 INFO [AGENT][user:abc123] Agent registered successfully
2025-10-20 17:45:00 INFO [AGENT][user:abc123] Heartbeat received
2025-10-20 17:50:00 ERROR [AGENT] Agent registration failed with status: 403
```

### [SYNC] Task Synchronization
**What it logs:**
- Sync start/completion
- Tasks synced count
- Sync errors
- Bidirectional sync status
- Asana API calls
- OmniFocus operations

**Example entries:**
```
2025-10-20 18:00:00 INFO [SYNC][user:abc123] Starting sync for mapping xyz
2025-10-20 18:00:05 INFO [SYNC][user:abc123] Synced 15 tasks successfully
2025-10-20 18:00:10 ERROR [SYNC][user:abc123] Sync failed: Rate limit exceeded
```

### [API] General API Requests
**What it logs:**
- HTTP requests
- Response times
- Rate limiting
- CORS issues
- Endpoint access

### [DATABASE] Database Operations
**What it logs:**
- Query errors
- Connection issues
- Migration status
- Slow queries

## Common Issues & Log Patterns

### Issue: User Can't Log In
**Check:**
```bash
grep -A 5 -B 5 "rbradshaw@gmail.com" /var/www/asanabridge/logs/auth.log
```
**Look for:**
- "Invalid email or password"
- "User not found"
- "JWT expired"
- "Token validation failed"

### Issue: App Not Connecting
**Check:**
```bash
grep "Agent registered\|Heartbeat received" /var/www/asanabridge/logs/agent.log | tail -20
```
**Look for:**
- No recent heartbeats (should be every 5 min)
- Registration failures
- "Invalid or inactive authentication token"

### Issue: Sync Not Working
**Check:**
```bash
grep -i "sync" /var/www/asanabridge/logs/sync.log | tail -50
```
**Look for:**
- "OmniFocus not available"
- "Rate limit exceeded"
- "API error"
- "No tasks found"

### Issue: Menu Bar Icon Missing
**Check macOS app log:**
```bash
cat ~/Library/Application\ Support/AsanaBridge/asanabridge.log | grep -i "menu bar\|status item"
```
**Look for:**
- "Status item failed to create"
- "Menu bar setup complete"
- "Icon setup failed"

## Troubleshooting Workflow

### 1. Verify Server is Running
```bash
ssh -i ~/.ssh/asanabridge root@143.110.152.9 "pm2 status asanabridge"
```

### 2. Check Recent Errors
```bash
ssh -i ~/.ssh/asanabridge root@143.110.152.9 "tail -50 /var/www/asanabridge/logs/error.log"
```

### 3. Check Specific Module
Based on the issue, check the relevant module log:
- Login issues → `auth.log`
- App connection → `agent.log`
- Sync issues → `sync.log`

### 4. Check User-Specific Activity
```bash
# Replace USER_ID with actual user ID
ssh -i ~/.ssh/asanabridge root@143.110.152.9 \
  "grep 'user:USER_ID' /var/www/asanabridge/logs/combined.log | tail -100"
```

### 5. Monitor Real-Time
```bash
ssh -i ~/.ssh/asanabridge root@143.110.152.9 "pm2 logs asanabridge --lines 100"
```

## Log Rotation

Logs are automatically rotated when they reach:
- **Server logs**: 10MB (keeps last 10 files)
- **macOS app logs**: 5MB (keeps last 3 files)

## Debug Mode

### Enable Verbose Logging (Temporary)
```bash
# SSH into production
ssh -i ~/.ssh/asanabridge root@143.110.152.9

# Set log level to debug
cd /var/www/asanabridge
export LOG_LEVEL=debug

# Restart app
pm2 restart asanabridge

# Watch debug logs
pm2 logs asanabridge
```

### Disable Debug Logging
```bash
unset LOG_LEVEL
pm2 restart asanabridge
```

## Performance Monitoring

### Check Response Times
```bash
grep "response time" /var/www/asanabridge/logs/combined.log | tail -100
```

### Check Database Performance
```bash
grep -i "slow query" /var/www/asanabridge/logs/error.log
```

### Check Memory Usage
```bash
pm2 status asanabridge
pm2 monit
```

## Emergency Commands

### Restart Everything
```bash
ssh -i ~/.ssh/asanabridge root@143.110.152.9 "pm2 restart all"
```

### Clear All Logs (CAREFUL!)
```bash
ssh -i ~/.ssh/asanabridge root@143.110.152.9 "pm2 flush"
```

### Check Disk Space
```bash
ssh -i ~/.ssh/asanabridge root@143.110.152.9 "df -h"
```

## Getting Help

When reporting issues, always include:
1. Relevant log excerpts (last 50-100 lines)
2. User ID or email (if known)
3. Timestamp of when issue occurred
4. Steps to reproduce
5. macOS app version and OS version
