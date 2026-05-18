import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note, Task } from './types';

const KEY = 'meteor:notes:v1';

type RawNote = {
  id: string;
  text?: string;
  tasks?: Task[];
  createdAt: number;
  updatedAt: number;
  liveActivityId: string | null;
};

function migrate(raw: RawNote): Note {
  if (Array.isArray(raw.tasks)) {
    return {
      id: raw.id,
      tasks: raw.tasks,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      liveActivityId: raw.liveActivityId,
    };
  }
  return {
    id: raw.id,
    tasks: [{ text: raw.text ?? '', done: false }],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    liveActivityId: raw.liveActivityId,
  };
}

export async function loadNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RawNote[]).map(migrate);
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(notes));
}
