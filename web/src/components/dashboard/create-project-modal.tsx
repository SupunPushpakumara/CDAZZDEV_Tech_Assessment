'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X, Users } from 'lucide-react';
import { useCreateProjectMutation, useGetUsersQuery } from '../../store/services/teamsyncApi';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import styles from './create-project-modal.module.css';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be under 100 characters'),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional().or(z.literal('')),
  memberIds: z.array(z.string()).optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const { data: allUsers, isLoading: isLoadingUsers, isError: isErrorUsers } = useGetUsersQuery();
  const currentUser = useAppSelector(selectCurrentUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      memberIds: [],
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

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const newProj = await createProject({
        name: data.name,
        description: data.description || undefined,
        memberIds: data.memberIds && data.memberIds.length > 0 ? data.memberIds : undefined,
      }).unwrap();
      onSuccess(newProj.id);
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setError('root', {
        message: error.data?.message || 'Failed to create project',
      });
    }
  };

  const selectableUsers = allUsers?.filter((user) => user.id !== currentUser?.id) || [];

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create new project"
    >
      <div className={`glass ${styles.modal}`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Create New Project</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Form with Zod validation */}
        <form id="create-project-form" onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Project Name */}
          <div className={styles.field}>
            <label htmlFor="project-name" className={styles.label}>Project Name *</label>
            <input
              id="project-name"
              type="text"
              placeholder="e.g. Android App Build"
              className={`${styles.input} ${errors.name ? styles.errorBorder : ''}`}
              {...register('name')}
              autoFocus
            />
            {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="project-description" className={styles.label}>Description (Optional)</label>
            <textarea
              id="project-description"
              placeholder="Short project summary..."
              rows={3}
              className={`${styles.textarea} ${errors.description ? styles.errorBorder : ''}`}
              {...register('description')}
            />
            {errors.description && <span className={styles.errorText}>{errors.description.message}</span>}
          </div>

          {/* Members Selection */}
          <div className={styles.field}>
            <label className={styles.label}>
              <span className={styles.labelWithIcon}>
                <Users size={14} /> Add Members (Optional)
              </span>
            </label>
            
            {isLoadingUsers ? (
              <div className={styles.loaderContainer}>
                <Loader2 className="animate-spin" size={16} />
                <span>Loading users...</span>
              </div>
            ) : isErrorUsers ? (
              <div className={styles.errorText}>Failed to load users for assignment.</div>
            ) : selectableUsers.length === 0 ? (
              <div className={styles.emptyText}>No other users registered.</div>
            ) : (
              <div className={styles.membersList}>
                {selectableUsers.map((user) => (
                  <label key={user.id} className={styles.memberItem}>
                    <input
                      type="checkbox"
                      value={user.id}
                      className={styles.checkbox}
                      {...register('memberIds')}
                    />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{user.name}</span>
                      <span className={styles.memberEmail}>{user.email}</span>
                    </div>
                    <span className={`${styles.roleBadge} ${styles[user.role.toLowerCase()]}`}>
                      {user.role}
                    </span>
                  </label>
                ))}
              </div>
            )}
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
            <button id="submit-project-btn" type="submit" disabled={isCreating} className={styles.submitButton}>
              {isCreating && <Loader2 className="animate-spin" size={14} />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
