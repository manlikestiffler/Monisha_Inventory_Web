import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../stores/authStore';
import { collection, getDocs, query, limit } from 'firebase/firestore';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstUser, setFirstUser] = useState(false);
  const { setUser, saveStaffProfile, saveManagerProfile } = useAuthStore();

  // Check if this is the first user in the system
  useEffect(() => {
    const checkFirstUser = async () => {
      try {
        // Check if any managers exist
        const managersQuery = query(collection(db, 'managers'), limit(1));
        const managersSnapshot = await getDocs(managersQuery);
        
        // Check if any staff exist
        const staffQuery = query(collection(db, 'staff'), limit(1));
        const staffSnapshot = await getDocs(staffQuery);
        
        // If both collections are empty, this is the first user
        if (managersSnapshot.empty && staffSnapshot.empty) {
          setFirstUser(true);
        }
      } catch (err) {
        console.error('Error checking for first user:', err);
      }
    };
    
    checkFirstUser();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Form validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Create the user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Send email verification without dynamic link domain
      await sendEmailVerification(user);
      
      // Generate a display name from first and last name
      const displayName = `${firstName} ${lastName}`;
      
      // Base user profile data
      const profileData = {
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        photoURL: user.photoURL || '',
        appSource: 'inventory-app'
      };
      
      // Only tinashegomo96@gmail.com should be super admin (permanent hardcoded)
      const SUPER_ADMIN_EMAIL = 'tinashegomo96@gmail.com';
      const isPermanentSuperAdmin = (email) => {
        return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      };
      
      if (isPermanentSuperAdmin(user.email)) {
        // Super admin user gets manager profile with super_admin role
        const managerData = {
          ...profileData,
          role: 'super_admin',
          isActive: true
        };
        await saveManagerProfile(user.uid, managerData);
        setSuccessMessage('Super admin account created! Please check your email to verify your account.');
      } else {
        // All other users are registered as staff (including first user if not super admin)
        const staffData = {
          ...profileData,
          role: 'staff',
          isActive: true
        };
        await saveStaffProfile(user.uid, staffData);
        setSuccessMessage('Account created! Please check your email to verify your account.');
      }
      
      // Set the user in the global state
      setUser(user);
      
      // Navigate to email verification page instead of login
      setTimeout(() => {
        navigate('/verify-email');
      }, 3000); // Reduced time before redirect
      
    } catch (err) {
      console.error('Signup error:', err);
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists'
          : err.code === 'auth/invalid-email'
          ? 'Invalid email address'
          : 'An error occurred during signup'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-[Inter]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo and Welcome Text */}
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
            className="text-4xl font-bold text-foreground tracking-tight"
          >
            Create Account
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mt-3 text-lg"
          >
            Join Monisha Inventory Management System
          </motion.p>
          {firstUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-3 text-sm bg-destructive/20 text-destructive p-2 rounded-lg inline-block"
            >
              You are the first user! You will be registered as a manager.
            </motion.div>
          )}
        </div>

        {/* Signup Form */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="p-8 w-full"
        >
          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <div className="mb-6 p-4 bg-destructive/20 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
                  placeholder="First Name"
                />
              </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                Email address
              </label>
                <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                Password
              </label>
                <input
                id="password"
                name="password"
                  type="password"
                autoComplete="new-password"
                required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground">
                Confirm Password
              </label>
                <input
                id="confirmPassword"
                name="confirmPassword"
                  type="password"
                autoComplete="new-password"
                required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>

            {!firstUser && (
              <div className="bg-secondary/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You are signing up as a staff member. Only authorized administrators can grant manager access.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-red-600 text-white rounded-lg font-semibold transition-all duration-300 ease-in-out ${
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700 hover:-translate-y-0.5 transform'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-red-400 hover:text-red-300 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup;