import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loadNote, saveNote } from './src/storage';
import {
  endNoteActivity,
  startNoteActivity,
  updateNoteActivity,
} from './src/liveActivity';
import { theme } from './src/theme';
import type { Task } from './src/types';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [liveActivitiesAvailable, setLiveActivitiesAvailable] = useState<
    boolean | null
  >(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Load on mount.
  useEffect(() => {
    (async () => {
      const note = await loadNote();
      setTasks(note.tasks);
      setActivityId(note.liveActivityId);
      setHydrated(true);
    })();
  }, []);

  // Persist + live-activity sync whenever tasks change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    const nonEmpty = tasks.filter((t) => t.text.trim().length > 0);

    let nextActivityId = activityId;
    if (nonEmpty.length === 0) {
      if (activityId) {
        endNoteActivity(activityId, []);
        nextActivityId = null;
        setActivityId(null);
      }
    } else if (activityId) {
      updateNoteActivity(activityId, nonEmpty);
    } else {
      const id = startNoteActivity(nonEmpty);
      if (liveActivitiesAvailable === null) {
        setLiveActivitiesAvailable(id !== null);
      }
      nextActivityId = id;
      setActivityId(id);
    }

    saveNote({
      tasks,
      liveActivityId: nextActivityId,
      updatedAt: Date.now(),
    });
  }, [tasks, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTaskText = useCallback((i: number, text: string) => {
    setTasks((prev) => prev.map((t, j) => (j === i ? { ...t, text } : t)));
  }, []);

  const toggleTask = useCallback((i: number) => {
    setTasks((prev) => prev.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));
  }, []);

  const addTaskAfter = useCallback((i: number) => {
    setTasks((prev) => {
      const next = [...prev];
      next.splice(i + 1, 0, { text: '', done: false });
      return next;
    });
    setFocusIndex(i + 1);
  }, []);

  const removeTask = useCallback((i: number) => {
    setTasks((prev) => prev.filter((_, j) => j !== i));
    setFocusIndex(Math.max(0, i - 1));
  }, []);

  const appendTask = useCallback(() => {
    setTasks((prev) => {
      const next = [...prev, { text: '', done: false }];
      setFocusIndex(next.length - 1);
      return next;
    });
  }, []);

  // Apply focusIndex after the row has rendered.
  useEffect(() => {
    if (focusIndex === null) return;
    const ref = inputRefs.current[focusIndex];
    if (ref) {
      ref.focus();
      setFocusIndex(null);
    }
  }, [focusIndex, tasks]);

  const handleKey = (
    i: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && tasks[i]?.text.length === 0 && tasks.length > 1) {
      removeTask(i);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iButton} accessibilityLabel="Info">
          <Text style={styles.iButtonText}>i</Text>
        </TouchableOpacity>
      </View>

      {liveActivitiesAvailable === false && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Live Activities unavailable. Check Settings → ADHD-DO → Live
            Activities, or confirm iOS 17+.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.composerCard}>
            <View style={styles.kebab}>
              <Text style={styles.kebabDots}>•••</Text>
            </View>
            <Text style={styles.cardTitle}>
              Note it<Text style={styles.cardTitleColon}> :</Text>
            </Text>

            {tasks.length === 0 ? (
              <TouchableOpacity onPress={appendTask} activeOpacity={0.7}>
                <Text style={styles.placeholder}>Brain dump goes here…</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.taskList}>
                {tasks.map((task, i) => (
                  <View key={i} style={styles.taskRow}>
                    <TouchableOpacity
                      onPress={() => toggleTask(i)}
                      style={[styles.checkbox, task.done && styles.checkboxDone]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: task.done }}
                    >
                      {task.done && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <TextInput
                      ref={(r) => {
                        inputRefs.current[i] = r;
                      }}
                      style={[
                        styles.taskInput,
                        task.done && styles.taskInputDone,
                      ]}
                      value={task.text}
                      onChangeText={(t) => updateTaskText(i, t)}
                      onSubmitEditing={() => addTaskAfter(i)}
                      onKeyPress={(e) => handleKey(i, e)}
                      blurOnSubmit={false}
                      returnKeyType="next"
                      placeholder=""
                      placeholderTextColor={theme.textFaint}
                      autoCorrect
                      autoCapitalize="sentences"
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, i === 0 && styles.dotActive]}
              />
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={appendTask}
          activeOpacity={0.85}
          accessibilityLabel="Add task"
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
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
    backgroundColor: theme.surface3,
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
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 120,
  },
  composerCard: {
    backgroundColor: theme.surface2,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    minHeight: 220,
    borderWidth: 1,
    borderColor: theme.border,
  },
  kebab: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kebabDots: {
    color: theme.textDim,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: -6,
  },
  cardTitle: {
    color: theme.primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 18,
  },
  cardTitleColon: { color: theme.textFaint },
  placeholder: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.textFaint,
    letterSpacing: -0.3,
  },
  taskList: { gap: 10 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  taskInput: {
    flex: 1,
    color: theme.text,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingVertical: 0,
  },
  taskInputDone: {
    color: theme.textDim,
    textDecorationLine: 'line-through',
  },
  dotsRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.7)' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  fabIcon: {
    color: theme.text,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
});
