#!/usr/bin/env node
// Postinstall patch for expo-live-activity so the Live Activity widget gets
// our custom ADHD-DO views + supports tappable checkboxes via AppIntents.
//
// 1. Copies our Swift overrides into the package's ios-files/ directory so
//    `expo prebuild` ships our customized widget views and ToggleTaskIntent.
// 2. Bumps the widget extension's iOS deployment target from 16.2 -> 17.0
//    in the compiled config plugin. Button(intent:) and interactive widgets
//    require the extension to target iOS 17+ at the SDK level.
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'live-activity-overrides');
const PKG_ROOT = path.join(__dirname, '..', 'node_modules', 'expo-live-activity');
const PKG_DIR = path.join(PKG_ROOT, 'ios-files');
const PLUGIN_JS = path.join(PKG_ROOT, 'plugin', 'build', 'index.js');

if (!fs.existsSync(PKG_DIR)) {
  console.log('[adhd-do] expo-live-activity not installed yet — skipping overrides.');
  process.exit(0);
}

const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.swift'));
for (const file of files) {
  fs.copyFileSync(path.join(SRC_DIR, file), path.join(PKG_DIR, file));
  console.log(`[adhd-do] overrode ${file}`);
}

if (fs.existsSync(PLUGIN_JS)) {
  const before = fs.readFileSync(PLUGIN_JS, 'utf8');
  const after = before.replace(
    /const deploymentTarget = '16\.2';/,
    "const deploymentTarget = '17.0';",
  );
  if (before !== after) {
    fs.writeFileSync(PLUGIN_JS, after);
    console.log('[adhd-do] bumped widget extension deployment target to 17.0');
  }
}
