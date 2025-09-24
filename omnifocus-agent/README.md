# AsanaBridge OmniFocus Agent

Local desktop agent that enables two-way sync between OmniFocus and AsanaBridge web service.

## Features

- **Auto-detection** of OmniFocus 3 or 4
- **Real-time sync** with configurable intervals
- **Secure communication** with AsanaBridge web service via agent keys
- **Local API** for health checks and manual sync triggers
- **AppleScript/JXA integration** for reliable OmniFocus automation

## Installation

1. **Download agent** from AsanaBridge dashboard
2. **Extract and configure:**
   ```bash
   cd asanabridge-agent
   cp .env.example .env
   # Edit .env with your agent key from web dashboard
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start agent:**
   ```bash
   npm start
   ```

## Configuration

Edit `.env` file:

```bash
# Your unique agent key from AsanaBridge dashboard
AGENT_KEY=your_32_character_agent_key_here_12345

# AsanaBridge web service URL
API_BASE_URL=https://asanabridge.com

# Sync frequency (minutes)
SYNC_INTERVAL_MINUTES=5

# Logging level
LOG_LEVEL=info
```

## Usage

The agent runs in the background and:

1. **Monitors OmniFocus** for changes to synced projects
2. **Communicates with web service** to sync with Asana
3. **Applies changes** from Asana back to OmniFocus
4. **Logs activity** and provides health monitoring

## Local API

Agent runs a local HTTP server on `http://localhost:7842`:

- `GET /health` - Agent status and sync information
- `POST /sync/trigger` - Manually trigger a sync cycle

## Troubleshooting

**OmniFocus not detected:**
- Ensure OmniFocus 3 or 4 is installed and can be launched
- Check System Preferences > Security & Privacy > Automation

**Sync issues:**
- Check agent logs for error messages
- Verify agent key is valid in AsanaBridge dashboard
- Ensure internet connection for web service communication

**Performance:**
- Reduce sync frequency if experiencing slowdowns
- Close unnecessary OmniFocus perspectives during sync

## Development

```bash
npm run dev    # Run in development mode with hot reload
npm run build  # Build TypeScript to dist/
npm test       # Run tests (if available)
```

## System Requirements

- macOS 10.15 or later
- OmniFocus 3 or OmniFocus 4
- Node.js 18+ (bundled in packaged releases)
- Internet connection for sync

## Security

- Agent keys are unique per user and can be regenerated
- All communication with web service uses HTTPS
- No OmniFocus data is stored locally beyond sync operations
- Agent can be stopped/started without data loss