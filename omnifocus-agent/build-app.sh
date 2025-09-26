#!/bin/bash

# AsanaBridge macOS App Builder
# Creates a proper .app bundle for easy distribution

set -e

echo "🚀 Building AsanaBridge macOS App..."

# Directories
PROJECT_DIR="/Users/ryanbradshaw/Git Projects/asanabridge/asanabridge/omnifocus-agent"
BUILD_DIR="$PROJECT_DIR/build"
APP_DIR="$BUILD_DIR/AsanaBridge.app"
RESOURCES_DIR="$APP_DIR/Contents/Resources"
MACOS_DIR="$APP_DIR/Contents/MacOS"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$BUILD_DIR"

# Create app bundle structure
echo "📁 Creating app bundle structure..."
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Copy executable
echo "📦 Copying executable..."
cp "$PROJECT_DIR/releases/asanabridge-agent-macos" "$MACOS_DIR/AsanaBridge"
chmod +x "$MACOS_DIR/AsanaBridge"

# Copy scripts and resources
echo "📋 Copying resources..."
cp -r "$PROJECT_DIR/scripts" "$RESOURCES_DIR/"
cp "$PROJECT_DIR/.env.example" "$RESOURCES_DIR/"

# Build and include status app
echo "🔧 Building status app..."
if [ -f "$PROJECT_DIR/build-status-app.sh" ]; then
    cd "$PROJECT_DIR"
    ./build-status-app.sh
    if [ -d "$PROJECT_DIR/AsanaBridgeStatus.app" ]; then
        echo "📱 Including status app..."
        cp -r "$PROJECT_DIR/AsanaBridgeStatus.app" "$RESOURCES_DIR/"
    fi
fi

# Create Info.plist
echo "📝 Creating Info.plist..."
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>AsanaBridge</string>
    <key>CFBundleExecutable</key>
    <string>AsanaBridge</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.asanabridge.omnifocus-agent</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>AsanaBridge</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2025 AsanaBridge. All rights reserved.</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSAppleEventsUsageDescription</key>
    <string>AsanaBridge needs to communicate with OmniFocus to sync your tasks.</string>
</dict>
</plist>
EOF

# Create app icon (placeholder)
echo "🎨 Creating app icon..."
mkdir -p "$BUILD_DIR/AppIcon.iconset"

python3 -c "
from PIL import Image, ImageDraw, ImageFont
import os

sizes = [16, 32, 64, 128, 256, 512, 1024]
iconset_path = '$BUILD_DIR/AppIcon.iconset'

for size in sizes:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Create gradient background
    for i in range(size):
        ratio = i / size
        r = int(52 * (1 - ratio) + 100 * ratio)
        g = int(152 * (1 - ratio) + 200 * ratio)
        b = int(219 * (1 - ratio) + 255 * ratio)
        draw.rectangle([0, i, size, i+1], fill=(r, g, b, 255))
    
    # Add AB text for larger sizes
    if size >= 64:
        try:
            font_size = max(size // 3, 12)
            font = ImageFont.truetype('/System/Library/Fonts/Arial Bold.ttf', font_size)
            text = 'AB'
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            x = (size - text_width) // 2
            y = (size - text_height) // 2
            draw.text((x, y), text, fill='white', font=font)
        except:
            # Fallback without custom font
            pass
    
    img.save(os.path.join(iconset_path, f'icon_{size}x{size}.png'))
    
    # Create @2x versions for retina
    if size <= 512:
        retina_size = size * 2
        retina_img = img.resize((retina_size, retina_size), Image.Resampling.LANCZOS)
        retina_img.save(os.path.join(iconset_path, f'icon_{size}x{size}@2x.png'))
"

# Convert to icns
iconutil -c icns "$BUILD_DIR/AppIcon.iconset" -o "$RESOURCES_DIR/AppIcon.icns"

# Clean up iconset
rm -rf "$BUILD_DIR/AppIcon.iconset"

echo "✅ AsanaBridge.app created successfully!"
echo "📍 Location: $APP_DIR"
echo ""
echo "Next steps:"
echo "1. Test the app: open '$APP_DIR'"
echo "2. Create DMG installer for distribution"
echo "3. Set up code signing for production"

# Test the app
echo "🧪 Testing app bundle..."
if [ -f "$MACOS_DIR/AsanaBridge" ]; then
    echo "✅ Executable found and is ready"
else
    echo "❌ Executable missing!"
    exit 1
fi

# Ad-hoc code signing to prevent Gatekeeper issues
echo "🔐 Code signing executable..."
codesign --force --sign - "$MACOS_DIR/AsanaBridge" 2>/dev/null || echo "⚠️  Executable signing failed, but continuing..."

echo "🔐 Code signing app bundle..."
codesign --force --deep --sign - "$APP_DIR" 2>/dev/null || echo "⚠️  App bundle signing failed, but continuing..."

# Remove quarantine attribute that might cause issues
echo "🔓 Removing quarantine attributes..."
xattr -dr com.apple.quarantine "$APP_DIR" 2>/dev/null || echo "⚠️  Quarantine removal failed, but continuing..."

echo "🎉 Build complete!"