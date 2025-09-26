#!/bin/bash

# build-status-app.sh
# Builds the AsanaBridge Status App

set -e

echo "🚀 Building AsanaBridge Status App..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Compile the Swift status app
echo "📦 Compiling Swift application..."
swiftc -o AsanaBridgeStatus AsanaBridgeStatus.swift -framework Cocoa -framework Foundation

# Create app bundle
echo "🏗️  Creating app bundle..."
APP_NAME="AsanaBridgeStatus.app"
rm -rf "$APP_NAME"

mkdir -p "$APP_NAME/Contents/MacOS"
mkdir -p "$APP_NAME/Contents/Resources"

# Move executable
mv AsanaBridgeStatus "$APP_NAME/Contents/MacOS/"

# Create Info.plist
cat > "$APP_NAME/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>AsanaBridge Status</string>
    <key>CFBundleExecutable</key>
    <string>AsanaBridgeStatus</string>
    <key>CFBundleIdentifier</key>
    <string>com.asanabridge.status</string>
    <key>CFBundleName</key>
    <string>AsanaBridgeStatus</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ AsanaBridge Status App built successfully!"
echo "📱 Run with: open $APP_NAME"
echo "🔧 Or launch from Finder"