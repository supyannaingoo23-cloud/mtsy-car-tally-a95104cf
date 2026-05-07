#!/usr/bin/env bash
###############################################################################
# MTSY Car Rental — One-command signed Android release APK builder.
#
# Usage:
#   bash scripts/build-release-apk.sh
#
# Required environment variables (export before running, or put in a .env.release
# file in the project root — it will be auto-loaded if present):
#
#   MTSY_KEYSTORE_PATH       Absolute path to your .jks/.keystore file
#   MTSY_KEYSTORE_PASSWORD   Password for the keystore
#   MTSY_KEY_ALIAS           Key alias inside the keystore
#   MTSY_KEY_PASSWORD        Password for the key alias
#
# If you don't have a keystore yet, this script will offer to generate one
# (interactive) using `keytool` from your installed JDK.
#
# Output:
#   android/app/build/outputs/apk/release/app-release.apk      (signed APK)
#   android/app/build/outputs/bundle/release/app-release.aab   (Play Store AAB)
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Auto-load .env.release if present
if [ -f "$ROOT/.env.release" ]; then
  echo "→ Loading .env.release"
  set -a; . "$ROOT/.env.release"; set +a
fi

# 1) Make sure web build + native project exist
echo "→ Installing JS deps"
if command -v bun >/dev/null 2>&1; then bun install; else npm install; fi

echo "→ Building web bundle (vite)"
npm run build

if [ ! -d "$ROOT/android" ]; then
  echo "→ Adding Android platform"
  npx cap add android
fi

echo "→ Patching Android manifest + gradle"
node scripts/patch-android.cjs

echo "→ Syncing Capacitor → Android"
npx cap sync android

# 2) Production config: strip dev server.url so APK loads bundled assets
echo "→ Ensuring production capacitor.config (no dev server.url)"
node -e "
const fs=require('fs'),p='android/app/src/main/assets/capacitor.config.json';
if(fs.existsSync(p)){const j=JSON.parse(fs.readFileSync(p,'utf8'));delete j.server;fs.writeFileSync(p,JSON.stringify(j,null,2));console.log('  cleared server block');}
"

# 3) Keystore — generate if missing
if [ -z "${MTSY_KEYSTORE_PATH:-}" ] || [ ! -f "${MTSY_KEYSTORE_PATH:-/nope}" ]; then
  echo ""
  echo "⚠  No keystore found at \$MTSY_KEYSTORE_PATH."
  read -r -p "   Generate a new release keystore now? [y/N] " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    MTSY_KEYSTORE_PATH="${MTSY_KEYSTORE_PATH:-$ROOT/mtsy-release.jks}"
    MTSY_KEY_ALIAS="${MTSY_KEY_ALIAS:-mtsy}"
    keytool -genkey -v \
      -keystore "$MTSY_KEYSTORE_PATH" \
      -alias "$MTSY_KEY_ALIAS" \
      -keyalg RSA -keysize 2048 -validity 10000
    echo ""
    echo "✅ Keystore created: $MTSY_KEYSTORE_PATH"
    echo "   Save the passwords you just typed into .env.release:"
    echo "     MTSY_KEYSTORE_PATH=$MTSY_KEYSTORE_PATH"
    echo "     MTSY_KEY_ALIAS=$MTSY_KEY_ALIAS"
    echo "     MTSY_KEYSTORE_PASSWORD=..."
    echo "     MTSY_KEY_PASSWORD=..."
    echo "   Then re-run this script."
    exit 0
  else
    echo "❌ Cannot sign without a keystore. Aborting."; exit 1
  fi
fi

: "${MTSY_KEYSTORE_PASSWORD:?Set MTSY_KEYSTORE_PASSWORD}"
: "${MTSY_KEY_ALIAS:?Set MTSY_KEY_ALIAS}"
: "${MTSY_KEY_PASSWORD:?Set MTSY_KEY_PASSWORD}"

# 4) Inject signingConfig into android/app/build.gradle (idempotent)
GRADLE="$ROOT/android/app/build.gradle"
if ! grep -q "signingConfigs.release" "$GRADLE" 2>/dev/null; then
  echo "→ Patching android/app/build.gradle with release signingConfig"
  node -e "
const fs=require('fs'),p='$GRADLE';
let g=fs.readFileSync(p,'utf8');
const sc=\`
    signingConfigs {
        release {
            storeFile file(System.getenv('MTSY_KEYSTORE_PATH'))
            storePassword System.getenv('MTSY_KEYSTORE_PASSWORD')
            keyAlias System.getenv('MTSY_KEY_ALIAS')
            keyPassword System.getenv('MTSY_KEY_PASSWORD')
        }
    }
\`;
g=g.replace(/android\s*{/, m => m + sc);
g=g.replace(/buildTypes\s*{\s*release\s*{/, m => m + '\n            signingConfig signingConfigs.release');
fs.writeFileSync(p,g);
"
fi

# 5) Build signed APK + AAB
cd android
echo "→ Gradle: assembleRelease (APK)"
./gradlew --no-daemon assembleRelease
echo "→ Gradle: bundleRelease (AAB for Play Store)"
./gradlew --no-daemon bundleRelease
cd ..

APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"

echo ""
echo "✅ Build complete:"
[ -f "$APK" ] && echo "   APK : $APK"
[ -f "$AAB" ] && echo "   AAB : $AAB  ← upload this to Play Console"
