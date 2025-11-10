import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, fetchUserProfile } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('Please verify your email before logging in.');
        setLoading(false);
        return;
      }

      setUser(user);
      await fetchUserProfile(user.uid);
      
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.code === 'auth/invalid-credential' 
          ? 'Invalid email or password' 
          : err.code === 'auth/user-disabled'
          ? 'This account has been disabled'
          : 'An error occurred during login'
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
            Welcome Back
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mt-3 text-lg"
          >
            Sign in to Monisha Inventory Management System
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="p-8 w-full"
        >
          {error && (
            <div className="mb-6 p-4 bg-destructive/20 text-destructive rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="mt-2 block w-full px-4 py-3 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full px-4 py-3 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-foreground placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>

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
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-red-400 hover:text-red-300 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;