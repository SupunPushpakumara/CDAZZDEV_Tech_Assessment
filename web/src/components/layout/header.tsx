'use client';

import React from 'react';
import { useAppDispatch } from '../../store/hooks';
import { toggleSidebar } from '../../store/slices/uiSlice';
import styles from './header.module.css';
import { Menu } from 'lucide-react';

interface HeaderProps {
  projectName?: string;
}

export function Header({ projectName }: HeaderProps) {
  const dispatch = useAppDispatch();

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Mobile menu trigger */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={styles.menuButton}
          aria-label="Open navigation sidebar"
        >
          <Menu size={22} />
        </button>

        <h1 className={styles.projectName}>
          {projectName || 'Select a Project to View Tasks'}
        </h1>
      </div>
    </header>
  );
}
