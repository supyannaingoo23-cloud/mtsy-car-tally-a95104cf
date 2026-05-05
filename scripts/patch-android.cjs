#!/usr/bin/env node
/**
 * Patches the generated android/ project for MTSY Car Tally.
 * Run after `npx cap add android` and after every `npx cap sync`:
 *
 *   node scripts/patch-android.cjs
 *
 * - Adds tools namespace + required permissions to AndroidManifest.xml
 *   (notifications, exact alarms, foreground service, background location,
 *    boot-completed for re-scheduling Friday reminders).
 * - Tunes android/gradle.properties for low-RAM build machines (≤ 8 GB).
 * - Idempotent: safe to run multiple times.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
const GRADLE_PROPS = path.join(ROOT, "android", "gradle.properties");

const PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.USE_EXACT_ALARM",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.WAKE_LOCK",
];

const GRADLE_LINES = {
  "org.gradle.jvmargs":
    "org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8",
  "org.gradle.daemon": "org.gradle.daemon=true",
  "org.gradle.parallel": "org.gradle.parallel=true",
  "org.gradle.caching": "org.gradle.caching=true",
  "android.useAndroidX": "android.useAndroidX=true",
  "android.enableJetifier": "android.enableJetifier=true",
};

function patchManifest() {
  if (!fs.existsSync(MANIFEST)) {
    console.warn("[patch-android] AndroidManifest.xml not found — run `npx cap add android` first.");
    return;
  }
  let xml = fs.readFileSync(MANIFEST, "utf8");

  // Ensure xmlns:tools is declared so we can use tools:node="merge".
  if (!/xmlns:tools=/.test(xml)) {
    xml = xml.replace(
      /<manifest\s+([^>]*?)>/,
      `<manifest $1\n    xmlns:tools="http://schemas.android.com/tools">`,
    );
  }

  let added = 0;
  for (const p of PERMISSIONS) {
    if (!xml.includes(`android:name="${p}"`)) {
      const tag =
        p === "android.permission.ACCESS_BACKGROUND_LOCATION"
          ? `    <uses-permission android:name="${p}" tools:node="merge" />`
          : `    <uses-permission android:name="${p}" />`;
      xml = xml.replace(/<manifest[^>]*>/, (m) => `${m}\n${tag}`);
      added++;
    }
  }

  fs.writeFileSync(MANIFEST, xml);
  console.log(`[patch-android] AndroidManifest.xml: +${added} permission(s)`);
}

function patchGradleProps() {
  if (!fs.existsSync(GRADLE_PROPS)) {
    console.warn("[patch-android] gradle.properties not found.");
    return;
  }
  let txt = fs.readFileSync(GRADLE_PROPS, "utf8");
  for (const [key, fullLine] of Object.entries(GRADLE_LINES)) {
    const re = new RegExp(`^${key.replace(/\./g, "\\.")}=.*$`, "m");
    if (re.test(txt)) {
      txt = txt.replace(re, fullLine);
    } else {
      txt += (txt.endsWith("\n") ? "" : "\n") + fullLine + "\n";
    }
  }
  fs.writeFileSync(GRADLE_PROPS, txt);
  console.log("[patch-android] gradle.properties: tuned for 8 GB RAM build hosts");
}

patchManifest();
patchGradleProps();
console.log("[patch-android] Done. Now run: npx cap sync android && npx cap open android");
