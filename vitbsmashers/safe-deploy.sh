#!/bin/bash

echo "🛡️ Safe Deployment Script for VIT Bhopal Student Portal"
echo "=================================================="

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Validate frontend files
echo "🔍 Validating frontend files..."
if [ ! -f "frontend/index.html" ]; then
    echo "❌ Error: frontend/index.html not found"
    exit 1
fi

# Create timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
echo "📅 Deployment timestamp: $TIMESTAMP"

# Check current deployment status
echo "📊 Checking current deployment..."
CURRENT_DEPLOYMENT=$(npx vercel ls --prod 2>/dev/null | head -1 | awk '{print $1}')

if [ ! -z "$CURRENT_DEPLOYMENT" ]; then
    echo "✅ Current deployment found: $CURRENT_DEPLOYMENT"
else
    echo "⚠️ No current production deployment found"
fi

# Deploy to preview first
echo "🚀 Deploying to preview environment..."
PREVIEW_URL=$(npx vercel --yes 2>&1 | grep -o 'https://[^[:space:]]*' | head -1)

if [ ! -z "$PREVIEW_URL" ]; then
    echo "✅ Preview deployment successful: $PREVIEW_URL"
    echo "🔍 Please test the preview deployment before proceeding to production"
    
    read -p "🤔 Do you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to production..."
        npx vercel --prod --yes
        
        echo "✅ Production deployment complete!"
        echo "🌐 Your site is now live at the production URL"
        echo "💡 To rollback: Use 'npx vercel rollback' if needed"
    else
        echo "⏸️ Production deployment cancelled. Preview remains available at: $PREVIEW_URL"
    fi
else
    echo "❌ Preview deployment failed"
    exit 1
fi 