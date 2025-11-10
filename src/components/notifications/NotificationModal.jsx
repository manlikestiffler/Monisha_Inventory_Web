import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Trash2, Settings, Clock, User } from 'react-feather';
import useNotificationStore from '../../stores/notificationStore';

const NotificationModal = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll,
    isEnabled,
    toggleNotifications
  } = useNotificationStore();

  const [filter, setFilter] = useState('all'); // all, unread, read
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, inventory, orders, administration, alert

  // Filter notifications based on current filters
  const filteredNotifications = notifications.filter(notification => {
    const readFilter = filter === 'all' || 
                      (filter === 'unread' && !notification.read) ||
                      (filter === 'read' && notification.read);
    
    const catFilter = categoryFilter === 'all' || notification.category === categoryFilter;
    
    return readFilter && catFilter;
  });

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'inventory': return '📦';
      case 'orders': return '🛍️';
      case 'administration': return '🏫';
      case 'alert': return '⚠️';
      default: return '📋';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[70vh] flex flex-col sticky top-20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Bell className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Settings */}
              <button
                onClick={toggleNotifications}
                className={`p-2 rounded-xl transition-colors ${
                  isEnabled 
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                    : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                }`}
                title={isEnabled ? 'Disable notifications' : 'Enable notifications'}
              >
                <Settings className="w-4 h-4" strokeWidth={1.5} />
              </button>
              
              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-2 rounded-xl bg-green-50 text-green-600 ring-1 ring-green-200 hover:bg-green-100 transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
              
              {/* Clear all */}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-2 rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
              
              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex flex-wrap gap-2">
              {/* Read status filter */}
              <div className="flex gap-1">
                {['all', 'unread', 'read'].map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      filter === filterType
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                    {filterType === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Category filter */}
              <div className="flex gap-1">
                {['all', 'inventory', 'orders', 'administration', 'alert'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      categoryFilter === category
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {category === 'all' ? 'All' : getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" strokeWidth={1} />
                <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications to show.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-xl ${getPriorityColor(notification.priority)} flex-shrink-0`}>
                        <span className="text-lg">{notification.icon}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                            
                            {/* User and timestamp */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" strokeWidth={1.5} />
                                <span>{notification.userName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" strokeWidth={1.5} />
                                <span>{formatTimestamp(notification.timestamp)}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 ring-1 ring-green-200 hover:bg-green-100 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" strokeWidth={1.5} />
                              </button>
                            )}
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
                              title="Remove notification"
                            >
                              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
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
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationModal;
