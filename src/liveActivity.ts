import {
  startActivity,
  stopActivity,
  updateActivity,
  type LiveActivityConfig,
  type LiveActivityState,
} from 'expo-live-activity';
import type { Task } from './types';

const CONFIG: LiveActivityConfig = {
  backgroundColor: '#ff5a47',
  titleColor: '#ffffff',
  subtitleColor: '#ffffff',
  deepLinkUrl: 'meteorapp://open',
  padding: 0,
};

function stateFor(tasks: Task[]): LiveActivityState {
  const payload = tasks.map((t) => ({ text: t.text, done: t.done }));
  return {
    title: 'ADHD-DO',
    subtitle: JSON.stringify(payload),
  };
}

export function startNoteActivity(tasks: Task[]): string | null {
  try {
    const id = startActivity(stateFor(tasks), CONFIG);
    return typeof id === 'string' ? id : null;
  } catch (err) {
    console.warn('startActivity failed', err);
    return null;
  }
}

export function updateNoteActivity(id: string, tasks: Task[]): void {
  try {
    updateActivity(id, stateFor(tasks));
  } catch (err) {
    console.warn('updateActivity failed', err);
  }
}

export function endNoteActivity(id: string, tasks: Task[]): void {
  try {
    stopActivity(id, stateFor(tasks));
  } catch (err) {
    console.warn('stopActivity failed', err);
  }
}
