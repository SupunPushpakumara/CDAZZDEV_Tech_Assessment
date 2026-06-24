import React from 'react';
import RegisterForm from './register-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | TeamSync',
  description: 'Create a new TeamSync account to collaborate with your team.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
