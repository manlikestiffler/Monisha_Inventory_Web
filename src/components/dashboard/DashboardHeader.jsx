import { motion } from 'framer-motion';
import { useState } from 'react';
import Button from '../ui/Button';
import Select from '../ui/Select';

const DashboardHeader = ({ dateRange, onDateRangeChange }) => {
  const [isNotifying, setIsNotifying] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-indigo-600 to-indigo-800 -mx-6 px-6 py-8 text-white rounded-b-3xl shadow-xl"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-indigo-200 mt-1">Welcome back, Admin</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative">
            <Select
              value={dateRange}
              onChange={onDateRangeChange}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              className="bg-white/10 border-white/20 text-white w-48"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setIsNotifying(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifications
            </Button>
            
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200">Today's Orders</p>
              <h3 className="text-2xl font-bold mt-1">24</h3>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <svg className="w-4 h-4 text-green-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-green-400">+12.5%</span>
            <span className="text-indigo-200 ml-2">from yesterday</span>
          </div>
        </motion.div>

        {/* Add more quick stats... */}
      </div>
    </motion.div>
  );
};

export default DashboardHeader; 