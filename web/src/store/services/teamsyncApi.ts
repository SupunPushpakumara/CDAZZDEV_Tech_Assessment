import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query/react';
import type { AxiosRequestConfig } from 'axios';
import apiClient from '../../lib/axios';
import { UserProfile } from '../slices/authSlice';

const axiosBaseQuery =
  ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }): BaseQueryFn<
    | string
    | {
        url: string;
        method?: AxiosRequestConfig['method'];
        body?: AxiosRequestConfig['data'];
        params?: AxiosRequestConfig['params'];
        headers?: AxiosRequestConfig['headers'];
      },
    unknown,
    unknown
  > =>
  async (args) => {
    try {
      const config = typeof args === 'string' ? { url: args } : args;
      const result = await apiClient({
        url: baseUrl + config.url,
        method: config.method || 'GET',
        data: config.body,
        params: config.params,
        headers: config.headers,
      });
      return { data: result.data };
    } catch (err: any) {
      return {
        error: {
          status: err.status || 500,
          data: err.data || { message: err.message },
        },
      };
    }
  };

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'MANAGER' | 'MEMBER';
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  members: ProjectMember[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface TaskDetail extends Task {
  comments: Comment[];
}

export interface TasksResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetTasksParams {
  projectId: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export const teamsyncApi = createApi({
  reducerPath: 'teamsyncApi',
  baseQuery: axiosBaseQuery({ baseUrl: '/proxy' }),
  tagTypes: ['Projects', 'Tasks', 'TaskDetail'],
  endpoints: (builder) => ({
    // Projects Endpoints
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Projects'],
    }),
    createProject: builder.mutation<Project, { name: string; description?: string; memberIds?: string[] }>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Projects'],
    }),
    getProjectById: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Projects' as const, id }],
    }),
    getUsers: builder.query<UserProfile[], void>({
      query: () => '/auth/users',
    }),

    // Tasks Endpoints
    getTasks: builder.query<TasksResponse, GetTasksParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            queryParams.append(key, val.toString());
          }
        });
        return `/projects/${projectId}/tasks?${queryParams.toString()}`;
      },
      providesTags: ['Tasks'],
    }),
    createTask: builder.mutation<Task, { projectId: string; title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/tasks`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks'],
    }),
    getTaskById: builder.query<TaskDetail, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (result, error, id) => [{ type: 'TaskDetail' as const, id }],
    }),
    updateTask: builder.mutation<Task, { id: string; title?: string; description?: string; status?: string; priority?: string; assigneeId?: string | null; dueDate?: string | null }>({
      query: ({ id, ...body }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => ['Tasks', { type: 'TaskDetail', id }],
    }),

    // Comments Endpoints
    addComment: builder.mutation<Comment, { taskId: string; body: string }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/comments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'TaskDetail', id: taskId }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetProjectByIdQuery,
  useGetUsersQuery,
  useGetTasksQuery,
  useCreateTaskMutation,
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useAddCommentMutation,
} = teamsyncApi;
