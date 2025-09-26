#!/bin/bash

# Linux-compatible app distribution script
# Since DMG creation requires macOS, this creates a tar.gz for distribution

set -e

echo "📦 Creating AsanaBridge Distribution Package (Linux)..."

# Get the directory where this script is located
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
APP_PATH="$BUILD_DIR/AsanaBridgeStatus.app"
DIST_DIR="$BUILD_DIR/dist"
DIST_NAME="AsanaBridge-Status-App"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ AsanaBridgeStatus.app not found. Run build-status-app.sh first."
    echo "📝 Note: macOS app building requires macOS with Xcode/Swift compiler."
    echo "📝 This Linux server can only redistribute pre-built apps."
    
    # Check if we have a pre-built app to distribute
    if [ -f "$BUILD_DIR/AsanaBridge-Status-App.tar.gz" ]; then
        echo "✅ Found existing distribution package: $BUILD_DIR/AsanaBridge-Status-App.tar.gz"
        echo "📍 File size: $(du -h "$BUILD_DIR/AsanaBridge-Status-App.tar.gz" | cut -f1)"
        echo "🎉 Distribution package ready!"
        exit 0
    else
        echo "❌ No pre-built app found. You need to:"
        echo "   1. Build the app on a macOS machine"
        echo "   2. Upload the built app to this server"
        echo "   3. Then run this script to create distribution package"
        exit 1
    fi
fi

# Clean and create distribution directory
echo "🧹 Preparing distribution directory..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy the app
echo "📱 Copying AsanaBridge Status App..."
cp -R "$APP_PATH" "$DIST_DIR/"

# Create installation instructions
cat > "$DIST_DIR/INSTALL.txt" << 'EOF'
AsanaBridge Status App Installation Instructions
==============================================

1. Download and extract this package
2. Drag AsanaBridgeStatus.app to your Applications folder
3. Right-click the app in Applications and select "Open"
4. Click "Open" when macOS shows the security warning
5. The app will appear in your menu bar with a status icon

The app will:
- Show connection status to OmniFocus
- Test your AsanaBridge agent connectivity  
- Allow manual sync triggering
- Display account information

For support, visit: https://asanabridge.com/support

Note: This app requires macOS 10.15 or later.
EOF

# Create the distribution archive
echo "📦 Creating distribution package..."
cd "$BUILD_DIR"
tar -czf "$DIST_NAME.tar.gz" -C dist .

# Get file size
FILE_SIZE=$(du -h "$DIST_NAME.tar.gz" | cut -f1)

echo "✅ Distribution package created successfully!"
echo "📍 Location: $BUILD_DIR/$DIST_NAME.tar.gz"
echo "📏 Size: $FILE_SIZE"
echo "🎉 Package ready for distribution!"

echo ""
echo "📝 To make this available for download:"
echo "   sudo cp '$BUILD_DIR/$DIST_NAME.tar.gz' /var/www/html/downloads/"
echo "   # Or upload to your CDN/file hosting service"