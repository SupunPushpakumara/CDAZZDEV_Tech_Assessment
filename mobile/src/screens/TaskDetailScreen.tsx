import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../store/authContext';
import { apiFetch } from '../api/client';
import { useNetInfo } from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCachedTaskDetails, setCachedTaskDetails, getCachedTasks } from '../store/taskCache';
import { OfflineBanner } from '../components/OfflineBanner';

interface TaskDetailScreenProps {
  route: any;
  navigation: any;
}

interface Author {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  isOptimistic?: boolean;
}

interface TaskDetails {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  assignee?: Author;
  comments: Comment[];
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { user } = useAuth();
  const netInfo = useNetInfo();
  
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchTaskDetails = async () => {
    // 1. If offline state is active, try to fetch from details cache or fallback to list cache
    if (netInfo.isConnected === false) {
      const cachedDetails = await getCachedTaskDetails(taskId);
      if (cachedDetails) {
        setTask(cachedDetails);
        setLoading(false);
        return;
      }
      
      const cachedList = await getCachedTasks();
      const listTask = cachedList.find((t) => t.id === taskId);
      if (listTask) {
        setTask({
          id: listTask.id,
          title: listTask.title,
          description: listTask.description,
          status: listTask.status,
          priority: listTask.priority,
          dueDate: listTask.dueDate,
          assignee: listTask.assignee,
          comments: [],
        });
        setLoading(false);
        return;
      }
      Alert.alert('Offline', 'Task details not available offline.');
      navigation.goBack();
      return;
    }

    try {
      const response = await apiFetch(`/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data);
        await setCachedTaskDetails(taskId, data);
      } else {
        // Fallback to cache on error
        const cachedDetails = await getCachedTaskDetails(taskId);
        if (cachedDetails) {
          setTask(cachedDetails);
        } else {
          Alert.alert('Error', 'Failed to load task details.');
          navigation.goBack();
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback to cache on exception
      const cachedDetails = await getCachedTaskDetails(taskId);
      if (cachedDetails) {
        setTask(cachedDetails);
      } else {
        Alert.alert('Error', 'An error occurred while fetching task details.');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (netInfo.isConnected !== null) {
      fetchTaskDetails();
    }
  }, [taskId, netInfo.isConnected]);

  const handleStatusChange = async (newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    if (!task) return;
    if (task.status === newStatus) return;

    if (netInfo.isConnected === false) {
      Alert.alert('Offline', 'Cannot change task status while offline.');
      return;
    }

    const originalStatus = task.status;
    
    // Optimistically update the UI status
    setTask({ ...task, status: newStatus });
    setStatusUpdating(true);

    try {
      const response = await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedTask = await response.json();
      // Sync local task with complete updated payload (preserving comments)
      setTask((prev) => prev ? { ...prev, status: updatedTask.status } : null);
    } catch (err) {
      // Rollback on failure
      setTask((prev) => prev ? { ...prev, status: originalStatus } : null);
      Alert.alert('Error', 'Could not update task status. Please try again.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !task || !user) return;

    const bodyText = commentText.trim();
    setCommentText(''); // Clear input

    // 1. Generate temp comment UUID
    const tempId = `temp-${Date.now()}`;
    
    // 2. Create local optimistic comment object
    const optimisticComment: Comment = {
      id: tempId,
      body: bodyText,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      isOptimistic: true,
    };

    // 3. Immediately append comment to local screen state
    setTask((prev) =>
      prev ? { ...prev, comments: [...prev.comments, optimisticComment] } : null
    );

    // Auto-scroll to bottom of list
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // 4. Fire the API POST Request
    try {
      const response = await apiFetch(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: bodyText }),
      });

      if (!response.ok) {
        throw new Error('Comment failed');
      }

      const serverComment = await response.json();

      // 5. Replace temp comment with server response on success
      setTask((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.map((c) => (c.id === tempId ? serverComment : c)),
        };
      });
    } catch (err) {
      // 6. Roll back local state & show warning on failure
      setTask((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.filter((c) => c.id !== tempId),
        };
      });
      // Restore input text so they don't lose it
      setCommentText(bodyText);
      Alert.alert('Error', 'Could not publish comment. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#EF4444';
      case 'MEDIUM':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  if (!task) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <OfflineBanner />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Info */}
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(task.priority)}20` }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                  {task.priority} Priority
                </Text>
              </View>
              <Text style={styles.dueDate}>Due: {formatDate(task.dueDate)}</Text>
            </View>

            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.description}>{task.description || 'No description provided.'}</Text>
            
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assignee:</Text>
              <Text style={styles.metaValue}>{task.assignee?.name || 'Unassigned'}</Text>
            </View>
          </View>

          {/* Status Switcher Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Task Status</Text>
              {statusUpdating && <ActivityIndicator size="small" color="#38BDF8" />}
            </View>
            <View style={styles.statusChipsContainer}>
              {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => {
                const isActive = task.status === status;
                let activeColor = '#64748B'; // Todo Default
                if (status === 'IN_PROGRESS') activeColor = '#3B82F6';
                if (status === 'DONE') activeColor = '#10B981';

                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      isActive && { backgroundColor: activeColor, borderColor: activeColor },
                      netInfo.isConnected === false && styles.statusChipDisabled,
                    ]}
                    onPress={() => handleStatusChange(status)}
                    disabled={statusUpdating || netInfo.isConnected === false}
                  >
                    <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                      {status === 'TODO' ? 'To Do' : status === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Discussion ({task.comments.length})</Text>

            {task.comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet. Start the conversation!</Text>
              </View>
            ) : (
              task.comments.map((comment) => {
                const isMyComment = comment.author.id === user?.id;
                return (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentBubble,
                      isMyComment ? styles.myCommentBubble : styles.otherCommentBubble,
                      comment.isOptimistic && { opacity: 0.6 },
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                      {comment.isOptimistic ? (
                        <Text style={styles.commentTime}>Sending...</Text>
                      ) : (
                        <Text style={styles.commentTime}>
                          {new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.commentBody}>{comment.body}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={netInfo.isConnected === false ? "Cannot comment offline" : "Add to the discussion..."}
            placeholderTextColor="#64748B"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            editable={netInfo.isConnected !== false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || netInfo.isConnected === false) && styles.sendButtonDisabled,
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || netInfo.isConnected === false}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 16,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dueDate: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  description: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    alignItems: 'center',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 14,
    marginRight: 6,
  },
  metaValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#0F172A',
  },
  statusChipText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  commentsSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCommentsText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  commentBubble: {
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    maxWidth: '85%',
  },
  myCommentBubble: {
    backgroundColor: '#334155',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  otherCommentBubble: {
    backgroundColor: '#0F172A',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  commentTime: {
    color: '#64748B',
    fontSize: 10,
  },
  commentBody: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  sendButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  statusChipDisabled: {
    opacity: 0.5,
    borderColor: '#1E293B',
  },
});
