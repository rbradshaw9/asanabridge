#!/bin/bash

# build-unified-app.sh
# Builds the unified AsanaBridge macOS application

set -e

echo "🚀 Building Unified AsanaBridge macOS App..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Build directories
BUILD_DIR="$SCRIPT_DIR/build"
APP_NAME="AsanaBridge.app"
APP_PATH="$BUILD_DIR/$APP_NAME"

# Clean and create build directory
echo "🧹 Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Compile the unified Swift application
echo "📦 Compiling unified Swift application..."
swiftc -o AsanaBridge UnifiedAsanaBridge.swift -framework Cocoa -framework Foundation -framework Network

# Create app bundle structure
echo "🏗️  Creating app bundle..."
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Move executable
mv AsanaBridge "$APP_PATH/Contents/MacOS/"

# Create Info.plist
cat > "$APP_PATH/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>AsanaBridge</string>
    <key>CFBundleExecutable</key>
    <string>AsanaBridge</string>
    <key>CFBundleIdentifier</key>
    <string>com.asanabridge.unified</string>
    <key>CFBundleName</key>
    <string>AsanaBridge</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0</string>
    <key>CFBundleVersion</key>
    <string>2.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.productivity</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>AsanaBridge Authentication</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>asanabridge</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
EOF

# Create app icon (using SF Symbols or text)
echo "🎨 Adding app icon..."
# For now, we'll use a simple icon - in production you'd add a proper .icns file

# Set executable permissions
chmod +x "$APP_PATH/Contents/MacOS/AsanaBridge"

echo "✅ Unified AsanaBridge App built successfully!"
echo "📱 Location: $APP_PATH"
echo "🔧 Run with: open \"$APP_PATH\""
echo "📋 Or drag to Applications folder"

echo ""
echo "🎉 This unified app includes:"
echo "   • Complete setup wizard"
echo "   • OmniFocus auto-connection"
echo "   • Built-in local agent (port 7842)"
echo "   • AsanaBridge web service integration"
echo "   • Automatic sync functionality"
echo "   • Menu bar status indicator"
echo ""
echo "Users only need to:"
echo "   1. Download one DMG"
echo "   2. Drag to Applications"
echo "   3. Open the app"
echo "   4. Follow the setup wizard"
echo "   5. Done! 🎯"