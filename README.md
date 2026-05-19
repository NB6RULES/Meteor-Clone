# ADHD-DO

A single-list brain-dump app for iOS. One persistent checklist that mirrors itself onto your lock screen — tap a checkbox on the lock screen to check it off without unlocking your phone.

Built with Expo (React Native) + a customized iOS Live Activity widget extension (SwiftUI + ActivityKit + AppIntents).

## Why

Most to-do apps want to be your second brain. This one wants to be a Post-it stuck to the inside of your eyelid. You open the app, dump what's in your head, the list shows up on your lock screen, and you check things off as you remember to do them — no unlock, no navigation.

## Features

- **One persistent list.** No notebooks, no folders, no tags.
- **Inline checkbox composer.** Enter adds a new row. Backspace on an empty row removes it. The `+` button appends a row.
- **Tappable lock-screen checkboxes.** The Live Activity card on the lock screen has real buttons — tapping a checkbox toggles the task in place. Powered by `Button(intent:)` + an `AppIntent` running in the widget extension.
- **Kebab menu** with "Delete completed" and "Delete all".

## Tech

- Expo SDK 54, React Native 0.81, React 19
- `expo-live-activity` (widget extension source files overridden via a postinstall script)
- Custom SwiftUI lock-screen view with `Button(intent: ToggleTaskIntent(...))` rows
- `AppIntent` updates the active `Activity<LiveActivityAttributes>` from inside the widget extension process
- Codemagic for unsigned iOS builds, sideloaded via AltStore / SideStore

## iOS requirements

- iOS **17.0+** (interactive widgets / `Button(intent:)` are 17-only)
- Live Activities enabled in Settings → ADHD-DO

## Project layout

```
App.tsx                          Main RN screen — single list + composer
src/
  storage.ts                     AsyncStorage persistence (adhddo:note:v2)
  liveActivity.ts                Bridges JS task list -> Live Activity
  theme.ts                       Color tokens
  types.ts                       Task type
live-activity-overrides/         Custom Swift files copied into the widget
  LiveActivityView.swift           Coral card with checkbox rows
  LiveActivityWidget.swift         Widget config wiring activityID into view
  ToggleTaskIntent.swift           AppIntent that toggles a task + updates the activity
scripts/
  install-live-activity-overrides.js  Postinstall: overwrites expo-live-activity sources
codemagic.yaml                   Unsigned iOS build pipeline
```

## How the lock-screen toggle works

1. JS calls `startActivity({ title: 'ADHD-DO', subtitle: JSON.stringify(tasks) }, { backgroundColor: '#ff5a47', ... })`.
2. The widget extension renders `LiveActivityView`, which decodes `subtitle` as `[{text, done}]` and shows one `Button(intent: ToggleTaskIntent(activityId:, taskIndex:))` per row.
3. Tapping a checkbox runs `ToggleTaskIntent.perform()` in the extension. It looks up the matching `Activity<LiveActivityAttributes>`, mutates the task's `done` flag, re-serializes, and calls `activity.update(...)`.
4. ActivityKit redraws the lock-screen card. No unlock, no app launch.

### Known limitation

Toggles made on the lock screen update the Live Activity in real time, but the app's `AsyncStorage` doesn't see them until the user edits the list in-app (which re-syncs in the other direction). True two-way sync would need an App Group entitlement, which is stripped from unsigned Codemagic builds.

## Build (unsigned, for sideloading)

```bash
# locally
npm install
npx expo prebuild --platform ios --clean

# or via Codemagic — push to main and let codemagic.yaml run
```

Output is `meteor-unsigned.ipa`, ready for AltStore / SideStore.

## Developer

**Nadec Biju**
- GitHub: <https://github.com/NB6RULES>
- Fab Academy: <https://fabacademy.org/2026/labs/kochi/students/nadec-biju/>
