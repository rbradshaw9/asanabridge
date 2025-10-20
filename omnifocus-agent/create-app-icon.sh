#!/bin/bash

# create-app-icon.sh
# Creates app icon using iconutil (requires macOS)

set -e

echo "🎨 Creating AsanaBridge App Icon..."

# Get script directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONSET_DIR="$PROJECT_DIR/AsanaBridge.iconset"
ICON_OUTPUT="$PROJECT_DIR/AsanaBridge.icns"

# Create iconset directory
mkdir -p "$ICONSET_DIR"

# Generate icon using ImageMagick or sips
# For now, create a simple blue/purple gradient circle icon with "AB" text
# This requires ImageMagick to be installed: brew install imagemagick

if command -v convert &> /dev/null; then
    echo "✨ Generating icon images with ImageMagick..."
    
    # Create base 1024x1024 icon
    convert -size 1024x1024 \
        -define gradient:angle=135 \
        gradient:'#2563EB-#8B5CF6' \
        -gravity center \
        \( -size 900x900 xc:none -draw "circle 450,450 450,50" \) \
        -compose DstIn -composite \
        \( -background none -fill white -font "Helvetica-Bold" -pointsize 480 label:"AB" \) \
        -gravity center -composite \
        "$ICONSET_DIR/icon_512x512@2x.png"
    
    # Generate all required sizes
    sips -z 16 16 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_16x16.png" &>/dev/null
    sips -z 32 32 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_16x16@2x.png" &>/dev/null
    sips -z 32 32 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_32x32.png" &>/dev/null
    sips -z 64 64 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_32x32@2x.png" &>/dev/null
    sips -z 128 128 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_128x128.png" &>/dev/null
    sips -z 256 256 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_128x128@2x.png" &>/dev/null
    sips -z 256 256 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_256x256.png" &>/dev/null
    sips -z 512 512 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_256x256@2x.png" &>/dev/null
    sips -z 512 512 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_512x512.png" &>/dev/null
    
    # Convert iconset to icns
    iconutil -c icns "$ICONSET_DIR" -o "$ICON_OUTPUT"
    
    echo "✅ Icon created: $ICON_OUTPUT"
    
    # Clean up
    rm -rf "$ICONSET_DIR"
    
else
    echo "⚠️  ImageMagick not found. Install with: brew install imagemagick"
    echo "Creating placeholder icon instead..."
    
    # Create a simple placeholder using just sips
    # Create a blue square as base
    sips -z 1024 1024 -s format png /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns --out "$ICONSET_DIR/icon_512x512@2x.png" 2>/dev/null || {
        echo "❌ Could not create placeholder icon"
        rm -rf "$ICONSET_DIR"
        exit 1
    }
    
    # Generate all sizes from the base
    sips -z 16 16 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_16x16.png" &>/dev/null
    sips -z 32 32 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_16x16@2x.png" &>/dev/null
    sips -z 32 32 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_32x32.png" &>/dev/null
    sips -z 64 64 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_32x32@2x.png" &>/dev/null
    sips -z 128 128 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_128x128.png" &>/dev/null
    sips -z 256 256 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_128x128@2x.png" &>/dev/null
    sips -z 256 256 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_256x256.png" &>/dev/null
    sips -z 512 512 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_256x256@2x.png" &>/dev/null
    sips -z 512 512 "$ICONSET_DIR/icon_512x512@2x.png" --out "$ICONSET_DIR/icon_512x512.png" &>/dev/null
    
    iconutil -c icns "$ICONSET_DIR" -o "$ICON_OUTPUT"
    
    echo "✅ Placeholder icon created: $ICON_OUTPUT"
    echo "   Install ImageMagick for better icon: brew install imagemagick"
    
    rm -rf "$ICONSET_DIR"
fi

echo "🎉 Icon generation complete!"
