#!/bin/bash

# Create DMG for simplified AsanaBridge app

set -e

APP_NAME="AsanaBridge"
VERSION="2.3.0"
BUILD_DIR="build"
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
VOLUME_NAME="$APP_NAME $VERSION"

echo "📦 Creating DMG for AsanaBridge v$VERSION..."

# Check if app exists
if [ ! -d "$BUILD_DIR/$APP_NAME.app" ]; then
    echo "❌ Error: App not found. Run build-simple-app.sh first."
    exit 1
fi

# Clean previous DMG
rm -f "$DMG_NAME"
rm -f "${APP_NAME}-Latest.dmg"

# Create temporary directory for DMG contents
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Copy app to temp directory
cp -R "$BUILD_DIR/$APP_NAME.app" "$TMP_DIR/"

# Create Applications symlink
ln -s /Applications "$TMP_DIR/Applications"

# Create DMG
echo "🔨 Creating disk image..."
hdiutil create -volname "$VOLUME_NAME" \
    -srcfolder "$TMP_DIR" \
    -ov -format UDZO \
    "$DMG_NAME"

# Create "Latest" symlink
cp "$DMG_NAME" "${APP_NAME}-Latest.dmg"

echo "✅ DMG created: $DMG_NAME"
echo "✅ Latest link: ${APP_NAME}-Latest.dmg"
echo ""
echo "📤 To upload to server:"
echo "   scp -i ~/.ssh/asanabridge ${APP_NAME}-Latest.dmg root@143.110.152.9:/var/www/asanabridge/public/downloads/"
