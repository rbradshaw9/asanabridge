#!/bin/bash

# create-unified-dmg.sh
# Creates a professional DMG installer for the unified AsanaBridge app

set -e

echo "📦 Creating Unified AsanaBridge DMG Installer..."

# Get script directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
APP_PATH="$BUILD_DIR/AsanaBridge.app"
DMG_DIR="$BUILD_DIR/dmg"
DMG_NAME="AsanaBridge-Unified-Installer"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ AsanaBridge.app not found. Run build-unified-app.sh first."
    exit 1
fi

# Clean and create DMG directory
echo "🧹 Preparing DMG directory..."
rm -rf "$DMG_DIR"
mkdir -p "$DMG_DIR"

# Copy the app
echo "📱 Copying AsanaBridge.app..."
cp -R "$APP_PATH" "$DMG_DIR/"

# Create installation instructions
cat > "$DMG_DIR/README.txt" << 'EOF'
AsanaBridge - Unified Installation
=================================

Welcome to AsanaBridge 2.0! 🎉

SIMPLE INSTALLATION:
1. Drag AsanaBridge.app to your Applications folder
2. Double-click AsanaBridge in Applications to launch
3. Follow the setup wizard (takes 2 minutes)
4. Done! Your tasks will sync automatically

WHAT THIS APP DOES:
✅ Connects to your AsanaBridge account
✅ Automatically finds and connects to OmniFocus
✅ Runs a local sync agent (no separate downloads)
✅ Syncs tasks between Asana and OmniFocus
✅ Shows status in your menu bar

SYSTEM REQUIREMENTS:
• macOS 10.15 or later
• OmniFocus 3 (will help you install if needed)
• AsanaBridge account (sign up at asanabridge.com)

SECURITY NOTE:
This app is not notarized by Apple. When you first open it:
1. Right-click AsanaBridge.app in Applications
2. Select "Open" from the menu
3. Click "Open" when prompted by macOS
(You only need to do this once)

SUPPORT:
Need help? Visit: https://asanabridge.com/support
Email: support@asanabridge.com

Happy syncing! 🚀
EOF

# Create Applications symlink
echo "🔗 Creating Applications symlink..."
ln -sf /Applications "$DMG_DIR/Applications"

# Create temporary DMG
echo "💿 Creating DMG file..."
TEMP_DMG="$BUILD_DIR/${DMG_NAME}-temp.dmg"
FINAL_DMG="$BUILD_DIR/${DMG_NAME}.dmg"

# Remove existing DMGs
rm -f "$TEMP_DMG" "$FINAL_DMG"

# Create DMG
hdiutil create -srcfolder "$DMG_DIR" -volname "AsanaBridge Installer" -fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW "$TEMP_DMG"

# Mount the DMG
MOUNT_DIR="/Volumes/AsanaBridge Installer"
hdiutil attach "$TEMP_DMG" -readwrite -noverify -noautoopen

# Set DMG properties
echo "🎨 Customizing DMG appearance..."

# Set background and icon positions using AppleScript
osascript << 'EOF'
tell application "Finder"
    tell disk "AsanaBridge Installer"
        open
        set current view of container window to icon view
        set toolbar visible of container window to false
        set statusbar visible of container window to false
        set the bounds of container window to {400, 100, 1000, 500}
        set theViewOptions to the icon view options of container window
        set arrangement of theViewOptions to not arranged
        set icon size of theViewOptions to 128
        
        -- Position icons
        set position of item "AsanaBridge.app" of container window to {150, 200}
        set position of item "Applications" of container window to {450, 200}
        set position of item "README.txt" of container window to {300, 350}
        
        close
        open
        update without registering applications
        delay 2
    end tell
end tell
EOF

# Unmount the DMG
hdiutil detach "$MOUNT_DIR"

# Convert to final compressed DMG
echo "🗜️  Compressing DMG..."
hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$FINAL_DMG"

# Clean up
rm -f "$TEMP_DMG"
rm -rf "$DMG_DIR"

# Remove quarantine
echo "🔓 Removing quarantine from DMG..."
xattr -d com.apple.quarantine "$FINAL_DMG" 2>/dev/null || true

# Get file size
FILE_SIZE=$(du -h "$FINAL_DMG" | cut -f1)

echo "✅ Unified DMG created successfully!"
echo "📍 Location: $FINAL_DMG"
echo "📏 Size: $FILE_SIZE"
echo "🎉 DMG installer ready for distribution!"

echo ""
echo "⚠️  IMPORTANT: macOS Security Notice"
echo "This app is not notarized by Apple. Users will need to:"
echo "1. Download and mount the DMG"
echo "2. Drag AsanaBridge to Applications"
echo "3. Right-click AsanaBridge in Applications → Open"
echo "4. Click 'Open' when prompted by macOS security"
echo ""
echo "For testing: open '$FINAL_DMG'"