/**
 * AuthProvider.tsx — Single Source of Truth for Authentication State.
 * Wraps Firebase onAuthStateChanged and exposes user session & profile state.
 */

import React, { createContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase.js';
import { getFriendlyAuthErrorMessage } from './authErrors.js';

export interface UserProfile {
  uid: string;
  role: 'PI' | 'COORDINATOR' | 'AUDITOR' | 'ADMIN';
  roleTitle: string;
  institution: string;
  npiNumber?: string;
  createdAt: string;
}

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithDemo: () => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_PROFILE: UserProfile = {
  uid: 'demo-coordinator-1',
  role: 'COORDINATOR',
  roleTitle: 'Lead Clinical Coordinator',
  institution: 'Johns Hopkins Hospital',
  npiNumber: '1928374650',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const MOCK_DEMO_USER = {
  uid: 'demo-coordinator-1',
  email: 'coordinator@aegistrial.org',
  emailVerified: true,
  displayName: 'Clinical Trial Lead',
  metadata: { creationTime: '2026-01-01T00:00:00.000Z' },
} as unknown as FirebaseUser;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setUserProfile({
          uid: user.uid,
          role: 'COORDINATOR',
          roleTitle: 'Clinical Trial Coordinator',
          institution: 'St. Jude Clinical Research Network',
          createdAt: user.metadata.creationTime || new Date().toISOString(),
        });
      } else {
        // Enforce Authentication — Unauthenticated users start as null
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const loginWithDemo = () => {
    setCurrentUser(MOCK_DEMO_USER);
    setUserProfile(DEMO_USER_PROFILE);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err.code || '');
      setError(msg);
      throw new Error(msg);
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await sendEmailVerification(res.user);
      }
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err.code || '');
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err.code || '');
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGithub = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err.code || '');
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err: any) {
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err.code || '');
      setError(msg);
      throw new Error(msg);
    }
  };

  const resendEmailVerification = async () => {
    if (!currentUser) return;
    setError(null);
    try {
      await sendEmailVerification(currentUser);
    } catch (err: any) {
      setError('Failed to resend verification email. Please wait a moment and try again.');
    }
  };

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      error,
      clearError,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      loginWithGithub,
      loginWithDemo,
      logout,
      resetPassword,
      resendEmailVerification,
    }),
    [currentUser, userProfile, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
