# AsanaBridge Deployment Guide

✅ **DEPLOYMENT COMPLETE** - AsanaBridge API is live at https://asanabridge.com

## 🚀 Production Environment

**Infrastructure:**
- **Droplet IP:** 45.55.166.134 (Ubuntu 22.04)
- **Database:** dbaas-db-8209766 (DigitalOcean Managed PostgreSQL)  
- **Domain:** asanabridge.com (SSL enabled with Let's Encrypt)
- **Process Manager:** PM2 with auto-restart
- **Web Server:** Nginx reverse proxy
- **SSL Certificate:** Valid until December 23, 2025

## 🎯 Live API Endpoints

- **API Root:** https://asanabridge.com/
- **Health Check:** https://asanabridge.com/health
- **Asana OAuth:** https://asanabridge.com/api/oauth/asana
- **User Registration:** https://asanabridge.com/api/auth/register
- **User Login:** https://asanabridge.com/api/auth/login
- **Sync Status:** https://asanabridge.com/api/sync/status
- **Trigger Sync:** https://asanabridge.com/api/sync/trigger

## 📋 Deployment Status

### ✅ Complete
- [x] DigitalOcean droplet provisioned and configured
- [x] Managed PostgreSQL database connected
- [x] Domain DNS configured with SSL certificate
- [x] GitHub Actions deployment pipeline
- [x] Production environment variables configured
- [x] Asana OAuth integration setup (Client ID: 1211366195420553)
- [x] PM2 process manager with auto-restart
- [x] Nginx reverse proxy with SSL termination
- [x] Let's Encrypt SSL certificate (auto-renewal enabled)

### 🔄 Ready for Next Phase
- [ ] Frontend React dashboard
- [ ] Stripe payment integration
- [ ] OmniFocus agent distribution

## 🛠️ Step-by-Step Deployment

### Step 1: Create Managed Database

```bash
# Using DigitalOcean CLI (doctl)
doctl databases create asanabridge-db \
  --engine postgres \
  --version 15 \
  --size db-s-1vcpu-1gb \
  --region nyc3

# Or use the web interface:
# 1. Go to Databases → Create Database
# 2. Choose PostgreSQL 15
# 3. Select Basic plan, 1GB RAM
# 4. Name: asanabridge-db
# 5. Region: New York 3
```

### Step 2: Create Droplet

```bash
# Create droplet with Docker pre-installed
doctl compute droplet create asanabridge-prod \
  --image docker-20-04 \
  --size s-2vcpu-2gb \
  --region nyc3 \
  --ssh-keys YOUR_SSH_KEY_ID

# Or via web interface:
# 1. Create Droplet
# 2. Ubuntu 20.04 with Docker
# 3. Basic plan, 2GB RAM / 1 vCPU
# 4. New York 3 datacenter
# 5. Add your SSH key
# 6. Name: asanabridge-prod
```

### Step 3: Configure DNS

```bash
# After droplet creation, configure DNS:
doctl compute domain records create asanabridge.com \
  --record-type A \
  --record-name @ \
  --record-data YOUR_DROPLET_IP

doctl compute domain records create asanabridge.com \
  --record-type CNAME \
  --record-name www \
  --record-data @
```

### Step 4: Deploy Application

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Install dependencies and clone repository:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install additional tools
apt-get install -y git nginx certbot python3-certbot-nginx

# Clone repository
git clone https://github.com/rbradshaw9/asanabridge.git
cd asanabridge
```

### Step 5: Configure Environment

```bash
# Create production environment file
cp .env.example .env.production

# Edit environment (use nano or vim)
nano .env.production
```

Configure these values:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@your-db-host:25060/defaultdb?sslmode=require
JWT_SECRET=your_super_secure_jwt_secret_64_characters_long_minimum_production
ASANA_CLIENT_ID=your_asana_client_id
ASANA_CLIENT_SECRET=your_asana_client_secret
ASANA_REDIRECT_URI=https://asanabridge.com/api/oauth/asana/callback
FRONTEND_URL=https://asanabridge.com
```

### Step 6: Build and Deploy

```bash
# Install dependencies
npm install --production

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Create systemd service
sudo tee /etc/systemd/system/asanabridge.service > /dev/null <<EOF
[Unit]
Description=AsanaBridge API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/asanabridge
Environment=NODE_ENV=production
EnvironmentFile=/root/asanabridge/.env.production
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl enable asanabridge
systemctl start asanabridge
```

### Step 7: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/asanabridge.com > /dev/null <<EOF
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
EOF

# Enable site
ln -s /etc/nginx/sites-available/asanabridge.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
```

### Step 8: Enable SSL with Let's Encrypt

```bash
# Get SSL certificate
certbot --nginx -d asanabridge.com -d www.asanabridge.com

# Test auto-renewal
certbot renew --dry-run
```

### Step 9: Setup Monitoring

```bash
# Create log rotation
sudo tee /etc/logrotate.d/asanabridge > /dev/null <<EOF
/root/asanabridge/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    copytruncate
}
EOF

