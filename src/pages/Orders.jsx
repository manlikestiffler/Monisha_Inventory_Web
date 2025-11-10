import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, Clock, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

const Orders = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="relative">
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
                className="w-32 h-32 mx-auto"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-red-500 to-indigo-600 p-1">
                  <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center">
                    <Package className="w-16 h-16 text-red-500 dark:text-red-400" />
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                animate={{ 
                  rotate: [0, 360],
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-8 h-8 rounded-full bg-red-500 dark:bg-red-400 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Orders Coming Soon
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10"
          >
            We're working hard to bring you a seamless order management experience. 
            This feature will be available soon with comprehensive tracking and management capabilities.
          </motion.p>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Orders;