import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from './ThemeProvider';
import Logo from '../components/Logo';
import MobileMenu from './navigation/MobileMenu';
import NotificationBell from './notifications/NotificationBell';
import {
  DashboardIcon,
  InventoryIcon,
  ManufacturingIcon,
  OrdersIcon,
  SchoolsIcon,
  ReportsIcon,
  NotificationIcon,
  MenuIcon
} from './icons';
import { FiUsers, FiUser, FiLogOut, FiTrash2, FiShield, FiChevronDown, FiSun, FiMoon, FiAlertTriangle } from 'react-icons/fi';

const Layout = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isManager, userProfile, userRole, deleteAccount, isSuperAdmin } = useAuthStore();
  
  // Check if current user is super user
  const isSuperUser = user?.email === 'tinashegomo96@gmail.com';
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Get user's full name
  const getUserFullName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    
    if (userProfile?.displayName) {
      return userProfile.displayName;
    }
    
    if (user?.email) {
      // Extract name from email (before the @)
      const emailName = user.email.split('@')[0];
      // Capitalize first letter and replace dots with spaces
      return emailName.charAt(0).toUpperCase() + 
             emailName.slice(1).replace(/\./g, ' ');
    }
    
    return 'User';
  };

  // Get initials from user information
  const getUserInitials = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
    }
    
    if (userProfile?.displayName) {
      return userProfile.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/inventory', label: 'Inventory', icon: <InventoryIcon /> },
    { path: '/batches', label: 'Batch Inventory', icon: <ManufacturingIcon /> },
    { path: '/orders', label: 'Orders', icon: <OrdersIcon /> },
    { path: '/schools', label: 'Schools', icon: <SchoolsIcon /> },
    { path: '/reports', label: 'Reports', icon: <ReportsIcon /> },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsProfileOpen(false);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      await deleteAccount();
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Failed to delete account: ${error.message}`);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
          isScrolled ? 'bg-background/80 backdrop-blur-sm shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <Logo />
              </Link>

              <div className="hidden md:ml-10 md:flex md:space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      location.pathname.startsWith(link.path)
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {link.icon}
                    <span className="ml-2">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <NotificationBell />
              
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none"
                title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
              >
                <span className="sr-only">Toggle theme</span>
                {theme === 'light' ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5" />}
              </button>


              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 text-sm focus:outline-none group"
                >
                  <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110 shadow-md shadow-red-900/30">
                    {userProfile?.photoURL ? (
                      <img 
                        src={userProfile.photoURL} 
                        alt="Profile" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                    <span className="text-white font-bold">
                        {getUserInitials()}
                    </span>
                    )}
                  </div>
                  <FiChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: { 
                          duration: 0.2, 
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: 10, 
                        scale: 0.95, 
                        transition: { duration: 0.15 } 
                      }}
                      className="absolute right-0 mt-3 w-72 origin-top-right rounded-xl bg-card text-foreground shadow-xl border border-border z-50 overflow-hidden"
                    >
                      {/* User Info Section */}
                      <div className="px-4 py-4 border-b border-border">
                        <div className="flex items-center">
                          <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-red-500/30"
                          >
                            {userProfile?.photoURL ? (
                              <img 
                                src={userProfile.photoURL} 
                                alt="Profile" 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                            <span className="text-lg text-white font-bold">
                                {getUserInitials()}
                            </span>
                            )}
                          </motion.div>
                          <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {getUserFullName()}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              userRole === 'manager' 
                                ? 'bg-red-500/10 text-red-400' 
                                : 'bg-secondary text-muted-foreground'
                            }`}>
                            <FiShield className="inline-block mr-1.5 h-3 w-3" />
                            <span>{userRole === 'manager' ? 'Manager' : 'Staff'}</span>
                          </div>
                          {isSuperUser && (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400">
                              <FiShield className="inline-block mr-1.5 h-3 w-3" />
                              <span>Super User</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Total Value Section */}
                      <div className="px-4 py-3 border-b border-border bg-secondary/50">
                        <div className="flex flex-col items-center">
                          <p className="text-xs font-medium text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold text-foreground mt-1">$0</p>
                        </div>
                      </div>
                      
                      {/* Actions Section */}
                      <div className="p-2">
                        <DropdownMenuItem onSelect={() => { navigate('/profile'); setIsProfileOpen(false); }}>
                          <FiUser className="h-4 w-4 mr-3 text-muted-foreground" />
                          <span className="text-foreground">View Profile</span>
                        </DropdownMenuItem>
                        {isSuperUser && (
                          <DropdownMenuItem onSelect={() => { navigate('/admin/super-admin'); setIsProfileOpen(false); }}>
                            <FiShield className="h-4 w-4 mr-3 text-yellow-400" />
                            <span className="text-foreground">Super Admin Dashboard</span>
                          </DropdownMenuItem>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border mx-2"></div>

                      {/* Logout Section */}
                      <div className="p-2">
                        <DropdownMenuItem onSelect={handleLogout} isDestructive>
                          <FiLogOut className="h-4 w-4 mr-3" />
                          <span className="text-red-400">Logout</span>
                        </DropdownMenuItem>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none md:hidden"
              >
                <span className="sr-only">Open main menu</span>
                <MenuIcon />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu 
            navLinks={navLinks} 
            isOpen={isMobileMenuOpen} 
            onClose={() => setIsMobileMenuOpen(false)} 
          />
        )}
      </AnimatePresence>

      <main className="pt-16 bg-background">
        {children}
      </main>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-xl w-full max-w-md p-8"
            >
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <FiTrash2 className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground">
                  Delete Account
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete your account? All of your data will be permanently removed. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DropdownMenuItem = ({ onSelect, children, isDestructive = false }) => (
  <motion.button
    onClick={onSelect}
    whileHover={{ x: 2 }}
    className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
      isDestructive
        ? 'text-red-400 hover:bg-red-500/10'
        : 'text-gray-300 hover:bg-[#2A2B32]'
    }`}
  >
    {children}
  </motion.button>
);

DropdownMenuItem.propTypes = {
  onSelect: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  isDestructive: PropTypes.bool,
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;