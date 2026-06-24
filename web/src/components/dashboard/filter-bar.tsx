'use client';

import React from 'react';
import { Filter, Plus } from 'lucide-react';
import { ProjectMember } from '../../store/services/teamsyncApi';
import styles from './filter-bar.module.css';

interface FilterBarProps {
  filterStatus: string;
  filterPriority: string;
  filterAssignee: string;
  sortOrder: string;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSortToggle: () => void;
  onAddTask: () => void;
  isManager: boolean;
  members: ProjectMember[];
}

export function FilterBar({
  filterStatus,
  filterPriority,
  filterAssignee,
  sortOrder,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onSortToggle,
  onAddTask,
  isManager,
  members,
}: FilterBarProps) {
  return (
    <div id="filter-bar" className={`${styles.filterBar} glass`}>
      {/* Filters Group */}
      <div className={styles.filtersGroup}>
        <div className={styles.filterLabel}>
          <Filter size={16} />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          id="filter-status"
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className={styles.select}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>

        {/* Priority Filter */}
        <select
          id="filter-priority"
          value={filterPriority}
          onChange={(e) => onPriorityChange(e.target.value)}
          className={styles.select}
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        {/* Assignee Filter — only visible to managers/admins */}
        {isManager && (
          <select
            id="filter-assignee"
            value={filterAssignee}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className={styles.select}
            aria-label="Filter by assignee"
          >
            <option value="">All Assignees</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>
        )}

        {/* Sort Order */}
        <button
          id="sort-toggle"
          onClick={onSortToggle}
          className={styles.sortButton}
          aria-label={`Sort by due date ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        >
          Due Date: {sortOrder.toUpperCase()}
        </button>
      </div>

      {/* Add Task Button — restricted to Managers/Admins */}
      {isManager && (
        <button id="add-task-btn" onClick={onAddTask} className={styles.addTaskButton}>
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      )}
    </div>
  );
}
