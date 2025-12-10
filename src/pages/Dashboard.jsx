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
import { getAggregatedAllocationData } from '../utils/allocationTracker';
import { Warehouse } from 'lucide-react';

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
    totalOrders: 0,
    warehouseStock: 0,
    allocationRate: 0
  });
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
        await Promise.all([
          fetchProducts(),
          fetchSchools(),
          fetchOrders(),
          fetchBatches()
        ]);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [products, schools, orders, batches]);

  const calculateStats = () => {
    // Total Inventory: From Products page (Uniforms + Variants)
    const totalInventory = products.reduce((sum, product) => {
      let productQuantity = 0;
      if (product.variants?.length > 0) {
        productQuantity = product.variants.reduce((vSum, variant) => {
          return vSum + (variant.sizes?.reduce((sSum, size) => sSum + (parseInt(size.quantity) || 0), 0) || 0);
        }, 0);
      } else if (product.sizes) {
        productQuantity = product.sizes.reduce((sSum, size) => sSum + (parseInt(size.quantity) || 0), 0);
      }
      return sum + productQuantity;
    }, 0);

    // Warehouse Stock: From Batches page
    const warehouseStock = batches.reduce((sum, batch) => {
      const batchQuantity = batch.items?.reduce((itemSum, item) => {
        return itemSum + (item.sizes?.reduce((sizeSum, size) => sizeSum + (parseInt(size.quantity) || 0), 0) || 0);
      }, 0) || 0;
      return sum + batchQuantity;
    }, 0);

    const activeSchools = schools.filter(school => school.status === 'active').length;
    const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;

    // Use aggregated data for rates if needed, else raw calc
    const allocationData = getAggregatedAllocationData(batches);
    const allocationRate = parseFloat(allocationData.allocationRate) || 0;

    setStats({
      totalInventory, // Products
      activeSchools,
      totalRevenue,
      totalOrders,
      warehouseStock, // Batches
      allocationRate
    });
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
        className="relative z-10 max-w-[1800px] mx-auto space-y-8"
      >
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <QuickStat
            title="Total Inventory (Products)"
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
          <QuickStat
            title="Warehouse Stock (Batches)"
            value={loading ? "Loading..." : `${stats.warehouseStock.toLocaleString()} pcs`}
            icon={Warehouse}
            color="orange"
            link="/batches"
          />
        </div>

        {/* Sections for Analytics */}

        {/* Size Analytics Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5" /> Size Analytics
          </h2>
          <div className={`${cardStyles}`}>
            <DynamicCharts
              products={products}
              orders={orders}
              schools={schools}
              batches={batches}
              loading={loading}
              section="size"
            />
          </div>
        </div>

        {/* Financials Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Financial Overview
          </h2>
          <div className={`${cardStyles}`}>
            <DynamicCharts
              products={products}
              orders={orders}
              schools={schools}
              batches={batches}
              loading={loading}
              section="financial"
            />
          </div>
        </div>

        {/* Schools Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Book className="w-5 h-5" /> School Performance
          </h2>
          <div className={`${cardStyles}`}>
            <DynamicCharts
              products={products}
              orders={orders}
              schools={schools}
              batches={batches}
              loading={loading}
              section="school"
            />
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Dashboard;