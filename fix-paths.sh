#!/bin/bash

echo "🔧 Fixing image paths in HTML files..."

# Fix logo paths in all HTML files
find frontend -name "*.html" -type f -exec sed -i 's|src="../images/logo.png"|src="../../images/logo.png"|g' {} \;

# Fix other image paths in maps.html
sed -i 's|src="../images/|src="../../images/|g' frontend/features/maps/maps.html

echo "✅ Image paths fixed!"
echo "📁 Updated paths to use correct relative paths from frontend directory" 