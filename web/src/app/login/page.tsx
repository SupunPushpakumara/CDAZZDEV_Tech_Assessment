import React from 'react';
import LoginForm from './login-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | TeamSync',
  description: 'Log in to your TeamSync account to manage tasks and projects.',
};

export default function LoginPage() {
  return <LoginForm />;
}
