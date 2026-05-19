import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from './types';

const KEY = 'adhddo:note:v2';
const LEGACY_KEY = 'meteor:notes:v1';

type Stored = {
  tasks: Task[];
  liveActivityId: string | null;
  updatedAt: number;
};

const EMPTY: Stored = { tasks: [], liveActivityId: null, updatedAt: 0 };

export async function loadNote(): Promise<Stored> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed && Array.isArray(parsed.tasks)) return parsed;
    } catch {}
  }
  // Migrate from legacy multi-note shape: flatten the first note's tasks.
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const arr = JSON.parse(legacy);
      if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]?.tasks)) {
        return {
          tasks: arr[0].tasks as Task[],
          liveActivityId: arr[0].liveActivityId ?? null,
          updatedAt: arr[0].updatedAt ?? Date.now(),
        };
      }
    } catch {}
  }
  return EMPTY;
}

export async function saveNote(note: Stored): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(note));
}
