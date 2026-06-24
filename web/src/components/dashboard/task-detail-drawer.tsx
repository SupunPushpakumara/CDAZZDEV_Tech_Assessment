'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import {
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useAddCommentMutation,
  useGetProjectByIdQuery,
} from '../../store/services/teamsyncApi';
import { X, Calendar, User, MessageSquare, Send, Loader2 } from 'lucide-react';
import styles from './task-detail-drawer.module.css';

interface TaskDetailDrawerProps {
  taskId: string;
}

export function TaskDetailDrawer({ taskId }: TaskDetailDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAppSelector(selectCurrentUser);

  // RTK Query hooks
  const { data: task, isLoading: taskLoading, error } = useGetTaskByIdQuery(taskId);
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [addComment, { isLoading: isCommenting }] = useAddCommentMutation();

  // Load project to verify membership role
  const { data: project } = useGetProjectByIdQuery(task?.projectId || '', {
    skip: !task?.projectId,
  });

  // Local state for comments and status
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [statusError, setStatusError] = useState('');

  // Close drawer by removing the query param
  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('taskId');
    router.push(`/?${params.toString()}`);
  };

  // Determine if the current user has permission to update the task
  const userMembership = project?.members.find((m) => m.userId === currentUser?.id);
  const hasUpdatePermission =
    currentUser?.role === 'ADMIN' ||
    userMembership?.role === 'MANAGER' ||
    task?.assigneeId === currentUser?.id;

  // Handle Status Update
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      setStatusError('');
      await updateTask({
        id: taskId,
        status: e.target.value,
      }).unwrap();
    } catch (err: any) {
      setStatusError(err.data?.message || 'Failed to update task status');
    }
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setCommentError('');
      await addComment({
        taskId,
        body: commentText,
      }).unwrap();
      setCommentText('');
    } catch (err: any) {
      setCommentError(err.data?.message || 'Failed to submit comment');
    }
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return { background: 'rgba(220, 38, 38, 0.15)', color: 'var(--color-danger)' };
      case 'MEDIUM':
        return { background: 'rgba(217, 119, 6, 0.15)', color: 'var(--color-warning)' };
      default:
        return { background: 'rgba(22, 163, 74, 0.15)', color: 'var(--color-success)' };
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        id="task-detail-backdrop"
        className={styles.backdrop}
        onClick={handleClose}
      />

      {/* Sliding Drawer Container */}
      <div
        id="task-detail-drawer"
        className={`glass ${styles.drawer} animate-slide-in-right`}
        role="dialog"
        aria-modal="true"
        aria-label="Task Specifications"
      >
        {/* Drawer Header */}
        <div className={styles.header}>
          <span className={styles.headerLabel}>Task Specifications</span>
          <button
            id="close-drawer-btn"
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        {taskLoading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className="animate-spin text-blue-500" size={28} />
          </div>
        ) : error || !task ? (
          <div className={styles.errorState}>
            Failed to load task specifications.
          </div>
        ) : (
          <div className={styles.body}>
            {/* Task Information Section */}
            <div className={styles.infoSection}>
              {/* Title */}
              <h2 className={styles.title}>{task.title}</h2>

              {/* Description */}
              <div className={styles.description}>
                {task.description || 'No description provided.'}
              </div>

              {/* Grid Metadata */}
              <div className={styles.metadataGrid}>
                {/* Priority */}
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Priority</span>
                  <span
                    className={styles.metaValue}
                    style={getPriorityStyle(task.priority)}
                  >
                    {task.priority}
                  </span>
                </div>

                {/* Status Selector */}
                <div className={styles.selectWrapper}>
                  <label htmlFor="task-status-select" className={styles.metaLabel}>Status</label>
                  <select
                    id="task-status-select"
                    value={task.status}
                    onChange={handleStatusChange}
                    disabled={!hasUpdatePermission || isUpdating}
                    className={styles.select}
                    style={{
                      cursor: hasUpdatePermission ? 'pointer' : 'not-allowed',
                      opacity: hasUpdatePermission ? 1 : 0.7,
                    }}
                  >
                    <option value="TODO" style={{ background: '#111827' }}>To Do</option>
                    <option value="IN_PROGRESS" style={{ background: '#111827' }}>In Progress</option>
                    <option value="DONE" style={{ background: '#111827' }}>Done</option>
                  </select>
                  {statusError && (
                    <span id="status-update-error" className={styles.errorText}>{statusError}</span>
                  )}
                </div>

                {/* Assignee */}
                <div className={styles.metaFlex}>
                  <User size={16} className="text-gray-400" />
                  <div className={styles.metaFlexContent}>
                    <span className={styles.metaLabel}>Assignee</span>
                    <span className={styles.metaValueText}>
                      {task.assignee ? task.assignee.name : 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Due Date */}
                <div className={styles.metaFlex}>
                  <Calendar size={16} className="text-gray-400" />
                  <div className={styles.metaFlexContent}>
                    <span className={styles.metaLabel}>Due Date</span>
                    <span className={styles.metaValueText}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                  </div>
                </div>
              </div>

              {!hasUpdatePermission && (
                <div className={styles.permissionNote}>
                  * You do not have permissions to modify this task.
                </div>
              )}
            </div>

            {/* Discussion Comments Thread */}
            <div className={styles.discussionSection}>
              <div className={styles.discussionHeader}>
                <MessageSquare size={16} />
                <span style={{ fontWeight: 600 }}>Discussion Feed ({task.comments.length})</span>
              </div>

              {/* Scrollable feed */}
              <div className={styles.commentsFeed}>
                {task.comments.length > 0 ? (
                  task.comments.map((comm) => (
                    <article
                      key={comm.id}
                      className={styles.commentCard}
                    >
                      <div className={styles.commentMeta}>
                        <span className={styles.commentAuthor}>{comm.author.name}</span>
                        <span className={styles.commentTime}>
                          {new Date(comm.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className={styles.commentBody}>
                        {comm.body}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className={`caption ${styles.emptyComments}`}>
                    No discussions yet. Be the first to comment!
                  </div>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                <div className={styles.commentInputGroup}>
                  <input
                    id="comment-text-input"
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    disabled={isCommenting}
                    className={styles.commentInput}
                    aria-label="Write a comment"
                  />
                  <button
                    id="submit-comment-btn"
                    type="submit"
                    disabled={isCommenting || !commentText.trim()}
                    className={styles.commentSubmitButton}
                    style={{
                      cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                      opacity: commentText.trim() ? 1 : 0.6,
                    }}
                    aria-label="Send comment"
                  >
                    {isCommenting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </div>
                {commentError && (
                  <div id="comment-submit-error" className={styles.errorText}>{commentError}</div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
