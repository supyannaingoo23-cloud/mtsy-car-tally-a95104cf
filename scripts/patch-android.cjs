#!/usr/bin/env node
/**
 * Patches the generated android/ project for MTSY Car Tally:
 *  - Inserts required permissions in AndroidManifest.xml
 *  - Sets gradle JVM heap to 1024m for low-RAM build machines
 *
 * Run AFTER `npx cap add android` and after each `npx cap sync`:
 *   node scripts/patch-android.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
const GRADLE_PROPS = path.join(ROOT, "android", "gradle.properties");

const PERMISSIONS = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_LOCATION",
];

function patchManifest() {
  if (!fs.existsSync(MANIFEST)) {
    console.warn("[patch-android] AndroidManifest.xml not found — run `npx cap add android` first.");
    return;
  }
  let xml = fs.readFileSync(MANIFEST, "utf8");
  let added = 0;
  for (const p of PERMISSIONS) {
    if (!xml.includes(p)) {
      const tag = `    <uses-permission android:name="${p}" />`;
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
  const line = "org.gradle.jvmargs=-Xmx1024m";
  if (/^org\.gradle\.jvmargs=.*/m.test(txt)) {
    txt = txt.replace(/^org\.gradle\.jvmargs=.*/m, line);
  } else {
    txt += (txt.endsWith("\n") ? "" : "\n") + line + "\n";
  }
  fs.writeFileSync(GRADLE_PROPS, txt);
  console.log("[patch-android] gradle.properties: org.gradle.jvmargs=-Xmx1024m");
}

patchManifest();
patchGradleProps();
console.log("[patch-android] Done.");
