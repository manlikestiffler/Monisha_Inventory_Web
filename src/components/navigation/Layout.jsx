import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { motion } from 'framer-motion';

const Layout = ({ children }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuthStore();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/schools', label: 'Schools' },
    { path: '/batches', label: 'Batch Inventory' },
    { path: '/orders', label: 'Orders' },
    { path: '/reports', label: 'Reports' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional navbar */}
      <nav className="fixed w-full top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center">
                <span className="text-2xl font-semibold text-primary-600">Monisha</span>
              </Link>
              
              {/* Navigation items */}
              <div className="hidden md:ml-8 md:flex md:space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      location.pathname.includes(item.path)
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Profile dropdown */}
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    T
                  </span>
                </button>

                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                  >
                    <div className="py-1">
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default Layout; 