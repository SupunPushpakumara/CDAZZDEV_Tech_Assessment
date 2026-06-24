'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { teamsyncApi } from '../../store/services/teamsyncApi';
import styles from './login.module.css';
import apiClient from '../../lib/axios';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      setAuthError('');
      setSubmitting(true);

      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const resData = response.data;

      // Reset RTK Query cache first to ensure old user data doesn't persist
      dispatch(teamsyncApi.util.resetApiState());

      // Store in Redux
      dispatch(setCredentials(resData.user));
      
      // Navigate to dashboard
      router.push('/');
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass`}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Log in to manage your team tasks</p>

        {authError && (
          <div id="login-auth-error" className={styles.authError}>
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Email Field */}
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@company.com"
              className={`${styles.input} ${errors.email ? styles.errorBorder : ''}`}
              {...register('email')}
            />
            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
          </div>

          {/* Password Field */}
          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              className={`${styles.input} ${errors.password ? styles.errorBorder : ''}`}
              {...register('password')}
            />
            {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
          </div>



          {/* Submit Button */}
          <button id="login-submit" type="submit" className={styles.button} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link id="register-link" href="/register" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
