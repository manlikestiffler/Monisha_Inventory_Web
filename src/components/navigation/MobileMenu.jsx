import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';

const MobileMenu = ({ isOpen, onClose, navLinks, isManager }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-64 bg-card z-50 shadow-xl"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">Menu</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-3 py-2 rounded-lg transition-colors ${
                      currentPath.startsWith(link.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    onClick={onClose}
                  >
                    <div className="flex items-center">
                      {link.icon}
                      <span className="ml-3">{link.label}</span>
                    </div>
                  </Link>
                ))}
                
                {/* Add User Management option for managers */}
                {isManager && (
                  <Link
                    to="/users"
                    className={`block px-3 py-2 rounded-lg transition-colors ${
                      currentPath.startsWith('/users')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    onClick={onClose}
                  >
                    <div className="flex items-center">
                      <FiUsers className="w-5 h-5" />
                      <span className="ml-3">User Management</span>
                    </div>
                  </Link>
                )}
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu; 