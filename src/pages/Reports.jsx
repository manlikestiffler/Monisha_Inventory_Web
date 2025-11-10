import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { useThemeDetector } from '../hooks/useThemeDetector';
import LoadingScreen from '../components/ui/LoadingScreen';
import SchoolSelect from '../components/SchoolSelect';
import { getChartColors, getCommonChartProps } from '../utils/chartColors';

const Reports = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [variantData, setVariantData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [ordersData, setOrdersData] = useState([]);
  const [batchesData, setBatchesData] = useState([]);
  const [schoolsData, setSchoolsData] = useState([]);
  const isDark = useThemeDetector();

  const categories = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'financials', name: 'Financials', icon: DollarSign },
    { id: 'schools', name: 'Schools', icon: Users }
  ];
  const years = [2022, 2023, 2024, 2025];

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch uniforms data
        const uniformsSnapshot = await getDocs(collection(db, 'uniforms'));
        let uniforms = uniformsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // Fetch orders data (mobile analytics functionality)
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const orders = ordersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setOrdersData(orders);

        // Fetch batches data
        const batchesSnapshot = await getDocs(collection(db, 'batchInventory'));
        const batches = batchesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setBatchesData(batches);

        // Fetch schools data
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schools = schoolsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setSchoolsData(schools);

        if (selectedSchool) {
          uniforms = uniforms.filter(item => item.school === selectedSchool);
        }

        const typeCount = uniforms.reduce((acc, item) => {
          const type = item.type || 'Uncategorized';
          let totalQuantity = 0;
          if (item.variants && item.variants.length > 0) {
            totalQuantity = item.variants.reduce((sum, variant) => {
              return sum + variant.sizes.reduce((s, size) => s + Number(size.quantity || 0), 0);
            }, 0);
          }
          acc[type] = (acc[type] || 0) + totalQuantity;
          return acc;
        }, {});

        const variantCount = uniforms.reduce((acc, item) => {
          if (item.variants) {
            item.variants.forEach(variant => {
              const variantName = `${item.name} (${variant.variant})`;
              const variantQuantity = variant.sizes.reduce((s, size) => s + Number(size.quantity || 0), 0);
              if (variantQuantity > 0) {
                acc[variantName] = (acc[variantName] || 0) + variantQuantity;
              }
            });
          }
          return acc;
        }, {});

        const typeChartData = Object.keys(typeCount)
          .map(key => ({ name: key, count: typeCount[key] }))
          .filter(item => item.count > 0);

        const variantChartData = Object.keys(variantCount)
          .map(key => ({ name: key, count: variantCount[key] }))
          .filter(item => item.count > 0);
        
        setInventoryData(typeChartData);
        setVariantData(variantChartData);

      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedSchool]);

  // Mobile analytics functions
  const getSalesData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    const salesByMonth = Array(6).fill(0);
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(monthNames[monthIndex]);
    }
    
    ordersData.forEach(order => {
      if (order.createdAt && order.totalAmount) {
        const orderDate = new Date(order.createdAt.seconds * 1000);
        const orderMonth = orderDate.getMonth();
        const monthsAgo = (currentMonth - orderMonth + 12) % 12;
        if (monthsAgo < 6) {
          const index = 5 - monthsAgo;
          salesByMonth[index] += order.totalAmount;
        }
      }
    });
    
    return last6Months.map((month, index) => ({
      name: month,
      revenue: salesByMonth[index]
    }));
  };

  const getOrderStatusData = () => {
    const completed = ordersData.filter(o => o.status === 'completed').length;
    const pending = ordersData.filter(o => o.status === 'pending').length;
    const processing = ordersData.filter(o => o.status === 'processing').length;
    const colors = getChartColors();
    
    return [
      { name: 'Completed', value: completed, fill: colors.success },
      { name: 'Pending', value: pending, fill: colors.warning },
      { name: 'Processing', value: processing, fill: colors.danger }
    ];
  };

  const getTotalRevenue = () => {
    return ordersData.reduce((total, order) => total + (order.totalAmount || 0), 0);
  };

  const getSizeDemandData = () => {
    const sizeData = {};
    
    batchesData.forEach(batch => {
      if (batch.items && Array.isArray(batch.items)) {
        batch.items.forEach(item => {
          if (item.sizes && Array.isArray(item.sizes)) {
            item.sizes.forEach(size => {
              const sizeKey = size.size;
              if (!sizeData[sizeKey]) {
                sizeData[sizeKey] = 0;
              }
              sizeData[sizeKey] += parseInt(size.quantity) || 0;
            });
          }
        });
      }
    });

    return Object.entries(sizeData)
      .sort(([a], [b]) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      })
      .slice(0, 8)
      .map(([size, quantity]) => ({ name: size, demand: quantity }));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-96">
          <LoadingScreen message="Generating Reports..." />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-96 text-red-500">
          <AlertTriangle className="w-12 h-12" />
          <p className="mt-4">{error}</p>
        </div>
      );
    }

    const noData = inventoryData.length === 0 && variantData.length === 0;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-6 space-y-4">
          <SchoolSelect onChange={setSelectedSchool} value={selectedSchool} />
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <IconComponent size={16} />
                  {category.name}
                </button>
              );
            })}
          </div>
          
          {/* Year Filter for certain categories */}
          {(selectedCategory === 'inventory' || selectedCategory === 'financials') && (
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Year:</span>
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedYear === year
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">£{getTotalRevenue().toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Orders</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{ordersData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Products</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{batchesData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{schoolsData.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Based on Selected Category */}
        {selectedCategory === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Trend */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Revenue Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSalesData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Line type="monotone" dataKey="revenue" stroke={getChartColors().primary} strokeWidth={3} dot={{ fill: getChartColors().primary }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Order Status Distribution */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Order Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getOrderStatusData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getOrderStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'inventory' && (
          <div className="space-y-8">
            {/* Inventory by Type */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Inventory by Type ({selectedYear})</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={inventoryData}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Bar dataKey="count" fill={getChartColors().primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Size Demand Pattern */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Size Demand Pattern</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getSizeDemandData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Bar dataKey="demand" fill={getChartColors().success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Variants */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Top Variants</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart layout="vertical" data={variantData.slice(0, 8)}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis type="number" {...getCommonChartProps().xAxis} />
                  <YAxis type="category" dataKey="name" {...getCommonChartProps().yAxis} width={150} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Bar dataKey="count" fill={getChartColors().success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'financials' && (
          <div className="space-y-8">
            {/* Revenue Trend */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Revenue Trend ({selectedYear})</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getSalesData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Line type="monotone" dataKey="revenue" stroke={getChartColors().primary} strokeWidth={3} dot={{ fill: getChartColors().primary }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'schools' && (
          <div className="space-y-8">
            {/* School Performance */}
            <motion.div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">School Performance</h2>
              <div className="space-y-4">
                {schoolsData.map((school, index) => {
                  const schoolOrders = ordersData.filter(o => o.schoolId === school.id);
                  const totalValue = schoolOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                  
                  return (
                    <div key={school.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{school.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {schoolOrders.length} orders • {school.studentCount || 0} students
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-gray-100">£{totalValue.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          £{school.studentCount ? (totalValue / school.studentCount).toFixed(2) : '0.00'}/student
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  };
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Analytics & Reports</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive business intelligence and inventory analytics.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key="inventory-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reports;