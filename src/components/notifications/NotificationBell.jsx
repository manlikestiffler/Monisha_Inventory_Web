import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'react-feather';
import useNotificationStore from '../../stores/notificationStore';
import NotificationModal from './NotificationModal';

const NotificationBell = () => {
  const { unreadCount, setupRealtimeListener, cleanup } = useNotificationStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Setup real-time listener on mount
  useEffect(() => {
    setupRealtimeListener();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [setupRealtimeListener, cleanup]);

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleBellClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.button
        onClick={handleBellClick}
        className="relative p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isAnimating ? { 
          rotate: [0, -10, 10, -10, 10, 0],
          transition: { duration: 0.5, ease: "easeInOut" }
        } : {}}
      >
        <Bell 
          className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" 
          strokeWidth={1.5} 
        />
        
        {/* Notification Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse effect for new notifications */}
        {isAnimating && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-primary/20"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}
      </motion.button>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default NotificationBell;
