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
import styles from '../login/login.module.css'; // Share styling with login
import apiClient from '../../lib/axios';
import { Loader2 } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['MEMBER', 'MANAGER', 'ADMIN']),
});

type RegisterSchemaType = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'MEMBER' },
  });

  const onSubmit = async (data: RegisterSchemaType) => {
    try {
      setAuthError('');
      setSubmitting(true);

      const response = await apiClient.post('/auth/register', data);

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
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Sign up to join TeamSync</p>

        {authError && (
          <div id="register-auth-error" className={styles.authError}>
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Full Name */}
          <div className={styles.field}>
            <label htmlFor="register-name" className={styles.label}>Full Name</label>
            <input
              id="register-name"
              type="text"
              placeholder="John Doe"
              className={`${styles.input} ${errors.name ? styles.errorBorder : ''}`}
              {...register('name')}
            />
            {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
          </div>

          {/* Email Address */}
          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>Email Address</label>
            <input
              id="register-email"
              type="email"
              placeholder="name@company.com"
              className={`${styles.input} ${errors.email ? styles.errorBorder : ''}`}
              {...register('email')}
            />
            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="register-password" className={styles.label}>Password</label>
            <input
              id="register-password"
              type="password"
              placeholder="••••••••"
              className={`${styles.input} ${errors.password ? styles.errorBorder : ''}`}
              {...register('password')}
            />
            {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
          </div>

          {/* Global Role Choice */}
          <div className={styles.field}>
            <label htmlFor="register-role" className={styles.label}>Global Role (Demo configuration)</label>
            <select
              id="register-role"
              className={styles.input}
              {...register('role')}
              style={{ background: '#1f2937', color: '#fff' }}
            >
              <option value="MEMBER">Member (Developer / Designer)</option>
              <option value="MANAGER">Manager (Creates Projects & Tasks)</option>
              <option value="ADMIN">Admin (Bypasses all checks)</option>
            </select>
            {errors.role && <span className={styles.errorText}>{errors.role.message}</span>}
          </div>

          {/* Submit Button */}
          <button id="register-submit" type="submit" className={styles.button} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Signing up...</span>
              </>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link id="login-link" href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
