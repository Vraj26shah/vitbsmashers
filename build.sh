#!/bin/bash

echo "🔨 Building VIT Bhopal Student Portal"
echo "===================================="

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    exit 1
fi

# Validate essential files
echo "🔍 Validating essential files..."
ESSENTIAL_FILES=(
    "frontend/index.html"
    "frontend/style.css"
    "frontend/features/images/logo.png"
    "vercel.json"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing essential file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

        # Check for broken image links
        echo "🖼️ Checking image paths..."
        BROKEN_IMAGES=$(find frontend -name "*.html" -exec grep -l "src=\"\.\./\.\./" {} \; 2>/dev/null || true)

        if [ ! -z "$BROKEN_IMAGES" ]; then
            echo "⚠️ Warning: Found files with potentially broken image paths:"
            echo "$BROKEN_IMAGES"
            echo "💡 Run ./fix-paths.sh to fix image paths"
        else
            echo "✅ All image paths look correct!"
        fi

# Create a simple build output
echo "📦 Creating build output..."
mkdir -p dist
cp -r frontend/* dist/

echo "✅ Build completed successfully!"
echo "📁 Build output: dist/"
echo "🚀 Ready for deployment!" 