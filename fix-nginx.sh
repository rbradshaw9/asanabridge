#!/bin/bash

# Script to diagnose and fix nginx API routing issue

echo "=== Checking nginx configuration ==="
echo "Nginx sites-available configuration:"
cat /etc/nginx/sites-available/asanabridge.com

echo -e "\n=== Checking if backend is running ==="
ps aux | grep node

echo -e "\n=== Checking if port 3000 is listening ==="
netstat -tlnp | grep :3000

echo -e "\n=== Testing backend directly ==="
curl -s http://localhost:3000/api/status || echo "Backend not responding on localhost:3000"

echo -e "\n=== Testing health endpoint (which works) ==="
curl -s http://localhost:3000/health || echo "Health endpoint not responding"

echo -e "\n=== Proposed nginx configuration fix ==="
cat << 'EOF'
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name asanabridge.com;

    ssl_certificate /etc/letsencrypt/live/asanabridge.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/asanabridge.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # API routes - proxy to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health endpoint - proxy to backend
    location /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve frontend static files
    location / {
        root /var/www/asanabridge/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name asanabridge.com;
    return 301 https://$server_name$request_uri;
}
EOF