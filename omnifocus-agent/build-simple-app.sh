#!/bin/bash

# Build script for simplified AsanaBridge app
# This creates a minimal, crash-free macOS app

set -e

APP_NAME="AsanaBridge"
VERSION="2.3.0"
BUNDLE_ID="com.asanabridge.unified"
SWIFT_FILE="SimpleAsanaBridge.swift"
OUTPUT_DIR="build"
APP_PATH="$OUTPUT_DIR/$APP_NAME.app"

echo "🔨 Building simplified AsanaBridge v$VERSION..."

# Clean previous build
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Create app bundle structure
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Compile Swift file
echo "📦 Compiling Swift code..."
swiftc -o "$APP_PATH/Contents/MacOS/$APP_NAME" \
    -framework Cocoa \
    -framework Foundation \
    "$SWIFT_FILE"

# Create Info.plist
echo "📝 Creating Info.plist..."
cat > "$APP_PATH/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>LSUIElement</key>
    <false/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSAppleEventsUsageDescription</key>
    <string>AsanaBridge needs to access OmniFocus to sync your tasks.</string>
</dict>
</plist>
EOF

# Copy icon if it exists
if [ -f "AsanaBridge.icns" ]; then
    echo "🎨 Adding app icon..."
    cp "AsanaBridge.icns" "$APP_PATH/Contents/Resources/"
fi

echo "✅ Build complete: $APP_PATH"
echo ""
echo "📦 To create DMG:"
echo "   ./create-simple-dmg.sh"
echo ""
echo "🧪 To test locally:"
echo "   open $APP_PATH"
