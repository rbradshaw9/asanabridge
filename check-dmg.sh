#!/bin/bash

# Script to ensure DMG file is available for download on production server
set -e

echo "🔍 Checking for DMG file locally..."

DMG_SOURCE="./omnifocus-agent/build/AsanaBridge-2.2.0.dmg"
DMG_TARGET_DIR="./public/downloads"

if [ ! -f "$DMG_SOURCE" ]; then
    echo "⚠️  DMG file not found at $DMG_SOURCE"
    echo "📦 Building DMG installer..."
    
    cd omnifocus-agent
    if [ -f "./create-dmg.sh" ]; then
        ./create-dmg.sh
        cd ..
    else
        echo "❌ create-dmg.sh not found. Please build the DMG manually."
        exit 1
    fi
fi

if [ -f "$DMG_SOURCE" ]; then
    echo "✅ DMG file found: $DMG_SOURCE"
    
    # Get file size for confirmation
    SIZE=$(du -h "$DMG_SOURCE" | cut -f1)
    echo "📏 File size: $SIZE"
    
    echo "🚀 DMG is ready for deployment!"
else
    echo "❌ Failed to create DMG file"
    exit 1
fi

echo "💡 To deploy, run: cd /root/asanabridge && git pull origin main && npm install && npm run build && cd frontend && npm install && npm run build && pm2 restart asanabridge"