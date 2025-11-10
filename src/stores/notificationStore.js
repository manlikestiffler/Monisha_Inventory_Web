import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isEnabled: true,
      unsubscriber: null,
      
      // Setup real-time listener for notifications
      setupRealtimeListener: () => {
        const { unsubscriber } = get();
        
        // Clean up existing listener
        if (unsubscriber) {
          unsubscriber();
        }
        
        // Listen to notifications collection
        const notificationsQuery = query(
          collection(db, 'notifications'), 
          orderBy('createdAt', 'desc'), 
          limit(100)
        );
        
        const newUnsubscriber = onSnapshot(notificationsQuery, (snapshot) => {
          const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toDate?.() || new Date()
          }));
          
          // Calculate unread count
          const unreadCount = notifications.filter(n => !n.read).length;
          
          set({ notifications, unreadCount });
          
          console.log('🔔 Notifications updated:', { total: notifications.length, unread: unreadCount });
        }, (error) => {
          console.error('Error listening to notifications:', error);
        });
        
        set({ unsubscriber: newUnsubscriber });
      },
      
      // Cleanup listener
      cleanup: () => {
        const { unsubscriber } = get();
        if (unsubscriber) {
          unsubscriber();
          set({ unsubscriber: null });
        }
      },
      
      // Add a new notification to Firebase
      addNotification: async (notification, userInfo) => {
        try {
          const newNotification = {
            type: notification.type,
            title: notification.title,
            message: notification.message,
            category: notification.category || 'general',
            priority: notification.priority || 'medium',
            icon: notification.icon || '📋',
            read: false,
            userId: userInfo?.id || 'unknown',
            userName: userInfo?.name || userInfo?.fullName || 'Unknown User',
            userEmail: userInfo?.email || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await addDoc(collection(db, 'notifications'), newNotification);
          
          // Show browser notification if enabled
          if (get().isEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: notification.type
            });
          }
          
          console.log('✅ Notification added to Firebase:', newNotification);
        } catch (error) {
          console.error('Error adding notification:', error);
        }
      },
      
      // Mark notification as read in Firebase
      markAsRead: async (id) => {
        try {
          await updateDoc(doc(db, 'notifications', id), {
            read: true,
            updatedAt: serverTimestamp()
          });
          
          // Local state will be updated via real-time listener
          console.log('✅ Notification marked as read:', id);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      },
      
      // Mark all notifications as read
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(notif => ({ ...notif, read: true })),
          unreadCount: 0
        }));
      },
      
      // Remove notification from Firebase
      removeNotification: async (id) => {
        try {
          await deleteDoc(doc(db, 'notifications', id));
          console.log('✅ Notification deleted from Firebase:', id);
          // Local state will be updated via real-time listener
        } catch (error) {
          console.error('Error deleting notification:', error);
        }
      },
      
      // Clear all notifications from Firebase
      clearAll: async () => {
        try {
          const { notifications } = get();
          const deletePromises = notifications.map(notification => 
            deleteDoc(doc(db, 'notifications', notification.id))
          );
          await Promise.all(deletePromises);
          console.log('✅ All notifications cleared from Firebase');
          // Local state will be updated via real-time listener
        } catch (error) {
          console.error('Error clearing all notifications:', error);
        }
      },
      
      // Toggle notifications
      toggleNotifications: () => {
        set((state) => ({ isEnabled: !state.isEnabled }));
      },
      
      // Request permission for browser notifications
      requestPermission: async () => {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      },
      
      // Predefined notification creators
      createBatchNotification: (batchName, productCount) => {
        get().addNotification({
          type: 'batch_created',
          title: 'New Batch Created',
          message: `Batch "${batchName}" created with ${productCount} products`,
          category: 'inventory',
          priority: 'medium',
          icon: '📦'
        });
      },
      
      createProductNotification: (productName, type) => {
        get().addNotification({
          type: 'product_created',
          title: 'New Product Added',
          message: `${type} "${productName}" has been added to inventory`,
          category: 'inventory',
          priority: 'medium',
          icon: '👕'
        });
      },
      
      createStockUpdateNotification: (productName, variantType, sizesAdded) => {
        get().addNotification({
          type: 'stock_updated',
          title: 'Stock Updated',
          message: `${productName} (${variantType}) received ${sizesAdded} new items`,
          category: 'inventory',
          priority: 'low',
          icon: '📈'
        });
      },
      
      createSchoolNotification: (schoolName) => {
        get().addNotification({
          type: 'school_added',
          title: 'New School Added',
          message: `${schoolName} has been added to the system`,
          category: 'administration',
          priority: 'medium',
          icon: '🏫'
        });
      },
      
      createStudentNotification: (studentName, schoolName) => {
        get().addNotification({
          type: 'student_added',
          title: 'New Student Registered',
          message: `${studentName} has been registered at ${schoolName}`,
          category: 'administration',
          priority: 'low',
          icon: '👤'
        });
      },
      
      createLowStockNotification: (productName, currentStock) => {
        get().addNotification({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${productName} is running low (${currentStock} items remaining)`,
          category: 'alert',
          priority: 'high',
          icon: '⚠️'
        });
      },
      
      createOrderNotification: (orderNumber, customerName) => {
        get().addNotification({
          type: 'order_created',
          title: 'New Order Received',
          message: `Order #${orderNumber} from ${customerName}`,
          category: 'orders',
          priority: 'medium',
          icon: '🛍️'
        });
      }
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        isEnabled: state.isEnabled
      })
    }
  )
);

export default useNotificationStore;
