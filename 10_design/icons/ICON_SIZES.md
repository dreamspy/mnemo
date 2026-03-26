# Required Icon Sizes

Two master sources in `source/`:
- **Master Detailed.png** (2048x2048) — rich, textured icon with journal + glass brain. Used for **512x512 and above**.
- **Master Symbolic.png** (837x837) — clean brain silhouette, reads well small. Used for **below 512x512**.

## iOS (Expo)

| File                  | Size      | Source   | Purpose                    |
|-----------------------|-----------|----------|----------------------------|
| `icon.png`            | 1024x1024 | Detailed | App Store / Expo default   |
| `adaptive-icon.png`   | 1024x1024 | Detailed | Android adaptive foreground |
| `splash-icon.png`     | 1024x1024 | Detailed | Splash screen              |

Expo handles all other iOS icon sizes automatically from the 1024x1024 file.

## Web / PWA

| File                  | Size      | Source   | Purpose                    |
|-----------------------|-----------|----------|----------------------------|
| `favicon.png`         | 48x48     | Symbolic | Browser tab favicon        |
| `apple-touch-icon.png`| 180x180   | Symbolic | iOS Safari bookmark        |

## macOS / Tauri

| File                  | Size      | Source   | Purpose                    |
|-----------------------|-----------|----------|----------------------------|
| `icon.icns`           | multi     | Both     | macOS app icon bundle      |
| `32x32.png`           | 32x32     | Symbolic | Small icon                 |
| `128x128.png`         | 128x128   | Symbolic | Medium icon                |
| `128x128@2x.png`      | 256x256   | Symbolic | Medium icon @2x            |
| `256x256.png`         | 256x256   | Symbolic | Large icon                 |
| `512x512.png`         | 512x512   | Detailed | Extra large icon           |
| `icon.png`            | 1024x1024 | Detailed | Full size                  |
| `icon.ico`            | 256x256   | Symbolic | Windows (if needed later)  |

## Generation

Run the script to regenerate all icons from both masters:

```bash
./05_scripts/generate_icons.sh
```

Requires ImageMagick (`magick`) and macOS `iconutil`.
