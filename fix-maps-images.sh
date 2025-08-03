#!/bin/bash

echo "🔧 Fixing image paths in maps.html..."

# Fix specific image paths that don't match actual filenames
sed -i 's|MultipurposeHall(1).png|MPH(1).png|g' frontend/features/maps/maps.html
sed -i 's|boysjmb(1).png|jmb.jpeg|g' frontend/features/maps/maps.html
sed -i 's|mayuriab(1).png|mayuriab(1).png|g' frontend/features/maps/maps.html
sed -i 's|underbelly(1).png|underbelly(1).png|g' frontend/features/maps/maps.html
sed -i 's|safalab(1).png|safalab(1).png|g' frontend/features/maps/maps.html
sed -i 's|bishtro,abcatering(1).png|bishtro,abcatering(1).png|g' frontend/features/maps/maps.html
sed -i 's|Openaudi(1).png|Openaudi(1).png|g' frontend/features/maps/maps.html
sed -i 's|Delivery(1).png|Delivery(1).png|g' frontend/features/maps/maps.html
sed -i 's|chancellor(1).png|chancellor(1).png|g' frontend/features/maps/maps.html
sed -i 's|gardenab(1).png|gardenab(1).png|g' frontend/features/maps/maps.html
sed -i 's|securitygarden(1).png|securitygarden(1).png|g' frontend/features/maps/maps.html
sed -i 's|blockgym(1).png|blockgym(1).png|g' frontend/features/maps/maps.html
sed -i 's|football(1).png|football(1).png|g' frontend/features/maps/maps.html
sed -i 's|Basketball(1).png|Basketball(1).png|g' frontend/features/maps/maps.html
sed -i 's|buspickup(1).png|buspickup(1).png|g' frontend/features/maps/maps.html

echo "✅ Image paths fixed in maps.html!"
echo "📁 Updated paths to match actual filenames" 