import {
  startActivity,
  stopActivity,
  updateActivity,
  type LiveActivityConfig,
  type LiveActivityState,
} from 'expo-live-activity';

const CONFIG: LiveActivityConfig = {
  backgroundColor: '#000000',
  titleColor: '#ffffff',
  subtitleColor: '#888888',
  deepLinkUrl: 'meteorapp://open',
};

function stateFor(text: string): LiveActivityState {
  const trimmed = text.trim();
  return {
    title: (trimmed || '(empty note)').slice(0, 100),
    subtitle: 'Tap to edit',
  };
}

export function startNoteActivity(text: string): string | null {
  try {
    const id = startActivity(stateFor(text), CONFIG);
    return typeof id === 'string' ? id : null;
  } catch (err) {
    console.warn('startActivity failed', err);
    return null;
  }
}

export function updateNoteActivity(id: string, text: string): void {
  try {
    updateActivity(id, stateFor(text));
  } catch (err) {
    console.warn('updateActivity failed', err);
  }
}

export function endNoteActivity(id: string, text: string): void {
  try {
    stopActivity(id, stateFor(text));
  } catch (err) {
    console.warn('stopActivity failed', err);
  }
}
