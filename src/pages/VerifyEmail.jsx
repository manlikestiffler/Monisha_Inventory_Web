import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, checkAndAssignSuperAdmin } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.emailVerified) {
        // Check if this is the super admin email
        await checkAndAssignSuperAdmin(currentUser);
        toast.success('Email verified successfully!');
        navigate('/dashboard');
      } else if (!currentUser) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate, checkAndAssignSuperAdmin]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!user || resendCooldown > 0) return;

    setLoading(true);
    try {
      await sendEmailVerification(user);
      toast.success('Verification email sent! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        await checkAndAssignSuperAdmin(user);
        toast.success('Email verified successfully!');
        navigate('/dashboard');
      } else {
        toast.error('Email not yet verified. Please check your inbox.');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      toast.error('Failed to check verification status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a verification email to{' '}
            <span className="font-medium text-indigo-600">{user?.email}</span>
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                Check Your Email
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Click the verification link in your email to activate your account.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCheckVerification}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'I\'ve Verified My Email'}
              </button>

              <button
                onClick={handleResendVerification}
                disabled={loading || resendCooldown > 0}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : loading
                  ? 'Sending...'
                  : 'Resend Verification Email'}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Check your spam folder if you don't see the email.
                The verification link expires in 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
