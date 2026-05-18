import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loadNotes, saveNotes } from './src/storage';
import {
  endNoteActivity,
  startNoteActivity,
  updateNoteActivity,
} from './src/liveActivity';
import { theme } from './src/theme';
import type { Note, Task } from './src/types';

const MAX_NOTES = 5;

type TabId = 'capture' | 'today' | 'focus' | 'settings';
const TABS: { id: TabId; label: string }[] = [
  { id: 'capture', label: 'Capture' },
  { id: 'today', label: 'Today' },
  { id: 'focus', label: 'Focus' },
  { id: 'settings', label: 'Settings' },
];

function parseTaskInput(text: string, existing: Task[] = []): Task[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map((line, i) => {
    const prior = existing[i];
    return {
      text: line,
      done: prior && prior.text === line ? prior.done : false,
    };
  });
}

function tasksToInput(tasks: Task[]): string {
  return tasks.map((t) => t.text).join('\n');
}

function tasksToActivityText(tasks: Task[]): string {
  if (tasks.length === 0) return '(empty)';
  return tasks.map((t) => `${t.done ? '✓' : '○'} ${t.text}`).join('\n');
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [draft, setDraft] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('capture');
  const [liveActivitiesAvailable, setLiveActivitiesAvailable] = useState<
    boolean | null
  >(null);
  const inputRef = useRef<TextInput>(null);

  const persist = useCallback(async (next: Note[]) => {
    setNotes(next);
    await saveNotes(next);
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = await loadNotes();
      setNotes(loaded);
    })();
  }, []);

  const recordAvailability = (gotId: string | null) => {
    if (liveActivitiesAvailable !== null) return;
    setLiveActivitiesAvailable(gotId !== null);
  };

  const openCreate = () => {
    if (notes.length >= MAX_NOTES) {
      Alert.alert(
        'Limit reached',
        `Max ${MAX_NOTES} active notes. Delete one first.`,
      );
      return;
    }
    setEditing(null);
    setDraft('');
    setModalOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setDraft(tasksToInput(note.tasks));
    setModalOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setDraft('');
  };

  const saveDraft = async () => {
    const tasks = parseTaskInput(draft, editing?.tasks);
    if (tasks.length === 0) {
      closeModal();
      return;
    }
    const activityText = tasksToActivityText(tasks);
    if (editing) {
      let nextId: string | null = editing.liveActivityId;
      if (nextId) {
        updateNoteActivity(nextId, activityText);
      } else {
        nextId = startNoteActivity(activityText);
        recordAvailability(nextId);
      }
      const updated: Note = {
        ...editing,
        tasks,
        updatedAt: Date.now(),
        liveActivityId: nextId,
      };
      await persist(notes.map((n) => (n.id === editing.id ? updated : n)));
    } else {
      const id = startNoteActivity(activityText);
      recordAvailability(id);
      const now = Date.now();
      const newNote: Note = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        tasks,
        createdAt: now,
        updatedAt: now,
        liveActivityId: id,
      };
      await persist([newNote, ...notes]);
    }
    closeModal();
  };

  const confirmDelete = (note: Note) => {
    const preview = note.tasks
      .slice(0, 2)
      .map((t) => t.text)
      .join(', ');
    Alert.alert('Delete note?', preview.slice(0, 80), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (note.liveActivityId) {
            endNoteActivity(
              note.liveActivityId,
              tasksToActivityText(note.tasks),
            );
          }
          await persist(notes.filter((n) => n.id !== note.id));
        },
      },
    ]);
  };

  const sendActive = draft.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iButton}
          accessibilityLabel="Info"
          accessibilityRole="button"
        >
          <Text style={styles.iButtonText}>i</Text>
        </TouchableOpacity>
      </View>

      {liveActivitiesAvailable === false && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Live Activities unavailable. Check Settings → ADHD-DO → Live
            Activities, or confirm iOS 16.2+.
          </Text>
        </View>
      )}

      {activeTab === 'capture' ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={notes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing parked yet.</Text>
              <Text style={styles.emptyHint}>Tap + to dump a thought.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openEdit(item)}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardHeader}>Park it :</Text>
              <View style={styles.taskList}>
                {item.tasks.map((task, i) => (
                  <Text
                    key={i}
                    style={[styles.taskText, task.done && styles.taskTextDone]}
                  >
                    {task.text}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>
            {activeTab === 'today'
              ? 'Today'
              : activeTab === 'focus'
                ? 'Focus'
                : 'Settings'}
          </Text>
          <Text style={styles.placeholderText}>
            Coming soon. Use Capture for now.
          </Text>
        </View>
      )}

      {activeTab === 'capture' && (
        <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modal}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                sendActive
                  ? styles.sendButtonActive
                  : styles.sendButtonInactive,
              ]}
              onPress={saveDraft}
              disabled={!sendActive}
              accessibilityLabel="Save note"
            >
              <Text
                style={[
                  styles.sendButtonIcon,
                  sendActive && styles.sendButtonIconActive,
                ]}
              >
                ↑
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Park it :</Text>
            <TextInput
              ref={inputRef}
              style={styles.modalInput}
              placeholder="One task per line..."
              placeholderTextColor={theme.textFaint}
              value={draft}
              onChangeText={setDraft}
              multiline
              autoCorrect
              autoCapitalize="sentences"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_MARGIN = 16;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
  },
  iButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  warningBanner: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.primaryDeep,
    marginBottom: 8,
  },
  warningText: { color: theme.primary, fontSize: 13 },
  list: { flex: 1 },
  listContent: {
    padding: 16,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_MARGIN * 2 + 80,
  },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { color: theme.textDim, fontSize: 16 },
  emptyHint: { color: theme.textFaint, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: theme.surface,
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.surface2,
  },
  cardHeader: {
    color: theme.primary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  taskList: { gap: 6 },
  taskText: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  taskTextDone: {
    color: theme.textDim,
    textDecorationLine: 'line-through',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: TAB_BAR_HEIGHT,
  },
  placeholderTitle: { color: theme.text, fontSize: 24, fontWeight: '800' },
  placeholderText: { color: theme.textDim, fontSize: 14, marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + TAB_BAR_MARGIN * 2 + 12,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  fabIcon: {
    color: theme.text,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
  tabBar: {
    position: 'absolute',
    bottom: TAB_BAR_MARGIN,
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: TAB_BAR_HEIGHT,
    backgroundColor: theme.surface,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.surface2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  modal: { flex: 1, backgroundColor: theme.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalCancel: { color: theme.textDim, fontSize: 16, fontWeight: '500' },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: { backgroundColor: theme.yellow },
  sendButtonInactive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  sendButtonIcon: { color: theme.textFaint, fontSize: 20, fontWeight: '700' },
  sendButtonIconActive: { color: '#000' },
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  modalTitle: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  modalInput: {
    flex: 1,
    color: theme.text,
    fontSize: 19,
    fontWeight: '700',
    textAlignVertical: 'top',
    lineHeight: 26,
  },
});
