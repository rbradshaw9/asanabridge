#!/bin/bash
# show-status.sh - Simple script to show AsanaBridge agent status

# Check if agent is running
if ! curl -s http://localhost:7842/health > /dev/null 2>&1; then
    osascript -e 'display notification "AsanaBridge agent is not running" with title "AsanaBridge Status"'
    exit 1
fi

# Trigger status popup
curl -s http://localhost:7842/status/popup > /dev/null 2>&1

echo "Status popup shown"