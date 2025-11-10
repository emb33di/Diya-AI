#!/bin/bash

# Script to compress essays-wide.mp4 to under 50MB
# Usage: ./scripts/compress-video.sh

INPUT="public/Website Previews/essays-wide.mp4"
OUTPUT="public/Website Previews/essays-wide-compressed.mp4"
TARGET_SIZE_MB=50

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is not installed."
    echo ""
    echo "Install it with:"
    echo "  brew install ffmpeg"
    echo ""
    echo "Or download from: https://ffmpeg.org/download.html"
    exit 1
fi

# Get current file size
CURRENT_SIZE=$(stat -f%z "$INPUT" 2>/dev/null || stat -c%s "$INPUT" 2>/dev/null)
CURRENT_SIZE_MB=$((CURRENT_SIZE / 1024 / 1024))

echo "📊 Current file size: ${CURRENT_SIZE_MB}MB"
echo "🎯 Target size: ${TARGET_SIZE_MB}MB"
echo ""

# Calculate target bitrate (in kbps)
# Formula: bitrate = (target_size_mb * 8 * 1024) / duration_seconds
# We'll use a two-pass encoding approach for better quality

echo "🎬 Starting compression..."
echo "   This may take a few minutes..."
echo ""

# First pass: analyze video
echo "📹 Pass 1/2: Analyzing video..."
ffmpeg -i "$INPUT" -c:v libx264 -preset slow -b:v 2000k -pass 1 -an -f null /dev/null 2>/dev/null

# Second pass: encode with optimized settings
echo "📹 Pass 2/2: Encoding video..."
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset slow \
  -b:v 2000k \
  -maxrate 2500k \
  -bufsize 4000k \
  -vf "scale=1920:-2" \
  -c:a aac \
  -b:a 128k \
  -pass 2 \
  -movflags +faststart \
  "$OUTPUT" 2>/dev/null

# Check if compression was successful
if [ -f "$OUTPUT" ]; then
    NEW_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null)
    NEW_SIZE_MB=$((NEW_SIZE / 1024 / 1024))
    
    echo ""
    echo "✅ Compression complete!"
    echo "   Original size: ${CURRENT_SIZE_MB}MB"
    echo "   New size: ${NEW_SIZE_MB}MB"
    echo "   Reduction: $((CURRENT_SIZE_MB - NEW_SIZE_MB))MB ($(( (CURRENT_SIZE_MB - NEW_SIZE_MB) * 100 / CURRENT_SIZE_MB ))%)"
    echo ""
    
    if [ $NEW_SIZE_MB -lt $TARGET_SIZE_MB ]; then
        echo "✅ File is now under ${TARGET_SIZE_MB}MB!"
        echo ""
        echo "💡 Next steps:"
        echo "   1. Review the compressed video: $OUTPUT"
        echo "   2. If quality is acceptable, replace the original:"
        echo "      mv $OUTPUT $INPUT"
        echo "   3. Upload to Supabase Storage"
    else
        echo "⚠️  File is still ${NEW_SIZE_MB}MB (target: ${TARGET_SIZE_MB}MB)"
        echo "   You may need to reduce bitrate further or trim the video"
    fi
    
    # Clean up pass log files
    rm -f ffmpeg2pass-0.log ffmpeg2pass-0.log.mbtree 2>/dev/null
else
    echo "❌ Compression failed. Please check the error messages above."
    exit 1
fi

