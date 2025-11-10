import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const MobileOptimizedLayout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-100">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="flex items-center h-16 gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="h-6 w-6" />
              </div>
              <span className="font-semibold text-red-600">MonishaIMS</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <NavLink to="/dashboard" active={location.pathname === '/dashboard'}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" stroke="currentColor" strokeWidth="2" />
                </svg>
                Dashboard
              </NavLink>
              <NavLink to="/inventory" active={location.pathname === '/inventory'}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" />
                </svg>
                Inventory
              </NavLink>
              <NavLink to="/batches" active={location.pathname === '/batches'}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" stroke="currentColor" strokeWidth="2" />
                </svg>
                Manufacturing
              </NavLink>
              <NavLink to="/orders" active={location.pathname === '/orders'}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" />
                </svg>
                Orders
              </NavLink>
              <NavLink to="/schools" active={location.pathname === '/schools'}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke="currentColor" strokeWidth="2" />
                </svg>
                Schools
              </NavLink>
              <NavLink to="/reports" active={location.pathname === '/reports'}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" />
                </svg>
                Reports
              </NavLink>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 ml-auto">
              <button className="p-2 hover:bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <span className="text-red-600 font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 px-4">
        <AnimatePresence mode="sync">
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

// NavLink component for consistent navigation styling
const NavLink = ({ to, children, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-2 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'text-red-600'
        : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    {children}
  </Link>
);

export default MobileOptimizedLayout; 