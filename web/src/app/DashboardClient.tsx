'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentUser, selectIsAuthLoading, setCredentials, clearCredentials } from '../store/slices/authSlice';
import apiClient from '../lib/axios';
import { Sidebar } from '../components/layout/sidebar';
import { Header } from '../components/layout/header';
import { useGetProjectByIdQuery, useGetTasksQuery } from '../store/services/teamsyncApi';
import { TaskDetailDrawer } from '../components/dashboard/task-detail-drawer';
import { FilterBar } from '../components/dashboard/filter-bar';
import { KanbanBoard } from '../components/dashboard/kanban-board';
import { Pagination } from '../components/dashboard/pagination';
import { CreateTaskModal } from '../components/dashboard/create-task-modal';
import { Loader2 } from 'lucide-react';
import styles from './page.module.css';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  // Selectors
  const user = useAppSelector(selectCurrentUser);

  // Active resource parameters from URL
  const projectId = searchParams.get('projectId');
  const activeTaskId = searchParams.get('taskId');

  // Filter States
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // dueDate sorting order
  const [page, setPage] = useState(1);

  // Task creation modal visibility
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Fetch Project Details
  const { data: project } = useGetProjectByIdQuery(projectId || '', {
    skip: !projectId,
  });

  // Fetch Tasks with current filters
  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useGetTasksQuery(
    {
      projectId: projectId || '',
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      assigneeId: filterAssignee || undefined,
      page,
      limit: 10,
      sortBy: 'dueDate',
      sortOrder,
    },
    {
      skip: !projectId,
    },
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterPriority, filterAssignee, sortOrder]);

  // Check if current user is project manager or admin
  const isManager =
    user?.role === 'ADMIN' ||
    (project?.members &&
      project.members.some((m) => m.userId === user?.id && m.role === 'MANAGER'));

  // Open Task details drawer
  const handleTaskClick = (taskId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('taskId', taskId);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      {/* 1. Left Sidebar Navigation */}
      <Sidebar />

      {/* 2. Main Dashboard Panel */}
      <div className="main-content">
        {/* Top Header */}
        <Header projectName={project?.name} />

        {/* Content Area */}
        <main className={styles.mainArea}>
          {!projectId ? (
            /* Welcome state when no project is loaded */
            <div className={`${styles.welcomeContainer} glass`}>
              <h2 className={styles.welcomeTitle}>Welcome to TeamSync, {user?.name}!</h2>
              <p className={styles.welcomeText}>
                Please select a project from the left navigation panel to view its tasks, or create a new project if you are a manager.
              </p>
            </div>
          ) : (
            /* Active Project Workspace */
            <>
              {/* Filter Bar & Controls */}
              <FilterBar
                filterStatus={filterStatus}
                filterPriority={filterPriority}
                filterAssignee={filterAssignee}
                sortOrder={sortOrder}
                onStatusChange={setFilterStatus}
                onPriorityChange={setFilterPriority}
                onAssigneeChange={setFilterAssignee}
                onSortToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                onAddTask={() => setIsTaskModalOpen(true)}
                isManager={!!isManager}
                members={project?.members || []}
              />

              {/* Tasks Kanban Board */}
              <KanbanBoard
                tasks={tasksData?.data || []}
                isLoading={tasksLoading}
                error={tasksError}
                filterStatus={filterStatus}
                onTaskClick={handleTaskClick}
                onRetry={refetchTasks}
              />

              {/* Pagination Section */}
              {tasksData && tasksData.meta.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={tasksData.meta.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Task Detail Overlay Drawer */}
      {activeTaskId && <TaskDetailDrawer taskId={activeTaskId} />}

      {/* Modal - Create Task Overlay */}
      {isTaskModalOpen && (
        <CreateTaskModal
          projectId={projectId || ''}
          members={project?.members || []}
          onClose={() => setIsTaskModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Selectors
  const user = useAppSelector(selectCurrentUser);
  const isAuthLoading = useAppSelector(selectIsAuthLoading);

  // Restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await apiClient.get('/auth/me');
        dispatch(setCredentials(res.data.user));
      } catch (err) {
        dispatch(clearCredentials());
        router.push('/login');
      }
    }
    restoreSession();
  }, [dispatch, router]);

  if (isAuthLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Restoring session...</span>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Loading workspace...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
