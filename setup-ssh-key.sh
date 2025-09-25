#!/bin/bash

# Script to add GitHub Actions SSH key to droplet
# Run this on the droplet via DigitalOcean console

echo "Setting up GitHub Actions SSH key for deployment..."

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the GitHub Actions public key to authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBpgZviK8gGyArNcfA42D5/phzGhnfSf5CadZAG/yHB4 github-actions-deploy" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys

# Ensure SSH service is running
systemctl enable ssh
systemctl restart ssh

echo "✅ SSH key added successfully!"
echo "GitHub Actions should now be able to connect to this droplet."

# Test the current git status in the project directory
echo ""
echo "=== Current project status ==="
cd /var/www/asanabridge 2>/dev/null || echo "Project directory not found at /var/www/asanabridge"
if [ -d "/var/www/asanabridge" ]; then
    echo "Current commit: $(git rev-parse HEAD | cut -c1-8)"
    echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "Git status:"
    git status --porcelain
fi