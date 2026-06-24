'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser, clearCredentials } from '../../store/slices/authSlice';
import { selectIsSidebarOpen, setSidebarOpen } from '../../store/slices/uiSlice';
import { useGetProjectsQuery, teamsyncApi } from '../../store/services/teamsyncApi';
import styles from './sidebar.module.css';
import apiClient from '../../lib/axios';
import { LogOut, FolderPlus, Briefcase, Loader2 } from 'lucide-react';
import { CreateProjectModal } from '../dashboard/create-project-modal';

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  // Redux Selectors
  const user = useAppSelector(selectCurrentUser);
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  // RTK Query hooks
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useGetProjectsQuery(undefined, {
    skip: !user, // Skip query if user is not authenticated yet
  });

  // Local States
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeProjectId = searchParams.get('projectId');

  // Handle Project Selection
  const handleProjectSelect = (id: string) => {
    dispatch(setSidebarOpen(false)); // Close sidebar on mobile
    const params = new URLSearchParams(searchParams.toString());
    params.set('projectId', id);
    router.push(`/?${params.toString()}`);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignored: clear locally anyway
    }
    dispatch(clearCredentials());
    dispatch(teamsyncApi.util.resetApiState());
    router.push('/login');
  };

  return (
    <>
      {/* Background overlay backdrop for mobile viewports */}
      {isSidebarOpen && (
        <div className={styles.backdrop} onClick={() => dispatch(setSidebarOpen(false))} />
      )}

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand Logo Header */}
        <div className={styles.logoContainer}>
          <Briefcase size={22} className="text-blue-500" />
          <span className={styles.logoText}>TeamSync</span>
        </div>

        {/* Project Section Heading */}
        <div className={styles.sectionLabel}>My Projects</div>

        {/* Projects List */}
        <nav className={styles.navList}>
          {projectsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin text-gray-400" size={20} />
            </div>
          ) : projectsError ? (
            <div style={{ padding: '16px', color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center' }}>
              Failed to load projects.
            </div>
          ) : projects && projects.length > 0 ? (
            projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => handleProjectSelect(proj.id)}
                className={`${styles.navItem} ${
                  activeProjectId === proj.id ? styles.navItemActive : ''
                }`}
              >
                <span className={styles.projectName}>{proj.name}</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>
                  {proj.members.length} {proj.members.length === 1 ? 'member' : 'members'}
                </span>
              </button>
            ))
          ) : (
            <div className="caption" style={{ padding: '16px', textAlign: 'center' }}>
              No projects joined yet.
            </div>
          )}

          {/* Create project option restricted to global Managers/Admins */}
          {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <button className={styles.createButton} onClick={() => setIsModalOpen(true)}>
              <FolderPlus size={16} />
              <span>Create Project</span>
            </button>
          )}
        </nav>

        {/* User profile details at the bottom of the sidebar */}
        {user && (
          <div className={styles.userProfile}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* Modal - Create Project Overlay */}
      {isModalOpen && (
        <CreateProjectModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={(projectId) => handleProjectSelect(projectId)}
        />
      )}
    </>
  );
}
