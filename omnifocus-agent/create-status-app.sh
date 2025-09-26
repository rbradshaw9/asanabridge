#!/bin/bash
# AsanaBridge Status Launcher
# This script can be turned into an app bundle for easy dock access

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create app bundle structure if it doesn't exist
APP_DIR="$SCRIPT_DIR/AsanaBridge Status.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

if [ ! -d "$APP_DIR" ]; then
    echo "Creating AsanaBridge Status.app bundle..."
    
    mkdir -p "$MACOS_DIR"
    mkdir -p "$RESOURCES_DIR"
    
    # Create Info.plist
    cat > "$CONTENTS_DIR/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AsanaBridge Status</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleIdentifier</key>
    <string>com.asanabridge.status</string>
    <key>CFBundleName</key>
    <string>AsanaBridge Status</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF
    
    # Create launcher script
    cat > "$MACOS_DIR/AsanaBridge Status" << 'EOF'
#!/bin/bash
# Check if agent is running
if ! curl -s http://localhost:7842/health > /dev/null 2>&1; then
    osascript -e 'display dialog "AsanaBridge agent is not running.

Please start the agent first:
1. Open Terminal
2. Navigate to the AsanaBridge agent directory
3. Run: npm start

Or check if the agent is installed properly." with title "AsanaBridge Status" buttons {"Open Dashboard", "OK"} default button "OK"' &
    if echo "$?" | grep -q "Open Dashboard"; then
        open "https://asanabridge.com/dashboard"
    fi
    exit 1
fi

# Show status popup
curl -s http://localhost:7842/status/popup > /dev/null 2>&1
EOF
    
    chmod +x "$MACOS_DIR/AsanaBridge Status"
    
    # Create a simple icon (you can replace this with a proper .icns file)
    echo "📊" > "$RESOURCES_DIR/icon.txt"
    
    echo "✅ AsanaBridge Status.app created!"
    echo "You can drag this to your Dock for easy access to status."
    echo ""
    echo "To use:"
    echo "1. Make sure the AsanaBridge agent is running"
    echo "2. Double-click the app or click it in the Dock"
    echo "3. A status popup will appear with sync information"
    echo ""
fi

# Run the status check
exec "$MACOS_DIR/AsanaBridge Status"