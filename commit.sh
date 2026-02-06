#!/bin/bash

# Smart commit script with automatic versioning
# Usage: ./commit.sh "commit message"

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./commit.sh \"commit message\""
    exit 1
fi

COMMIT_MSG="$1"

echo "🚀 Smart commit with automatic versioning"
echo "📝 Message: $COMMIT_MSG"
echo ""

# Update version numbers
echo "🔄 Updating version numbers..."
./update-version.sh
echo ""

# Copy to production
echo "📂 Copying to production..."
cp *.js *.html *.css /var/www/sabanti_tech/html/waiter/ 2>/dev/null || echo "⚠️ Could not copy to production (not on server)"
echo ""

# Git operations
echo "📦 Git operations..."
git add .
git status --porcelain

echo ""
read -p "🤔 Commit these changes? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "$COMMIT_MSG"
    
    echo ""
    read -p "🚀 Push to GitHub? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin main
        echo "✅ Pushed to GitHub successfully!"
    else
        echo "⏸️ Committed locally only"
    fi
else
    echo "❌ Commit cancelled"
fi

echo ""
echo "🎉 Done! Version updated and deployed."