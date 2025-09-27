#!/bin/bash

# AsanaBridge DMG Installer Creator
# Creates a professional DMG installer with drag-to-Applications

set -e

echo "📦 Creating AsanaBridge DMG Installer..."

# Directories
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
APP_PATH="$BUILD_DIR/AsanaBridge.app"
DMG_DIR="$BUILD_DIR/dmg"
DMG_NAME="AsanaBridge-Installer"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ AsanaBridge.app not found. Run build-app.sh first."
    exit 1
fi

# Clean and create DMG directory
echo "🧹 Preparing DMG directory..."
rm -rf "$DMG_DIR"
mkdir -p "$DMG_DIR"

# Copy app to DMG directory
echo "📱 Copying AsanaBridge.app..."
cp -R "$APP_PATH" "$DMG_DIR/"

# Copy installation instructions
echo "📋 Adding installation instructions..."
cp "$PROJECT_DIR/INSTALL_INSTRUCTIONS.txt" "$DMG_DIR/"

# Create Applications symlink
echo "🔗 Creating Applications symlink..."
ln -s /Applications "$DMG_DIR/Applications"

# Create a simple background image (optional)
echo "🎨 Creating DMG background..."
python3 -c "
from PIL import Image, ImageDraw, ImageFont
import os

# Create a simple background for the DMG
img = Image.new('RGB', (600, 400), (240, 240, 245))
draw = ImageDraw.Draw(img)

# Add instructions text
try:
    font = ImageFont.truetype('/System/Library/Fonts/Arial.ttf', 24)
    text = 'Drag AsanaBridge to Applications folder'
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    x = (600 - text_width) // 2
    draw.text((x, 350), text, fill=(100, 100, 100), font=font)
except:
    pass

img.save('$DMG_DIR/.background.png')
"

# Create the DMG
echo "💿 Creating DMG file..."
hdiutil create -volname "AsanaBridge Installer" \
    -srcfolder "$DMG_DIR" \
    -ov -format UDZO \
    "$BUILD_DIR/$DMG_NAME.dmg"

# Remove quarantine from the DMG itself
echo "🔓 Removing quarantine from DMG..."
xattr -dr com.apple.quarantine "$BUILD_DIR/$DMG_NAME.dmg" 2>/dev/null || echo "⚠️  Quarantine removal failed, but continuing..."

echo "✅ DMG created successfully!"
echo "📍 Location: $BUILD_DIR/$DMG_NAME.dmg"
echo "📏 Size: $(du -h "$BUILD_DIR/$DMG_NAME.dmg" | cut -f1)"

# Clean up temporary DMG directory
rm -rf "$DMG_DIR"

# Copy DMG to releases directory for git tracking
RELEASES_DIR="$PROJECT_DIR/../releases/macos"
mkdir -p "$RELEASES_DIR"
DMG_FINAL_PATH="$RELEASES_DIR/AsanaBridge-Installer.dmg"

echo "📦 Copying DMG to releases directory..."
cp "$BUILD_DIR/$DMG_NAME.dmg" "$DMG_FINAL_PATH"

echo "✅ DMG created successfully!"
echo "📍 Location: $DMG_FINAL_PATH"
echo "📏 Size: $(du -h "$DMG_FINAL_PATH" | cut -f1)"

echo "🎉 DMG installer ready for distribution!"
echo ""
echo "📋 Next Steps:"
echo "1. Add to git: cd .. && git add releases/macos/AsanaBridge-Installer.dmg"
echo "2. Commit: git commit -m 'Add AsanaBridge DMG installer'"
echo "3. Push: git push origin main"
echo ""
echo "⚠️  IMPORTANT: macOS Security Notice"
echo "This app is not notarized by Apple. Users will need to:"
echo "1. Download and mount the DMG"
echo "2. Drag AsanaBridge to Applications"
echo "3. Right-click AsanaBridge in Applications → Open"
echo "4. Click 'Open' when prompted by macOS security"
echo ""
echo "Alternative method:"
echo "1. After seeing the security warning, go to:"
echo "   System Preferences → Security & Privacy → General"
echo "2. Click 'Open Anyway' next to the AsanaBridge message"
echo ""
echo "For testing: open '$DMG_FINAL_PATH'"