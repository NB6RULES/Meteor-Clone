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
import type { Note } from './src/types';

const MAX_NOTES = 5;

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [draft, setDraft] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
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
    setDraft(note.text);
    setModalOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setDraft('');
  };

  const saveDraft = async () => {
    const text = draft.trim();
    if (!text) {
      closeModal();
      return;
    }
    if (editing) {
      let nextId: string | null = editing.liveActivityId;
      if (nextId) {
        updateNoteActivity(nextId, text);
      } else {
        nextId = startNoteActivity(text);
        recordAvailability(nextId);
      }
      const updated: Note = {
        ...editing,
        text,
        updatedAt: Date.now(),
        liveActivityId: nextId,
      };
      await persist(notes.map((n) => (n.id === editing.id ? updated : n)));
    } else {
      const id = startNoteActivity(text);
      recordAvailability(id);
      const now = Date.now();
      const newNote: Note = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt: now,
        updatedAt: now,
        liveActivityId: id,
      };
      await persist([newNote, ...notes]);
    }
    closeModal();
  };

  const confirmDelete = (note: Note) => {
    Alert.alert('Delete note?', note.text.slice(0, 80), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (note.liveActivityId) {
            endNoteActivity(note.liveActivityId, note.text);
          }
          await persist(notes.filter((n) => n.id !== note.id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meteor</Text>
        <Text style={styles.headerSubtitle}>
          {notes.length}/{MAX_NOTES} active notes
        </Text>
      </View>

      {liveActivitiesAvailable === false && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Live Activities unavailable. Check Settings → Meteor → Live
            Activities, or confirm iOS 16.2+.
          </Text>
        </View>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={notes}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notes yet.</Text>
            <Text style={styles.emptyHint}>Tap + to add one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => openEdit(item)}
            onLongPress={() => confirmDelete(item)}
          >
            <Text style={styles.cardText} numberOfLines={4}>
              {item.text}
            </Text>
            <Text style={styles.cardMeta}>
              {new Date(item.updatedAt).toLocaleString()}
              {item.liveActivityId ? '  •  pinned' : '  •  not pinned'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

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
            <Text style={styles.modalTitle}>
              {editing ? 'Edit note' : 'New note'}
            </Text>
            <TouchableOpacity onPress={saveDraft}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type your note..."
            placeholderTextColor="#666"
            value={draft}
            onChangeText={setDraft}
            multiline
            autoCorrect
            autoCapitalize="sentences"
          />
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '700' },
  headerSubtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  warningBanner: {
    backgroundColor: '#3a1f00',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  warningText: { color: '#ffb300', fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16 },
  emptyHint: { color: '#444', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  cardMeta: { color: '#666', fontSize: 11, marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: { fontSize: 32, color: '#000', fontWeight: '300', lineHeight: 36 },
  modal: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalCancel: { color: '#888', fontSize: 16 },
  modalSave: { color: '#0a84ff', fontSize: 16, fontWeight: '600' },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    padding: 20,
    textAlignVertical: 'top',
    lineHeight: 26,
  },
});
