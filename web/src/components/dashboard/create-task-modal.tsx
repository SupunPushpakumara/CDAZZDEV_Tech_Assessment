'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { ProjectMember, useCreateTaskMutation } from '../../store/services/teamsyncApi';
import styles from './create-task-modal.module.css';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional().or(z.literal('')),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigneeId: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

interface CreateTaskModalProps {
  projectId: string;
  members: ProjectMember[];
  onClose: () => void;
}

export function CreateTaskModal({ projectId, members, onClose }: CreateTaskModalProps) {
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: 'MEDIUM',
      assigneeId: '',
      dueDate: '',
      description: '',
    },
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      await createTask({
        projectId,
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        assigneeId: data.assigneeId || undefined,
        dueDate: data.dueDate || undefined,
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setError('root', {
        message: error.data?.message || 'Failed to create task',
      });
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create new task"
    >
      <div className={`glass ${styles.modal}`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Add New Task</h2>
          <button onClick={onClose} className={styles.cancelLink}>
            Cancel
          </button>
        </div>

        {/* Form with Zod validation */}
        <form id="create-task-form" onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="task-title" className={styles.label}>Task Title *</label>
            <input
              id="task-title"
              type="text"
              placeholder="Task objective..."
              className={`${styles.input} ${errors.title ? styles.errorBorder : ''}`}
              {...register('title')}
              autoFocus
            />
            {errors.title && <span className={styles.errorText}>{errors.title.message}</span>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="task-description" className={styles.label}>Description</label>
            <textarea
              id="task-description"
              placeholder="Provide explicit checklist or instructions..."
              rows={3}
              className={`${styles.textarea} ${errors.description ? styles.errorBorder : ''}`}
              {...register('description')}
            />
            {errors.description && <span className={styles.errorText}>{errors.description.message}</span>}
          </div>

          {/* Priority */}
          <div className={styles.field}>
            <label htmlFor="task-priority" className={styles.label}>Priority</label>
            <select id="task-priority" className={styles.select} {...register('priority')}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* Assignee */}
          <div className={styles.field}>
            <label htmlFor="task-assignee" className={styles.label}>Assignee</label>
            <select id="task-assignee" className={styles.select} {...register('assigneeId')}>
              <option value="">Select Assignee</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div className={styles.field}>
            <label htmlFor="task-due-date" className={styles.label}>Due Date</label>
            <input
              id="task-due-date"
              type="date"
              className={styles.input}
              {...register('dueDate')}
            />
          </div>

          {/* Root form error */}
          {errors.root && (
            <div className={styles.formError}>{errors.root.message}</div>
          )}

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button id="submit-task-btn" type="submit" disabled={isCreating} className={styles.submitButton}>
              {isCreating && <Loader2 className="animate-spin" size={14} />}
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
