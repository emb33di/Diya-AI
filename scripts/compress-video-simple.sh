#!/bin/bash

# Simpler one-pass compression script
# Usage: ./scripts/compress-video-simple.sh

INPUT="public/Website Previews/essays-wide.mp4"
OUTPUT="public/Website Previews/essays-wide-compressed.mp4"

if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is not installed."
    echo "Install with: brew install ffmpeg"
    exit 1
fi

CURRENT_SIZE=$(stat -f%z "$INPUT" 2>/dev/null || stat -c%s "$INPUT" 2>/dev/null)
CURRENT_SIZE_MB=$((CURRENT_SIZE / 1024 / 1024))

echo "📊 Current size: ${CURRENT_SIZE_MB}MB"
echo "🎬 Compressing to under 50MB..."
echo ""

# Single-pass compression with CRF (Constant Rate Factor)
# CRF 23-28 is a good balance. Lower = better quality but larger file
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -crf 26 \
  -preset medium \
  -vf "scale=1920:-2" \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  "$OUTPUT"

if [ -f "$OUTPUT" ]; then
    NEW_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null)
    NEW_SIZE_MB=$((NEW_SIZE / 1024 / 1024))
    
    echo ""
    echo "✅ Compressed: ${CURRENT_SIZE_MB}MB → ${NEW_SIZE_MB}MB"
    
    if [ $NEW_SIZE_MB -lt 50 ]; then
        echo "✅ Under 50MB! Review the file and replace if quality is good."
    else
        echo "⚠️  Still ${NEW_SIZE_MB}MB. Try lower CRF (e.g., 28) or reduce resolution."
    fi
fi

