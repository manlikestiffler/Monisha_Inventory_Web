import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, Settings, Trash2 } from 'lucide-react';
import useNotificationStore from '../stores/notificationStore';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  
  const {
    notifications,
    unreadCount,
    isEnabled,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    toggleNotifications,
    requestPermission
  } = useNotificationStore();

  useEffect(() => {
    // Request notification permission on mount
    requestPermission();
  }, [requestPermission]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.category === filter;
  });

  const getNotificationIcon = (type) => {
    const iconMap = {
      batch_created: '📦',
      product_created: '👕',
      stock_updated: '📈',
      school_added: '🏫',
      student_added: '👤',
      low_stock: '⚠️',
      order_created: '🛍️'
    };
    return iconMap[type] || '🔔';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {['all', 'unread', 'inventory', 'administration', 'alert'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        filter === tab
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="flex items-center space-x-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark all read</span>
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={notifications.length === 0}
                    className="flex items-center space-x-1 px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear all</span>
                  </button>
                </div>
                
                <button
                  onClick={toggleNotifications}
                  className={`flex items-center space-x-1 px-2 py-1 text-sm rounded-lg ${
                    isEnabled
                      ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      No notifications
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      {filter === 'unread' ? 'All caught up!' : 'You\'ll see notifications here when they arrive'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            <span className="text-2xl">
                              {getNotificationIcon(notification.type)}
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </p>
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                  {notification.priority?.toUpperCase()}
                                </span>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {formatTime(notification.timestamp)}
                              </span>
                              <div className="flex space-x-1">
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => removeNotification(notification.id)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
