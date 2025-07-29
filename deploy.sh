#!/bin/bash

echo "🚀 Deploying VIT Bhopal Student Portal to Vercel..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Deploy to Vercel
echo "📦 Deploying..."
npx vercel --yes

echo "✅ Deployment complete!"
echo "🌐 Your site should be live at the URL provided above." 