#!/bin/bash

# AsanaBridge Auto-Updater Integration Script
# This script sets up Sparkle framework for seamless app updates

echo "🔧 Setting up Sparkle Auto-Updater for AsanaBridge..."

# Create Frameworks directory in app bundle
mkdir -p "AsanaBridge.app/Contents/Frameworks"

# Download Sparkle framework (latest version)
echo "📥 Downloading Sparkle framework..."
curl -L "https://github.com/sparkle-project/Sparkle/releases/latest/download/Sparkle-for-Swift-Package-Manager.zip" -o sparkle.zip

# Extract Sparkle
unzip -q sparkle.zip
mv Sparkle.framework AsanaBridge.app/Contents/Frameworks/

# Clean up
rm -rf sparkle.zip __MACOSX

echo "✅ Sparkle framework installed successfully!"
echo "📝 Next steps:"
echo "   1. Add Sparkle import to Swift code"
echo "   2. Configure automatic update checking"
echo "   3. Set up appcast.xml on server"
echo "   4. Sign the app bundle"