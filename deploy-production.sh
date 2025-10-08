#!/bin/bash

# AsanaBridge v2.2.1 Production Deployment Script
# This script deploys the latest code to production with proper Prisma client generation

set -e  # Exit on any error

echo "🚀 AsanaBridge v2.2.1 Deployment Starting..."
echo "================================================"

# Navigate to project directory
cd /var/www/asanabridge

# Pull latest code from GitHub
echo ""
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
npm install

# CRITICAL: Generate Prisma client (creates proper TypeScript types)
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build backend (TypeScript → JavaScript)
echo ""
echo "🔨 Building backend..."
npm run build

# Build frontend (React)
echo ""
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Restart application with PM2
echo ""
echo "🔄 Restarting application..."
pm2 restart asanabridge

# Show status
echo ""
echo "✅ Deployment complete! Status:"
pm2 status

# Show recent logs
echo ""
echo "📊 Recent logs (last 20 lines):"
pm2 logs asanabridge --lines 20 --nostream

echo ""
echo "================================================"
echo "🎉 Deployment successful!"
echo ""
echo "Next steps:"
echo "1. Test version endpoint: curl https://asanabridge.com/api/status"
echo "2. Test diagnostic endpoint: curl -H \"Authorization: Bearer TOKEN\" https://asanabridge.com/api/diagnostics/health"
echo "3. Download and test v2.2.1 app from dashboard"
echo ""
