import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../store/authContext';
import { apiFetch } from '../api/client';
import { getCachedTasks, setCachedTasks, CachedTask } from '../store/taskCache';
import { OfflineBanner } from '../components/OfflineBanner';
import { useNetInfo } from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type StatusFilter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE';

interface TaskListScreenProps {
  navigation: any;
}

export const TaskListScreen: React.FC<TaskListScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const netInfo = useNetInfo();

  const [tasks, setTasks] = useState<CachedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    // Explicitly verify connection. NetInfo's isConnected must be boolean true.
    if (netInfo.isConnected === false) {
      // Offline mode: load from cache
      const cached = await getCachedTasks();
      setTasks(cached);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Online mode: Fetch all projects, then tasks for each project
      const projectsResponse = await apiFetch('/projects');
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projects = await projectsResponse.json();
      let combinedTasks: CachedTask[] = [];

      // Fetch tasks for each project in parallel
      const tasksPromises = projects.map(async (project: any) => {
        try {
          // Fetch tasks assigned to current user in this project
          const response = await apiFetch(`/projects/${project.id}/tasks?assigneeId=${user?.id}`);
          if (response.ok) {
            const result = await response.json();
            // Map project metadata to tasks
            return result.data.map((task: any) => ({
              ...task,
              project: {
                id: project.id,
                name: project.name,
                description: project.description,
              },
            }));
          }
        } catch (err) {
          console.error(`Error fetching tasks for project ${project.id}:`, err);
        }
        return [];
      });

      const results = await Promise.all(tasksPromises);
      combinedTasks = results.flat();

      // Sort tasks by dueDate (earliest first, or created date if no due date)
      combinedTasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setTasks(combinedTasks);
      await setCachedTasks(combinedTasks);
    } catch (error) {
      console.error('Error fetching online tasks:', error);
      // Fallback to cache on api failure
      const cached = await getCachedTasks();
      setTasks(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, netInfo.isConnected]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = async () => {
        // Load from cache first for immediate feedback (e.g. returning from details with updated status)
        const cached = await getCachedTasks();
        if (active) {
          setTasks(cached);
        }

        // Silent background fetch if online
        if (netInfo.isConnected !== false) {
          if (active) {
            await fetchTasks(true);
          }
        }
      };

      if (netInfo.isConnected !== null) {
        refresh();
      }

      return () => {
        active = false;
      };
    }, [netInfo.isConnected, fetchTasks])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks(true);
  }, [fetchTasks]);

  // Filter tasks based on statusFilter state
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'ALL') return true;
    return task.status === statusFilter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#EF4444'; // Red
      case 'MEDIUM':
        return '#F59E0B'; // Amber
      default:
        return '#10B981'; // Emerald/Green
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'To Do';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'DONE':
        return 'Done';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return '#10B981'; // Green
      case 'IN_PROGRESS':
        return '#3B82F6'; // Blue
      default:
        return '#64748B'; // Slate
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderTaskCard = ({ item }: { item: CachedTask }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.projectBadge} numberOfLines={1}>
          📁 {item.project?.name || 'Project'}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>

      <Text style={styles.taskTitle}>{item.title}</Text>
      {item.description ? (
        <Text style={styles.taskDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.dueDateContainer}>
          <Text style={styles.dueDateLabel}>Due:</Text>
          <Text style={styles.dueDateText}>{formatDate(item.dueDate)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <OfflineBanner />
      
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as StatusFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                statusFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter === 'ALL' ? 'All Tasks' : getStatusLabel(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Task List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38BDF8"
              colors={['#38BDF8']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>🎉 No tasks found</Text>
              <Text style={styles.emptySubtext}>
                {statusFilter === 'ALL'
                  ? "You don't have any tasks assigned."
                  : `No tasks found matching "${getStatusLabel(statusFilter)}".`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  welcomeText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EF444420',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  logoutText: {
    color: '#FCA5A5',
    fontWeight: '600',
    fontSize: 12,
  },
  filtersWrapper: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
  },
  filtersScroll: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#38BDF8',
  },
  filterTabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTabTextActive: {
    color: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  taskCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectBadge: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '70%',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  taskDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginTop: 4,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateLabel: {
    color: '#64748B',
    fontSize: 12,
    marginRight: 4,
  },
  dueDateText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
