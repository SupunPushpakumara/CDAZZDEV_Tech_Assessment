'use client';

import React from 'react';
import { User } from 'lucide-react';
import { Task } from '../../store/services/teamsyncApi';
import styles from './task-card.module.css';

interface TaskCardProps {
  task: Task;
  onClick: (taskId: string) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priorityClass =
    task.priority === 'HIGH'
      ? styles.priorityHigh
      : task.priority === 'MEDIUM'
      ? styles.priorityMedium
      : styles.priorityLow;

  return (
    <article
      id={`task-card-${task.id}`}
      onClick={() => onClick(task.id)}
      className={`card-glass ${styles.card}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task.id);
        }
      }}
    >
      <div className={styles.title}>{task.title}</div>
      <div className={styles.description}>
        {task.description || 'No description provided.'}
      </div>

      <div className={styles.footer}>
        <span className={`${styles.priorityBadge} ${priorityClass}`}>
          {task.priority}
        </span>

        {task.assignee ? (
          <div className={styles.assignee}>
            <User size={12} />
            <span>{task.assignee.name}</span>
          </div>
        ) : (
          <span className={styles.unassigned}>Unassigned</span>
        )}
      </div>

      {task.dueDate && (
        <div className={styles.dueDate}>
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </article>
  );
}
