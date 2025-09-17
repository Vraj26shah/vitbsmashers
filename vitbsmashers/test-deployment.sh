#!/bin/bash

echo "🧪 Testing VIT Bhopal Student Portal Deployment..."

BASE_URL="https://vitbsmashers-o874s45i6-vraj26shahs-projects.vercel.app"

# Array of pages to test
pages=(
    "/"
    "/login1.html"
    "/features/marketplace/market.html"
    "/features/ttmaker/ttmaker1.html"
)

echo "🔍 Testing main pages..."

for page in "${pages[@]}"; do
    echo -n "Testing $page... "
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page" | grep -q "200"; then
        echo "✅ OK"
    else
        echo "❌ FAILED"
    fi
done

echo ""
echo "🌐 Your site is live at: $BASE_URL"
echo "📱 Test on mobile devices too!"
echo "🔧 Use browser DevTools (F12) to check for any console errors" 