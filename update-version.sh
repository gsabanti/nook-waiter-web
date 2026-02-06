#!/bin/bash

# Automatic versioning for cache busting
# Updates all JS/CSS files with current timestamp

set -e

TIMESTAMP=$(date +%m%d%H%M)
VERSION="v=$TIMESTAMP"

echo "🔄 Updating version to: $VERSION"

# Update index.html with new version (replace existing versions)
sed -i "s/\?v=[0-9]\{8\}/?$VERSION/g" index.html

# Add versions to files that don't have them yet
sed -i "s/config\.js\"/config.js?$VERSION\"/g" index.html
sed -i "s/phone-mask\.js\"/phone-mask.js?$VERSION\"/g" index.html
sed -i "s/api\.js\"/api.js?$VERSION\"/g" index.html
sed -i "s/qr-scanner\.js\"/qr-scanner.js?$VERSION\"/g" index.html
sed -i "s/app\.js\"/app.js?$VERSION\"/g" index.html
sed -i "s/styles\.css\"/styles.css?$VERSION\"/g" index.html

echo "✅ Version updated in index.html"

# Show what changed
echo ""
echo "📋 Updated files:"
grep -E "\.(js|css)\?v=" index.html | sed 's/.*src="/- /' | sed 's/".*//'

echo ""
echo "🚀 Ready to deploy with version: $TIMESTAMP"