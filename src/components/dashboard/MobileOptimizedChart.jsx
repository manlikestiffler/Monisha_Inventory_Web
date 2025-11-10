import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCard from '../ui/AnimatedCard';

const MobileOptimizedChart = ({ children, title, description }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <AnimatedCard delay={0.2}>
      <motion.div
        className={`${
          isFullscreen 
            ? 'fixed inset-0 z-50 bg-white overflow-auto' 
            : 'relative'
        } transition-all duration-300`}
      >
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsFullscreen(false)}
            />
          )}
        </AnimatePresence>

        <div className={`${isFullscreen ? 'p-6' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
          <div className={`${isFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
            {children}
          </div>
        </div>
      </motion.div>
    </AnimatedCard>
  );
};

export default MobileOptimizedChart; 