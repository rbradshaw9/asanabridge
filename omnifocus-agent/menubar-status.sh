#!/bin/bash

# menubar-status.sh - Simple menu bar status for AsanaBridge using osascript
# This creates a menu bar-like experience using AppleScript dialogs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_URL="http://localhost:7842"

# Function to check if agent is running
check_agent_status() {
    curl -s "$AGENT_URL/health" >/dev/null 2>&1
    return $?
}

# Function to show status menu
show_status_menu() {
    local agent_running=$1
    local status_icon=""
    local status_text=""
    
    if [ "$agent_running" -eq 0 ]; then
        status_icon="✅"
        status_text="AsanaBridge Agent Running"
    else
        status_icon="❌"
        status_text="AsanaBridge Agent Stopped"
    fi
    
    # Create menu using AppleScript
    local choice=$(osascript <<EOF
set statusText to "$status_text"
set agentRunning to $agent_running

if agentRunning = 0 then
    set menuChoice to (choose from list {"🔄 Sync Now", "📊 Show Detailed Status", "🌐 Open Dashboard", "❓ Help", "Quit"} with title "AsanaBridge Status" with prompt statusText default items {"📊 Show Detailed Status"})
else
    set menuChoice to (choose from list {"🚀 Start Agent", "🌐 Open Dashboard", "❓ Help", "Quit"} with title "AsanaBridge Status" with prompt statusText default items {"🚀 Start Agent"})
end if

if menuChoice is false then
    return "cancelled"
else
    return (menuChoice as string)
end if
EOF
)
    
    case "$choice" in
        *"Sync Now"*)
            curl -s -X POST "$AGENT_URL/sync/trigger" >/dev/null 2>&1
            osascript -e 'display notification "Manual sync triggered" with title "AsanaBridge"'
            ;;
        *"Show Detailed Status"*)
            curl -s "$AGENT_URL/status/popup" >/dev/null 2>&1
            ;;
        *"Start Agent"*)
            open -a "AsanaBridge"
            ;;
        *"Open Dashboard"*)
            open "https://asanabridge.com/dashboard"
            ;;
        *"Help"*)
            open "https://asanabridge.com/support"
            ;;
        *"Quit"*)
            exit 0
            ;;
    esac
}

# Function to update menu bar status (using AppleScript to show in dock/notification)
update_menu_bar() {
    if check_agent_status; then
        # Agent is running - show success indicator
        osascript -e 'tell application "System Events" to display notification "Click to access controls" with title "AsanaBridge ✅ Running"' >/dev/null 2>&1 || true
    else
        # Agent is not running - show warning
        osascript -e 'tell application "System Events" to display notification "Click to start or check status" with title "AsanaBridge ❌ Stopped"' >/dev/null 2>&1 || true
    fi
}

# Main loop
main() {
    # Show initial status
    update_menu_bar
    
    while true; do
        if check_agent_status; then
            agent_running=0
        else
            agent_running=1
        fi
        
        # Show the status menu
        show_status_menu $agent_running
        
        # Wait a bit before showing again (or exit)
        read -p "Press Enter to show menu again, or Ctrl+C to exit..."
    done
}

# If script is run directly, start the main loop
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "🖥️  AsanaBridge Menu Bar Status"
    echo "This provides menu bar-like controls for AsanaBridge"
    echo "Press Ctrl+C to exit"
    echo ""
    main
fi