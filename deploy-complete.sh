#!/bin/bash

# deploy-complete.sh
# Complete deployment pipeline: Build app → Create DMG → Deploy to GitHub → Deploy to Production

set -e

echo "🚀 AsanaBridge Complete Deployment Pipeline"
echo "==========================================="
echo ""

# Get script directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
AGENT_DIR="$PROJECT_DIR/omnifocus-agent"
DMG_PATH="$AGENT_DIR/build/AsanaBridge-Unified-Installer.dmg"
PUBLIC_DIR="$PROJECT_DIR/public/downloads"

# Step 1: Build the Swift app
echo "📱 Step 1/6: Building macOS App..."
cd "$AGENT_DIR"
chmod +x build-unified-app.sh
./build-unified-app.sh

if [ ! -d "$AGENT_DIR/build/AsanaBridge.app" ]; then
    echo "❌ App build failed!"
    exit 1
fi

echo "✅ App built successfully"
echo ""

# Step 2: Create app icon (if ImageMagick is available)
echo "🎨 Step 2/6: Creating App Icon..."
if [ -f "$AGENT_DIR/create-app-icon.sh" ]; then
    chmod +x create-app-icon.sh
    ./create-app-icon.sh || echo "⚠️  Icon creation skipped"
fi
echo ""

# Step 3: Create DMG installer
echo "📦 Step 3/6: Creating DMG Installer..."
chmod +x create-unified-dmg.sh
./create-unified-dmg.sh

if [ ! -f "$DMG_PATH" ]; then
    echo "❌ DMG creation failed!"
    exit 1
fi

echo "✅ DMG created successfully"
echo ""

# Step 4: Copy DMG to public downloads directory
echo "📂 Step 4/6: Copying DMG to public directory..."
mkdir -p "$PUBLIC_DIR"
cp "$DMG_PATH" "$PUBLIC_DIR/AsanaBridge-Latest.dmg"
cp "$DMG_PATH" "$PUBLIC_DIR/AsanaBridge-v2.2.1.dmg"

echo "✅ DMG copied to public directory"
echo ""

# Step 5: Commit and push to GitHub
echo "📤 Step 5/6: Pushing to GitHub..."
cd "$PROJECT_DIR"

git add .
git diff --cached --quiet || git commit -m "🚀 Deploy: Updated macOS app v2.2.1 with enhanced logging and DMG installer

- Enhanced logging system with module-specific logs
- Created comprehensive DMG installer with drag-to-install
- Added color scheme (Bridge Blue #2563EB, Sync Purple #8B5CF6)
- Improved agent registration and heartbeat
- Latest DMG available in public/downloads"

git push origin main

echo "✅ Changes pushed to GitHub"
echo ""

# Step 6: Deploy to Production
echo "🌐 Step 6/6: Deploying to Production Server..."

# SSH key path
SSH_KEY=~/.ssh/asanabridge
SERVER="root@143.110.152.9"

# Pull latest code
echo "   → Pulling latest code..."
ssh -i "$SSH_KEY" "$SERVER" "cd /var/www/asanabridge && git pull origin main"

# Build backend
echo "   → Building backend..."
ssh -i "$SSH_KEY" "$SERVER" "cd /var/www/asanabridge && npm run build"

# Restart PM2
echo "   → Restarting application..."
ssh -i "$SSH_KEY" "$SERVER" "pm2 restart asanabridge"

# Verify deployment
echo "   → Verifying deployment..."
sleep 3
ssh -i "$SSH_KEY" "$SERVER" "pm2 status asanabridge"

echo ""
echo "✅ Production deployment complete!"
echo ""

# Show DMG info
DMG_SIZE=$(du -h "$DMG_PATH" | cut -f1)
DMG_MD5=$(md5 -q "$DMG_PATH" 2>/dev/null || md5sum "$DMG_PATH" | cut -d' ' -f1)

echo "📊 Deployment Summary"
echo "===================="
echo "App Version:      2.2.1"
echo "DMG Location:     $PUBLIC_DIR/AsanaBridge-Latest.dmg"
echo "DMG Size:         $DMG_SIZE"
echo "DMG MD5:          $DMG_MD5"
echo "Download URL:     https://asanabridge.com/public/downloads/AsanaBridge-Latest.dmg"
echo "GitHub:           https://github.com/rbradshaw9/asanabridge"
echo "Production:       https://asanabridge.com"
echo ""
echo "🎉 Deployment complete! Users can now download the latest version."
echo ""
echo "📝 Next steps:"
echo "   1. Test download from: https://asanabridge.com/public/downloads/AsanaBridge-Latest.dmg"
echo "   2. Verify app launches and connects"
echo "   3. Check logs: ssh -i ~/.ssh/asanabridge root@143.110.152.9 'pm2 logs asanabridge'"
