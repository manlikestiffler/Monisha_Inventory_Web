import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

const LoadingScreen = ({ message = "Loading", description = "Please wait while we fetch your data" }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Outer ring with gradient */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-500 to-indigo-600 p-1">
          <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center">
            {/* Spinning inner ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-t-red-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full"
            />
          </div>
        </div>

        {/* Centered icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Package className="w-10 h-10 text-red-500 dark:text-red-400" />
        </motion.div>
      </motion.div>
      
      {/* Text content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {message}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </motion.div>

      {/* Animated dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex gap-2 mt-4"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"
          />
        ))}
      </motion.div>
    </div>
  );
};

export default LoadingScreen; 