# Create health check script
sudo tee /usr/local/bin/asanabridge-health.sh > /dev/null <<'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "AsanaBridge health check failed - restarting service"
    systemctl restart asanabridge
fi
EOF

chmod +x /usr/local/bin/asanabridge-health.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/asanabridge-health.sh") | crontab -
```

## 🔧 Post-Deployment Testing

### Test API Endpoints

```bash
# Health check
curl https://asanabridge.com/health

# API status  
curl https://asanabridge.com/api/status

# Should return JSON responses
```

### Test Database Connection

```bash
# Check application logs
journalctl -u asanabridge -f

# Should show "database: connected" in health checks
```

## 📊 Monitoring & Maintenance

### Key Commands

```bash
# Check service status
systemctl status asanabridge

# View logs
journalctl -u asanabridge -f

# Restart service
systemctl restart asanabridge

# Update application
cd /root/asanabridge
git pull
npm install --production
npm run build
systemctl restart asanabridge
```

### Performance Monitoring

Set up DigitalOcean monitoring:
1. Enable monitoring in Droplet settings
2. Configure alerts for CPU, memory, disk usage
3. Set up uptime monitoring for https://asanabridge.com/health

## 🚨 Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check database credentials
cat .env.production | grep DATABASE_URL

# Test database connection
npx prisma db pull
```

**SSL Certificate Issues:**
```bash
# Renew certificate manually
certbot renew

# Check certificate status
certbot certificates
```

**Service Won't Start:**
```bash
# Check logs
journalctl -u asanabridge --no-pager

# Check environment file
cat .env.production
```

## 💰 Cost Optimization

**Production (Launch):**
- Droplet: 2GB RAM / 1 vCPU - $12/month
- Database: 1GB RAM - $15/month  
- **Total: $27/month**

**Scale Up (Growth):**
- Droplet: 4GB RAM / 2 vCPU - $24/month
- Database: 2GB RAM - $30/month
- **Total: $54/month**

**Scale Out (High Traffic):**
- 2x Droplets behind load balancer - $48/month
- Database cluster - $60/month
- Load balancer - $12/month
- **Total: $120/month**

## 🔐 Security Hardening

```bash
# Firewall setup
ufw enable
ufw allow ssh
ufw allow 'Nginx Full'

# Disable root login (optional)
# Create non-root user first, then:
# sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
# systemctl restart ssh

# Auto-security updates
apt install unattended-upgrades
dpkg-reconfigure unattended-upgrades
```

## 📝 Deployment Checklist

- [ ] Database created and accessible
- [ ] Droplet created with Docker
- [ ] DNS configured and propagated
- [ ] Application deployed and running
- [ ] Nginx configured with SSL
- [ ] Health checks working
- [ ] Monitoring enabled
- [ ] Backup strategy implemented
- [ ] Security hardening applied

**Total Deployment Time: ~2 hours**