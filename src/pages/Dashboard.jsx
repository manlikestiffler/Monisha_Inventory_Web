import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Book, DollarSign, ShoppingCart, ArrowRight } from 'react-feather';
import { useAuthStore } from '../stores/authStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useSchoolStore } from '../stores/schoolStore';
import { useOrderStore } from '../stores/orderStore';
import { useBatchStore } from '../stores/batchStore';
import DynamicCharts from '../components/dashboard/DynamicCharts';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const cardStyles = "bg-card rounded-2xl shadow-sm border border-border p-6 relative overflow-hidden group";
const cardHover = "hover:shadow-lg transition-shadow duration-300";
const statTitle = "text-sm font-medium text-muted-foreground mb-1";
const statValue = "text-2xl font-bold text-foreground";

const QuickStat = ({ title, value, icon: Icon, color, link }) => {
  return (
    <motion.div
      variants={itemVariants}
      className={`${cardStyles} ${cardHover} relative overflow-hidden group`}
    >
      <Link to={link} className="flex flex-col h-full">
        <div className="flex-grow relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3.5 rounded-2xl bg-${color}-500/10 ring-1 ring-${color}-500/20`}>
              <Icon className={`w-6 h-6 text-${color}-500`} strokeWidth={1.5} />
            </div>
            <ArrowRight 
              className={`w-5 h-5 text-${color}-500/50 group-hover:text-${color}-500 group-hover:translate-x-1 transition-all duration-300`}
              strokeWidth={1.5}
            />
          </div>
          <p className={statTitle}>{title}</p>
          <motion.p
            className={statValue}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {value}
          </motion.p>
        </div>
      </Link>
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-${color}-500/10 blur-2xl group-hover:scale-150 transition-transform duration-700`} />
      <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full bg-${color}-500/5 blur-2xl group-hover:scale-150 transition-transform duration-700`} />
    </motion.div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalInventory: 0,
    activeSchools: 0,
    totalRevenue: 0,
    totalOrders: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const { products, fetchProducts } = useInventoryStore();
  const { schools, fetchSchools } = useSchoolStore();
  const { orders, fetchOrders } = useOrderStore();
  const { batches, fetchBatches } = useBatchStore();
  const { userProfile } = useAuthStore();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch all required data
        await Promise.all([
          fetchProducts(),
          fetchSchools(),
          fetchOrders(),
          fetchBatches()
        ]);
        
        // Fetch recent activity
        await fetchRecentActivity();
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Calculate statistics once data is loaded
    calculateStats();
  }, [products, schools, orders, batches]);

  const fetchRecentActivity = async () => {
    try {
      // Create an array to store all activity
      let allActivity = [];
      
      // Fetch recent orders
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(3));
      const ordersSnapshot = await getDocs(ordersQuery);
      const recentOrders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'order',
        title: 'New order received',
        timestamp: doc.data().createdAt?.toDate() || new Date(),
        icon: 'ShoppingCart',
        iconColor: 'accent'
      }));
      allActivity = [...allActivity, ...recentOrders];
      
      // Fetch recent batches
      const batchesQuery = query(collection(db, 'batchInventory'), orderBy('createdAt', 'desc'), limit(3));
      const batchesSnapshot = await getDocs(batchesQuery);
      const recentBatches = batchesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'batch',
        title: 'New inventory added',
        timestamp: doc.data().createdAt?.toDate() || new Date(),
        icon: 'Package',
        iconColor: 'primary'
      }));
      allActivity = [...allActivity, ...recentBatches];
      
      // Fetch recent schools
      const schoolsQuery = query(collection(db, 'schools'), orderBy('createdAt', 'desc'), limit(3));
      const schoolsSnapshot = await getDocs(schoolsQuery);
      const recentSchools = schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'school',
        title: 'New school registered',
        timestamp: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
        icon: 'Book',
        iconColor: 'secondary'
      }));
      allActivity = [...allActivity, ...recentSchools];
      
      // Sort by timestamp (newest first) and take the 5 most recent
      allActivity.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivity(allActivity.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const calculateStats = () => {
    // Calculate total inventory from batches
    const totalInventory = batches.reduce((sum, batch) => {
      // Sum up quantities from all items in the batch
      const batchQuantity = batch.items?.reduce((itemSum, item) => {
        return itemSum + (item.sizes?.reduce((sizeSum, size) => sizeSum + (size.quantity || 0), 0) || 0);
      }, 0) || 0;
      return sum + batchQuantity;
    }, 0);

    // Count active schools
    const activeSchools = schools.filter(school => school.status === 'active').length;

    // Calculate total revenue from orders
    const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

    // Count total orders
    const totalOrders = orders.length;

    setStats({
      totalInventory,
      activeSchools,
      totalRevenue,
      totalOrders
    });
  };

  // Function to format time ago
  const timeAgo = (date) => {
    if (!date) return 'Unknown time';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + (interval === 1 ? ' year ago' : ' years ago');
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + (interval === 1 ? ' month ago' : ' months ago');
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + (interval === 1 ? ' day ago' : ' days ago');
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + (interval === 1 ? ' hour ago' : ' hours ago');
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + (interval === 1 ? ' minute ago' : ' minutes ago');
    
    return Math.floor(seconds) + (Math.floor(seconds) === 1 ? ' second ago' : ' seconds ago');
  };

  // Render activity icon based on type
  const renderActivityIcon = (activity) => {
    switch (activity.icon) {
      case 'Package':
        return <Package className={`w-5 h-5 text-${activity.iconColor}`} strokeWidth={1.5} />;
      case 'Book':
        return <Book className={`w-5 h-5 text-${activity.iconColor}`} strokeWidth={1.5} />;
      case 'ShoppingCart':
        return <ShoppingCart className={`w-5 h-5 text-${activity.iconColor}`} strokeWidth={1.5} />;
      default:
        return <Package className={`w-5 h-5 text-${activity.iconColor}`} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-background">
      {/* Aurora Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50 dark:opacity-30">
          <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-indigo-500 dark:via-gray-700 to-transparent"></div>
          <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500 dark:via-gray-700 to-transparent"></div>
          <div className="absolute bottom-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-indigo-500 dark:via-gray-700 to-transparent"></div>
          <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-indigo-500 dark:via-gray-700 to-transparent"></div>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 max-w-[1800px] mx-auto space-y-6"
      >
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickStat
            title="Total Inventory"
            value={loading ? "Loading..." : stats.totalInventory}
            icon={Package}
            color="blue"
            link="/inventory"
          />
          <QuickStat
            title="Active Schools"
            value={loading ? "Loading..." : stats.activeSchools}
            icon={Book}
            color="purple"
            link="/schools"
          />
          <QuickStat
            title="Total Revenue"
            value={loading ? "Loading..." : `$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="emerald"
            link="/reports"
          />
          <QuickStat
            title="Total Orders"
            value={loading ? "Loading..." : stats.totalOrders}
            icon={ShoppingCart}
            color="amber"
            link="/orders"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Size Distribution Charts */}
          <motion.div
            variants={itemVariants}
            className={`${cardStyles} lg:col-span-3 relative overflow-hidden`}
          >
            <div className="relative z-10">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-foreground">
                <Package className="text-primary" strokeWidth={1.5} />
                Analytics Hub
              </h2>
              <DynamicCharts 
                products={products}
                orders={orders}
                schools={schools}
                batches={batches}
                loading={loading}
              />
            </div>
          </motion.div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <motion.div
              variants={itemVariants}
              className={`${cardStyles} ${cardHover} relative overflow-hidden`}
            >
              <div className="relative z-10">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-foreground">
                  <Package className="text-primary" strokeWidth={1.5} />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={`${activity.type}-${activity.id}-${index}`} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-${activity.iconColor}/10 flex items-center justify-center`}>
                          {renderActivityIcon(activity)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity found
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;