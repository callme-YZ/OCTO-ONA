#!/bin/bash

echo "🧪 Testing OCTO-ONA v1.2 External Data Loading"
echo "=============================================="

# Clean previous outputs
echo "🧹 Cleaning previous outputs..."
rm -rf demo-dashboard-external/
rm -f demo-dashboard.html

# Build project
echo "🔨 Building project..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

# Test external data mode
echo ""
echo "📊 Testing external data mode..."
npx ts-node examples/dashboard-demo-external.ts > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ External data generation failed"
  exit 1
fi
echo "✅ External data generation successful"

# Verify outputs
echo ""
echo "🔍 Verifying outputs..."

if [ ! -f "demo-dashboard-external/index.html" ]; then
  echo "❌ index.html not found"
  exit 1
fi
echo "✅ index.html exists"

if [ ! -f "demo-dashboard-external/data.json" ]; then
  echo "❌ data.json not found"
  exit 1
fi
echo "✅ data.json exists"

# Verify fetch() in HTML
if ! grep -q "fetch('./data.json')" demo-dashboard-external/index.html; then
  echo "❌ HTML does not use fetch('./data.json')"
  exit 1
fi
echo "✅ HTML uses fetch('./data.json')"

# Verify data.json structure
if ! jq -e '.graphId' demo-dashboard-external/data.json > /dev/null 2>&1; then
  echo "❌ data.json structure invalid"
  exit 1
fi
echo "✅ data.json structure valid"

# Security check
echo ""
echo "🔒 Security checks..."
if grep -r "im-test.xming.ai\|zhangxu@\|真实.*UID" src/ examples/ > /dev/null 2>&1; then
  echo "❌ Sensitive data found in source files!"
  exit 1
fi
echo "✅ No sensitive data in source files"

# File size check
HTML_SIZE=$(stat -f%z demo-dashboard-external/index.html)
DATA_SIZE=$(stat -f%z demo-dashboard-external/data.json)
echo ""
echo "📏 File sizes:"
echo "  - index.html: $(echo "scale=2; $HTML_SIZE/1024" | bc) KB"
echo "  - data.json: $(echo "scale=2; $DATA_SIZE/1024" | bc) KB"

if [ $HTML_SIZE -gt 50000 ]; then
  echo "⚠️  Warning: HTML file larger than expected (should be ~16KB)"
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "💡 To view the dashboard:"
echo "   open demo-dashboard-external/index.html"
