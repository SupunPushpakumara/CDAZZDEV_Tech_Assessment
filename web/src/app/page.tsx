import React from 'react';
import DashboardClient from './DashboardClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | TeamSync',
  description: 'Manage your projects and tasks in a real-time collaborative workspace.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
