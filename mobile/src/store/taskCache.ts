import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
}

export interface CachedTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  project?: ProjectSummary;
  assignee?: UserSummary;
}

const TASKS_CACHE_KEY = '@teamsync_tasks_cache';
const TASK_DETAILS_CACHE_PREFIX = '@teamsync_task_detail_cache:';

export const getCachedTasks = async (): Promise<CachedTask[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(TASKS_CACHE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to read tasks cache:', e);
    return [];
  }
};

export const setCachedTasks = async (tasks: CachedTask[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(tasks);
    await AsyncStorage.setItem(TASKS_CACHE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to write tasks cache:', e);
  }
};

export const getCachedTaskDetails = async (taskId: string): Promise<any | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(`${TASK_DETAILS_CACHE_PREFIX}${taskId}`);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error(`Failed to read task details cache for ${taskId}:`, e);
    return null;
  }
};

export const setCachedTaskDetails = async (taskId: string, details: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(details);
    await AsyncStorage.setItem(`${TASK_DETAILS_CACHE_PREFIX}${taskId}`, jsonValue);
  } catch (e) {
    console.error(`Failed to write task details cache for ${taskId}:`, e);
  }
};

export const clearCachedTasks = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(
      (key) => key === TASKS_CACHE_KEY || key.startsWith(TASK_DETAILS_CACHE_PREFIX)
    );
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (e) {
    console.error('Failed to clear tasks cache:', e);
  }
};
