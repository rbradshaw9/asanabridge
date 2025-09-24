#!/bin/bash

# DigitalOcean Droplet Setup Script for AsanaBridge
# Run this script on your droplet: ./deploy-setup.sh

set -e

echo "🚀 Setting up AsanaBridge on DigitalOcean droplet..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install nginx
echo "📦 Installing nginx..."
sudo apt install -y nginx

# Install git
echo "📦 Installing git..."
sudo apt install -y git

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/asanabridge
sudo chown $USER:$USER /var/www/asanabridge

# Clone repository
echo "📥 Cloning repository..."
cd /var/www
git clone https://github.com/rbradshaw9/asanabridge.git
cd asanabridge

# Install dependencies and build
echo "📦 Installing dependencies..."
npm ci --production
npm run build

# Install agent dependencies and build
echo "📦 Installing agent dependencies..."
cd omnifocus-agent
npm ci --production
npm run build
cd ..

# Create environment file
echo "🔧 Creating environment configuration..."
cat > .env << EOL
# Database Configuration (DigitalOcean Managed Database)
DATABASE_URL="postgresql://doadmin:[PASSWORD]@dbaas-db-8209766-do-user-[ID]-0.c.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Server Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)

# Asana Configuration
ASANA_CLIENT_ID=your_asana_client_id
ASANA_CLIENT_SECRET=your_asana_client_secret
ASANA_REDIRECT_URI=https://asanabridge.com/oauth/asana/callback

# Frontend URL
FRONTEND_URL=https://asanabridge.com
EOL

echo "⚠️  IMPORTANT: Edit .env file with your actual database credentials and Asana API keys"

# Setup nginx configuration
echo "🌐 Configuring nginx..."
sudo tee /etc/nginx/sites-available/asanabridge << EOL
server {
    listen 80;
    server_name asanabridge.com www.asanabridge.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Enable the site
sudo ln -sf /etc/nginx/sites-available/asanabridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot for SSL
echo "🔒 Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

echo "🔒 Setting up SSL certificate..."
sudo certbot --nginx -d asanabridge.com -d www.asanabridge.com --non-interactive --agree-tos --email your-email@example.com

# Setup PM2 startup
echo "⚡ Configuring PM2 startup..."
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

echo "✅ Droplet setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit /var/www/asanabridge/.env with your database credentials"
echo "2. Get your Asana API credentials from https://app.asana.com/0/developer-console"
echo "3. Add your droplet IP (45.55.166.134) to your database's trusted sources"
echo "4. Run: cd /var/www/asanabridge && npx prisma migrate deploy"
echo "5. Start the application: pm2 start dist/server.js --name asanabridge"
echo "6. Start the agent: cd omnifocus-agent && pm2 start dist/agent.js --name omnifocus-agent"
echo "7. Save PM2 config: pm2 save"
echo "8. Test: curl https://asanabridge.com/health"