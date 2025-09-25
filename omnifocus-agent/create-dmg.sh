#!/bin/bash

# AsanaBridge DMG Installer Creator
# Creates a professional DMG installer with drag-to-Applications

set -e

echo "📦 Creating AsanaBridge DMG Installer..."

# Directories
PROJECT_DIR="/Users/ryanbradshaw/Git Projects/asanabridge/asanabridge/omnifocus-agent"
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

echo "✅ DMG created successfully!"
echo "📍 Location: $BUILD_DIR/$DMG_NAME.dmg"
echo "📏 Size: $(du -h "$BUILD_DIR/$DMG_NAME.dmg" | cut -f1)"

# Clean up temporary DMG directory
rm -rf "$DMG_DIR"

echo "🎉 DMG installer ready for distribution!"
echo ""
echo "To distribute:"
echo "1. Test the DMG: open '$BUILD_DIR/$DMG_NAME.dmg'"
echo "2. For production: Add code signing and notarization"