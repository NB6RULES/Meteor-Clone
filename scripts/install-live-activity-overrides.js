#!/usr/bin/env node
// Copies our customized Live Activity Swift files over the ones shipped by
// expo-live-activity. Runs on npm install / npm ci, so Codemagic picks them up
// before `expo prebuild` generates the widget extension target.
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'live-activity-overrides');
const PKG_DIR = path.join(__dirname, '..', 'node_modules', 'expo-live-activity', 'ios-files');

if (!fs.existsSync(PKG_DIR)) {
  console.log('[adhd-do] expo-live-activity not installed yet — skipping overrides.');
  process.exit(0);
}

const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.swift'));
for (const file of files) {
  const src = path.join(SRC_DIR, file);
  const dest = path.join(PKG_DIR, file);
  fs.copyFileSync(src, dest);
  console.log(`[adhd-do] overrode ${file}`);
}
