import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note } from './types';

const KEY = 'meteor:notes:v1';

export async function loadNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(notes));
}
