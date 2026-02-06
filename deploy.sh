#!/bin/bash

# Nook Waiter Web App Deployment Script
# Run this script on the server to deploy the waiter web app

set -e  # Exit on any error

# Configuration
DEPLOY_PATH="/var/www/sabanti_tech/html/waiter"
BACKUP_PATH="/tmp/waiter-backup-$(date +%Y%m%d-%H%M%S)"
NGINX_CONFIG="/etc/nginx/sites-available/sabanti.tech"
REPO_URL="https://github.com/gsabanti/nook-waiter-web.git"

echo "🚀 Deploying Nook Waiter Web App..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    echo "✅ Running with root privileges"
else
    echo "❌ Please run with sudo: sudo ./deploy.sh"
    exit 1
fi

# Create backup of existing deployment
if [ -d "$DEPLOY_PATH" ]; then
    echo "📦 Creating backup of existing deployment..."
    cp -r "$DEPLOY_PATH" "$BACKUP_PATH"
    echo "   Backup saved to: $BACKUP_PATH"
fi

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p "$DEPLOY_PATH"

# Clone or update repository
if [ -d "$DEPLOY_PATH/.git" ]; then
    echo "🔄 Updating existing repository..."
    cd "$DEPLOY_PATH"
    git fetch origin
    git reset --hard origin/main
else
    echo "📥 Cloning repository..."
    rm -rf "$DEPLOY_PATH"/*
    git clone "$REPO_URL" "$DEPLOY_PATH"
    cd "$DEPLOY_PATH"
fi

# Set proper permissions
echo "🔒 Setting file permissions..."
chown -R www-data:www-data "$DEPLOY_PATH"
find "$DEPLOY_PATH" -type f -exec chmod 644 {} \;
find "$DEPLOY_PATH" -type d -exec chmod 755 {} \;

# Update configuration for production
echo "⚙️  Updating configuration..."
sed -i 's/DEV_MODE: true/DEV_MODE: false/g' "$DEPLOY_PATH/config.js"
sed -i 's/DEBUG: true/DEBUG: false/g' "$DEPLOY_PATH/config.js"

# Update version numbers for cache busting
echo "🔄 Updating version numbers for cache busting..."
cd "$DEPLOY_PATH"
if [ -f "update-version.sh" ]; then
    chmod +x update-version.sh
    ./update-version.sh
    echo "✅ Version numbers updated"
else
    # Manual version update if script missing
    TIMESTAMP=$(date +%m%d%H%M)
    VERSION="v=$TIMESTAMP"
    echo "📋 Manually updating to version: $VERSION"
    
    sed -i "s/\?v=[0-9]\{8\}/?$VERSION/g" index.html || true
    sed -i "s/config\.js\"/config.js?$VERSION\"/g" index.html || true
    sed -i "s/phone-mask\.js\"/phone-mask.js?$VERSION\"/g" index.html || true
    sed -i "s/api\.js\"/api.js?$VERSION\"/g" index.html || true
    sed -i "s/qr-scanner\.js\"/qr-scanner.js?$VERSION\"/g" index.html || true
    sed -i "s/app\.js\"/app.js?$VERSION\"/g" index.html || true
    sed -i "s/styles\.css\"/styles.css?$VERSION\"/g" index.html || true
fi

# Check nginx configuration
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    systemctl reload nginx
    echo "🔄 Nginx reloaded"
else
    echo "❌ Nginx configuration error. Please check:"
    echo "   - SSL certificates are properly configured"
    echo "   - /waiter location is added to server block"
    echo "   - HTTPS is enabled (required for camera access)"
    exit 1
fi

# Verify deployment
echo "🧪 Verifying deployment..."
if [ -f "$DEPLOY_PATH/index.html" ]; then
    echo "✅ index.html found"
else
    echo "❌ index.html missing!"
    exit 1
fi

if [ -f "$DEPLOY_PATH/config.js" ]; then
    echo "✅ config.js found"
else
    echo "❌ config.js missing!"
    exit 1
fi

# Test HTTPS access
echo "🌐 Testing HTTPS access..."
if curl -s -k https://localhost/waiter/ > /dev/null; then
    echo "✅ HTTPS endpoint accessible"
else
    echo "⚠️  HTTPS endpoint test failed (this may be normal if testing locally)"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📍 Waiter app deployed to: $DEPLOY_PATH"
echo "🌐 Access URL: https://sabanti.tech/waiter"
echo ""
echo "Next steps:"
echo "1. Open https://sabanti.tech/waiter in browser"
echo "2. Test QR scanner with camera permissions"
echo "3. Login with staff credentials"
echo "4. Configure restaurant ID in config.js if needed"
echo ""
echo "🔍 To check logs: journalctl -u nginx -f"
echo "📝 To edit config: nano $DEPLOY_PATH/config.js"
echo ""

# Show current configuration
echo "📋 Current configuration:"
grep -E "(API_BASE_URL|DEFAULT_RESTAURANT_ID|DEV_MODE)" "$DEPLOY_PATH/config.js" | head -3

echo ""
echo "✨ Deployment complete! The waiter web app is ready to use."