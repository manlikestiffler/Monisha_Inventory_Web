import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';

const EmailVerification = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  
  // Email displayed in the UI
  const userEmail = auth.currentUser?.email || 'your email';

  useEffect(() => {
    // Check if user is logged in
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    // Check if email is already verified
    if (auth.currentUser.emailVerified) {
      navigate('/dashboard');
    }

    // Set up countdown for resend button
    let timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleResendEmail = async () => {
    try {
      setResendDisabled(true);
      setCountdown(60);
      
      // Configure action code settings for better deliverability
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
        dynamicLinkDomain: window.location.hostname
      };
      
      await sendEmailVerification(auth.currentUser, actionCodeSettings);
      setSuccess('Verification email resent! Please check your inbox and spam folder.');
      
      // Start countdown again
      let timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      setError('Failed to resend verification email. Please try again later.');
      setResendDisabled(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-[Inter]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 1 
            }}
            className="w-24 h-24 mx-auto mb-6 relative group"
          >
            <div className="w-full h-full bg-red-600 rounded-2xl shadow-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500">
              <span className="text-5xl font-black text-white font-[Inter] tracking-tighter transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.1)' }}>
                M
              </span>
              <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/0 transition-colors duration-500" />
            </div>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-white tracking-tight"
          >
            Verify Your Email
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-300 mt-3 text-lg"
          >
            We've sent a verification link to <span className="font-medium text-red-400">{userEmail}</span>
          </motion.p>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="p-8 w-full"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 text-red-200 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-900/50 text-green-200 rounded-lg text-sm text-center">
              {success}
            </div>
          )}
          
          <div className="space-y-6 text-gray-300">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="font-medium text-white mb-2">Next steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Check your email inbox for a message from Monisha Inventory System</li>
                <li>If you don't see it, check your spam or junk folder</li>
                <li>Click the verification link in the email</li>
                <li>Once verified, return to this app to sign in</li>
              </ol>
            </div>
            
            <div className="text-center">
              <p className="text-sm mb-4">Didn't receive the email?</p>
              <button
                onClick={handleResendEmail}
                disabled={resendDisabled}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  resendDisabled 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {resendDisabled 
                  ? `Resend in ${countdown}s` 
                  : 'Resend verification email'
                }
              </button>
            </div>
            
            <div className="border-t border-gray-700 pt-6 text-center">
              <p className="text-sm text-gray-400 mb-4">
                Want to use a different email?
              </p>
              <Link 
                to="/signup" 
                className="text-red-400 hover:text-red-300 hover:underline font-medium text-sm"
              >
                Create a new account
              </Link>
              <p className="mt-4 text-sm text-gray-400">
                Already verified?{' '}
                <Link 
                  to="/login" 
                  className="text-red-400 hover:text-red-300 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmailVerification; 