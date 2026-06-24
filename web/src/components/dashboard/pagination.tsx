'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  idPrefix?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  idPrefix = 'dashboard-pagination',
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.container} aria-label="Pagination Navigation">
      <button
        id={`${idPrefix}-prev`}
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous Page"
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>

      <span id={`${idPrefix}-info`} className={styles.pageInfo} aria-live="polite">
        Page {currentPage} of {totalPages}
      </span>

      <button
        id={`${idPrefix}-next`}
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next Page"
      >
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};
