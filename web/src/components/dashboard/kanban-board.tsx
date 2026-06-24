'use client';

import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Task } from '../../store/services/teamsyncApi';
import { TaskCard } from './task-card';
import styles from './kanban-board.module.css';

interface KanbanBoardProps {
  tasks: Task[];
  isLoading: boolean;
  error: unknown;
  filterStatus: string;
  onTaskClick: (taskId: string) => void;
  onRetry: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do 📝',
  IN_PROGRESS: 'In Progress ⚡',
  DONE: 'Done ✅',
};

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export function KanbanBoard({
  tasks,
  isLoading,
  error,
  filterStatus,
  onTaskClick,
  onRetry,
}: KanbanBoardProps) {
  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={28} style={{ color: 'var(--color-danger)' }} />
        <span className={styles.errorMessage}>Failed to load tasks</span>
        <span className={styles.errorHint}>
          Check your network connection or try again.
        </span>
        <button id="retry-tasks-btn" onClick={onRetry} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className={styles.board}>
      {STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);

        // If a specific status filter is applied, only show that column
        if (filterStatus && filterStatus !== status) return null;

        return (
          <section
            key={status}
            className={`glass ${styles.column}`}
            aria-label={`${STATUS_LABELS[status]} column`}
          >
            {/* Column Header */}
            <div className={styles.columnHeader}>
              <span className={styles.columnTitle}>{STATUS_LABELS[status]}</span>
              <span className={styles.columnCount}>{columnTasks.length}</span>
            </div>

            {/* Column Body */}
            <div className={styles.columnBody}>
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))
              ) : (
                <div className={`caption ${styles.emptyColumn}`}>
                  No tasks in this section.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
