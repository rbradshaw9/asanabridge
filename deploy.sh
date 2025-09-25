#!/bin/bash

# AsanaBridge One-Liner Deployment Command Generator
# This generates the curl command to paste into your DigitalOcean droplet console

echo "🚀 AsanaBridge One-Liner Deployment"
echo ""
echo "Copy and paste this command into your DigitalOcean droplet console:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "export DB_PASSWORD='[YOUR_DB_PASSWORD]' && curl -sSL https://raw.githubusercontent.com/rbradshaw9/asanabridge/main/deploy-setup.sh | bash"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This single command will:"
echo "✅ Set the database password environment variable"
echo "✅ Download the deployment script from GitHub"
echo "✅ Execute the complete deployment setup"
echo "✅ Install all dependencies and configure everything"
echo ""
echo "After completion, you'll need to:"
echo "📝 Update Asana API keys in /var/www/asanabridge/.env"
echo "🌐 Configure DNS to point to your droplet IP"
echo "🔒 Run: sudo certbot --nginx (for SSL)"