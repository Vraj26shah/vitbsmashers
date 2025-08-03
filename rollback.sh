#!/bin/bash

echo "🔄 Rollback Script for VIT Bhopal Student Portal"
echo "=============================================="

# List recent deployments
echo "📋 Recent deployments:"
npx vercel ls --prod

echo ""
echo "🔄 Available rollback options:"
echo "1. Rollback to previous deployment"
echo "2. List all deployments"
echo "3. Rollback to specific deployment"

read -p "🤔 Choose an option (1-3): " choice

case $choice in
    1)
        echo "🔄 Rolling back to previous deployment..."
        npx vercel rollback --prod
        echo "✅ Rollback completed!"
        ;;
    2)
        echo "📋 All deployments:"
        npx vercel ls --prod
        ;;
    3)
        read -p "🔢 Enter deployment ID to rollback to: " deployment_id
        echo "🔄 Rolling back to deployment: $deployment_id"
        npx vercel rollback --prod $deployment_id
        echo "✅ Rollback completed!"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac 