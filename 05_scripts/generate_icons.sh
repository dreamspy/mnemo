#!/bin/bash
# Generate all app icons from two master source images.
#   - Master Detailed: used for 512x512 and above
#   - Master Symbolic: used for sizes below 512x512
# Usage: ./05_scripts/generate_icons.sh
# Requires: ImageMagick (magick), macOS iconutil

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DETAILED="$PROJECT_ROOT/10_design/icons/source/Master Detailed.png"
SYMBOLIC="$PROJECT_ROOT/10_design/icons/source/Master Symbolic.png"

for F in "$DETAILED" "$SYMBOLIC"; do
  if [ ! -f "$F" ]; then
    echo "Error: Source file not found: $F"
    exit 1
  fi
done

echo "Detailed: $(sips -g pixelWidth -g pixelHeight "$DETAILED" 2>/dev/null | grep pixel | tr '\n' ' ')"
echo "Symbolic: $(sips -g pixelWidth -g pixelHeight "$SYMBOLIC" 2>/dev/null | grep pixel | tr '\n' ' ')"
echo ""

# Helper: pick source based on target size
src_for() {
  if [ "$1" -ge 512 ]; then echo "$DETAILED"; else echo "$SYMBOLIC"; fi
}

resize() {
  local size=$1 output=$2
  magick "$(src_for "$size")" -resize ${size}x${size} -type TrueColorAlpha PNG32:"$output"
}

# --- Expo (iOS + Android) ---
EXPO_ASSETS="$PROJECT_ROOT/08_app/assets"
echo "=== Expo icons ==="
resize 1024 "$EXPO_ASSETS/icon.png"
echo "  icon.png (1024x1024) [detailed]"

resize 1024 "$EXPO_ASSETS/adaptive-icon.png"
echo "  adaptive-icon.png (1024x1024) [detailed]"

resize 1024 "$EXPO_ASSETS/splash-icon.png"
echo "  splash-icon.png (1024x1024) [detailed]"

# --- Web / PWA ---
EXPO_PUBLIC="$PROJECT_ROOT/08_app/public"
echo ""
echo "=== Web / PWA icons ==="
resize 48 "$EXPO_ASSETS/favicon.png"
echo "  favicon.png (48x48) [symbolic]"

resize 180 "$EXPO_PUBLIC/apple-touch-icon.png"
echo "  apple-touch-icon.png (180x180) [symbolic]"

# --- Tauri (macOS desktop) ---
TAURI_ICONS="$PROJECT_ROOT/09_desktop/src-tauri/icons"
mkdir -p "$TAURI_ICONS"
echo ""
echo "=== Tauri icons ==="

for SIZE in 32 128 256; do
  resize $SIZE "$TAURI_ICONS/${SIZE}x${SIZE}.png"
  echo "  ${SIZE}x${SIZE}.png [symbolic]"
done

resize 512 "$TAURI_ICONS/512x512.png"
echo "  512x512.png [detailed]"

resize 256 "$TAURI_ICONS/128x128@2x.png"
echo "  128x128@2x.png (256x256) [symbolic]"

resize 1024 "$TAURI_ICONS/icon.png"
echo "  icon.png (1024x1024) [detailed]"

# Windows .ico
magick "$SYMBOLIC" -resize 256x256 "$TAURI_ICONS/icon.ico"
echo "  icon.ico (256x256) [symbolic]"

# macOS .icns (uses both sources depending on size)
echo ""
echo "=== macOS .icns ==="
ICONSET_DIR=$(mktemp -d)/icon.iconset
mkdir -p "$ICONSET_DIR"

for ENTRY in \
  "icon_16x16.png 16" \
  "icon_16x16@2x.png 32" \
  "icon_32x32.png 32" \
  "icon_32x32@2x.png 64" \
  "icon_64x64.png 64" \
  "icon_64x64@2x.png 128" \
  "icon_128x128.png 128" \
  "icon_128x128@2x.png 256" \
  "icon_256x256.png 256" \
  "icon_256x256@2x.png 512" \
  "icon_512x512.png 512" \
  "icon_512x512@2x.png 1024"; do
  NAME="${ENTRY% *}"
  SIZE="${ENTRY#* }"
  resize "$SIZE" "$ICONSET_DIR/$NAME"
done

iconutil -c icns "$ICONSET_DIR" -o "$TAURI_ICONS/icon.icns"
echo "  icon.icns (multi-size, both sources)"
rm -rf "$(dirname "$ICONSET_DIR")"

echo ""
echo "Done! All icons generated."
